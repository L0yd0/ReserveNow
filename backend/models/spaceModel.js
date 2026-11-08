const redisClient = require('../config/redis')

const createSpace = async (space) => {
    const key = `space:${space.id}`

    await redisClient.hSet(key, {
        id: space.id,
        name: space.name,
        location: space.location,
        capacity: String(space.capacity),
        status: 'available'
    })

    // Índice para consultar todos los espacios
    await redisClient.sAdd('spaces:all', space.id)

    return await redisClient.hGetAll(key)
}

const getSpaceById = async (id) => {
    return await redisClient.hGetAll(`space:${id}`)
}

const getAllSpaces = async () => {
    const ids = await redisClient.sMembers('spaces:all')

    if (ids.length === 0) return []

    const spaces = await Promise.all(
        ids.map(id => getSpaceById(id))
    )

    return spaces.filter(space => Object.keys(space).length > 0)
}
const updateSpace = async (id, data) => {
    const key = `space:${id}`

    const exists = await redisClient.exists(key)
    if (!exists) return null

    await redisClient.hSet(key, data)

    return await redisClient.hGetAll(key)
}

const deleteSpace = async (id) => {
    const result = await redisClient.eval(
        `
        -- Verificar que exista el espacio
        if redis.call('EXISTS', KEYS[1]) == 0 then
            return -1
        end

        -- Verificar reservaciones activas
        if redis.call('EXISTS', KEYS[2]) == 1
            or redis.call('EXISTS', KEYS[3]) == 1 then
            return -2
        end

        -- Eliminar espacio y actualizar índice
        redis.call('DEL', KEYS[1])
        redis.call('SREM', KEYS[4], ARGV[1])

        return 1
        `,
        {
            keys: [
                `space:${id}`,
                `lock:space:${id}`,
                `confirmed:space:${id}`,
                'spaces:all'
            ],
            arguments: [id]
        }
    )

    return result
}

module.exports = {
    createSpace,
    getSpaceById,
    getAllSpaces,
    updateSpace,
    deleteSpace
}