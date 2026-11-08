
const assert = require('node:assert/strict')

const BASE_URL = 'http://localhost:5000/api'

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
        // Crear un espacio exclusivo para la prueba
        const space = await request('/spaces', 'POST', {
            name: 'Sala de concurrencia',
            location: 'Laboratorio',
            capacity: 4
        })

        assert.equal(space.status, 201)
        spaceId = space.data.id

        // Dos solicitudes simultáneas
        const [userA, userB] = await Promise.all([
            request('/reservations', 'POST', {
                userId: 'userA',
                spaceId
            }),
            request('/reservations', 'POST', {
                userId: 'userB',
                spaceId
            })
        ])

        const statuses = [userA.status, userB.status].sort()

        assert.deepEqual(statuses, [201, 409])

        const winner = userA.status === 201 ? userA : userB
        reservationId = winner.data.reservation.id

        console.log('PASS: Solo una reservación fue creada')
        console.log('Usuario A:', userA.status)
        console.log('Usuario B:', userB.status)
        console.log('PASS: Redis evitó reservaciones concurrentes')

    } catch (error) {
        console.error('FAIL:', error.message)
        process.exitCode = 1
    } finally {
        // Liberar el espacio de prueba
        if (reservationId) {
            try {
                await request(
                    `/reservations/${reservationId}`,
                    'DELETE'
                )
            } catch (error) {
                console.error('Error al limpiar reservación:', error.message)
            }
        }

        if (spaceId) {
            try {
                await request(`/spaces/${spaceId}`, 'DELETE')
            } catch (error) {
                console.error('Error al limpiar espacio:', error.message)
            }
        }
    }
}

runTest()
