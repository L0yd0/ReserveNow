const redisClient = require('../config/redis')
const { randomUUID } = require('crypto')

const createReservation = async ({ userId, spaceId }) => {
    const reservationId = randomUUID()

    const spaceKey = `space:${spaceId}`
    const lockKey = `lock:space:${spaceId}`
    const confirmedKey = `confirmed:space:${spaceId}`
    const reservationKey = `reservation:${reservationId}`

    const result = await redisClient.eval(
        `
        -- Verificar que el espacio exista
        if redis.call('EXISTS', KEYS[1]) == 0 then
            return -1
        end

        -- Verificar que no tenga una reservación confirmada
        if redis.call('EXISTS', KEYS[2]) == 1 then
            return -2
        end

        -- Verificar que no tenga un bloqueo temporal
        if redis.call('EXISTS', KEYS[3]) == 1 then
            return -3
        end

        -- Crear la reservación temporal
        redis.call(
            'HSET',
            KEYS[4],
            'id', ARGV[1],
            'userId', ARGV[2],
            'spaceId', ARGV[3],
            'status', 'pending',
            'createdAt', ARGV[4]
        )

        -- Crear bloqueo temporal de 10 minutos
        redis.call('SET', KEYS[3], ARGV[1], 'EX', 600)

        -- Aplicar TTL a la reservación
        redis.call('EXPIRE', KEYS[4], 600)
        redis.call('SADD', 'reservations:all', ARGV[1])

        return 1
        `,
        {
            keys: [
                spaceKey,
                confirmedKey,
                lockKey,
                reservationKey
            ],
            arguments: [
                reservationId,
                userId,
                spaceId,
                new Date().toISOString()
            ]
        }
    )

    if (result !== 1) {
        const errors = {
            '-1': 'El espacio no existe',
            '-2': 'El espacio ya tiene una reservación confirmada',
            '-3': 'El espacio ya tiene una reservación pendiente'
        }

        return {
            success: false,
            statusCode: result === -1 ? 404 : 409,
            message: errors[String(result)] || 'No se pudo crear la reservación'
        }
    }

    return {
        success: true,
        reservation: await redisClient.hGetAll(reservationKey)
    }
}

const confirmReservation = async (reservationId) => {
    const reservationKey = `reservation:${reservationId}`

    const reservation = await redisClient.hGetAll(reservationKey)

    if (Object.keys(reservation).length === 0) {
        return {
            success: false,
            statusCode: 404,
            message: 'Reservación no encontrada o expirada'
        }
    }

    const lockKey = `lock:space:${reservation.spaceId}`
    const confirmedKey = `confirmed:space:${reservation.spaceId}`

    const result = await redisClient.eval(
        `
        -- Comprobar que la reservación todavía existe
        if redis.call('EXISTS', KEYS[2]) == 0 then
            return -1
        end

        -- Comprobar su estado
        if redis.call('HGET', KEYS[2], 'status') ~= 'pending' then
            return -2
        end

        -- Comprobar que el bloqueo pertenece a esta reservación
        if redis.call('GET', KEYS[1]) ~= ARGV[1] then
            return -3
        end

        -- Impedir confirmar un espacio ocupado
        if redis.call('EXISTS', KEYS[3]) == 1 then
            return -4
        end

        -- Confirmar y eliminar el TTL
        redis.call('HSET', KEYS[2], 'status', 'confirmed')
        redis.call('PERSIST', KEYS[2])

        -- Registrar ocupación permanente
        redis.call('SET', KEYS[3], ARGV[1])

        -- Liberar bloqueo temporal
        redis.call('DEL', KEYS[1])

        return 1
        `,
        {
            keys: [lockKey, reservationKey, confirmedKey],
            arguments: [reservationId]
        }
    )

    if (result !== 1) {
        const errors = {
            '-1': 'Reservación no encontrada o expirada',
            '-2': 'La reservación ya fue procesada',
            '-3': 'El bloqueo temporal expiró',
            '-4': 'El espacio ya está reservado'
        }

        return {
            success: false,
            statusCode: result === -1 ? 404 : 409,
            message: errors[String(result)]
        }
    }

    return {
        success: true,
        reservation: await redisClient.hGetAll(reservationKey)
    }
}
const getReservationById = async (id) => {
    const reservation = await redisClient.hGetAll(`reservation:${id}`)

    if (Object.keys(reservation).length === 0) {
        return null
    }

    return reservation
}
const cancelReservation = async (reservationId) => {
    const reservationKey = `reservation:${reservationId}`

    // Obtener la reservación para identificar el espacio
    const reservation = await redisClient.hGetAll(reservationKey)

    if (Object.keys(reservation).length === 0) {
        return {
            success: false,
            statusCode: 404,
            message: 'Reservación no encontrada o expirada'
        }
    }

    const lockKey = `lock:space:${reservation.spaceId}`
    const confirmedKey = `confirmed:space:${reservation.spaceId}`

    // Cancelación atómica mediante Lua
    const result = await redisClient.eval(
        `
        local status = redis.call('HGET', KEYS[1], 'status')

        if not status then
            return 0
        end

        if status == 'cancelled' then
            return -1
        end

        if status == 'pending' then
            if redis.call('GET', KEYS[2]) ~= ARGV[1] then
                return -2
            end

            redis.call('DEL', KEYS[2])
        elseif status == 'confirmed' then
            if redis.call('GET', KEYS[3]) ~= ARGV[1] then
                return -2
            end

            redis.call('DEL', KEYS[3])
        else
            return -1
        end

        redis.call('HSET', KEYS[1],
            'status', 'cancelled',
            'cancelledAt', ARGV[2]
        )

        redis.call('PERSIST', KEYS[1])

        return 1
        `,
        {
            keys: [reservationKey, lockKey, confirmedKey],
            arguments: [
                reservationId,
                new Date().toISOString()
            ]
        }
    )

    if (result !== 1) {
        const messages = {
            '0': 'Reservación no encontrada',
            '-1': 'La reservación ya fue cancelada o procesada',
            '-2': 'La reservación ya no tiene un bloqueo válido'
        }

        return {
            success: false,
            statusCode: result === 0 ? 404 : 409,
            message: messages[String(result)]
        }
    }

    return {
        success: true,
        reservation: await redisClient.hGetAll(reservationKey)
    }
}
const getReservations = async ({ userId, spaceId, status } = {}) => {
    const ids = await redisClient.sMembers('reservations:all')

    if (ids.length === 0) return []

    const reservations = await Promise.all(
        ids.map(async (id) => ({
            id,
            data: await redisClient.hGetAll(`reservation:${id}`)
        }))
    )

    const expiredIds = reservations
        .filter(item => Object.keys(item.data).length === 0)
        .map(item => item.id)

    // Eliminar identificadores de reservaciones expiradas
    if (expiredIds.length > 0) {
        await redisClient.sRem('reservations:all', expiredIds)
    }

    return reservations
        .filter(item => Object.keys(item.data).length > 0)
        .map(item => item.data)
        .filter(reservation => {
            if (userId && reservation.userId !== userId) return false
            if (spaceId && reservation.spaceId !== spaceId) return false
            if (status && reservation.status !== status) return false

            return true
        })
}

module.exports = {
    createReservation,
    confirmReservation,
    getReservationById,
    cancelReservation,
    getReservations
}