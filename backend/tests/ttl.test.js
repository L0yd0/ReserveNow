
const assert = require('node:assert/strict')
const { createClient } = require('redis')
require('dotenv').config()

const BASE_URL = 'http://localhost:5000/api'

const client = createClient({
    username: process.env.REDIS_USERNAME,
    password: process.env.REDIS_PASSWORD,
    socket: {
        host: process.env.REDIS_HOST,
        port: Number(process.env.REDIS_PORT)
    }
})

client.on('error', err => {
    console.error('Redis:', err.message)
})

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))

async function request(path, method, body) {
    const response = await fetch(`${BASE_URL}${path}`, {
        method,
        headers: { 'Content-Type': 'application/json' },
        ...(body ? { body: JSON.stringify(body) } : {})
    })

    return {
        status: response.status,
        data: await response.json()
    }
}

async function runTest() {
    let spaceId
    let reservationId

    try {
        await client.connect()

        const space = await request('/spaces', 'POST', {
            name: 'Sala TTL Test',
            location: 'Laboratorio',
            capacity: 2
        })

        assert.equal(space.status, 201)
        spaceId = space.data.id

        const reservation = await request('/reservations', 'POST', {
            userId: 'ttl-user',
            spaceId
        })

        assert.equal(reservation.status, 201)
        reservationId = reservation.data.reservation.id

        const lockKey = `lock:space:${spaceId}`
        const reservationKey = `reservation:${reservationId}`

        // Reducir el TTL de ambas claves a 5 segundos
        await client.expire(lockKey, 5)
        await client.expire(reservationKey, 5)

        console.log('TTL reducido a 5 segundos')

        await sleep(6500)

        // Comprobar expiración
        assert.equal(await client.exists(lockKey), 0)
        assert.equal(await client.exists(reservationKey), 0)

        console.log('PASS: Redis eliminó ambas claves')

        // Verificar que el espacio puede reservarse otra vez
        const newReservation = await request('/reservations', 'POST', {
            userId: 'new-user',
            spaceId
        })

        assert.equal(newReservation.status, 201)

        console.log('PASS: El espacio volvió a estar disponible')

        // Cancelar la nueva reservación
        const newId = newReservation.data.reservation.id
        const cancelled = await request(
            `/reservations/${newId}`,
            'DELETE'
        )

        assert.equal(cancelled.status, 200)

        console.log('PASS: Limpieza de reservación')

        console.log('\nPrueba TTL completada correctamente.')

    } catch (error) {
        console.error('FAIL:', error.message)
        process.exitCode = 1
    } finally {
        if (spaceId) {
            try {
                const deleted = await request(
                    `/spaces/${spaceId}`,
                    'DELETE'
                )

                if (deleted.status !== 200) {
                    console.error('No se pudo eliminar el espacio de prueba')
                }
            } catch (error) {
                console.error('Error de limpieza:', error.message)
            }
        }

        if (client.isOpen) {
            await client.quit()
        }
    }
}

runTest()
