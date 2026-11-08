
const assert = require('node:assert/strict')

const BASE_URL = 'http://localhost:5000/api'

async function request(path, method = 'GET', body) {
    const response = await fetch(`${BASE_URL}${path}`, {
        method,
        headers: { 'Content-Type': 'application/json' },
        ...(body ? { body: JSON.stringify(body) } : {})
    })

    const data = await response.json()
    return { status: response.status, data }
}

async function runTests() {
    let spaceId
    let reservationId

    try {
        // 1. Crear espacio
        const space = await request('/spaces', 'POST', {
            name: 'Sala de pruebas',
            location: 'Laboratorio',
            capacity: 5
        })

        assert.equal(space.status, 201)
        spaceId = space.data.id
        console.log('PASS: Crear espacio')

        // 2. Crear reservación temporal
        const reservation = await request('/reservations', 'POST', {
            userId: 'test-user',
            spaceId
        })

        assert.equal(reservation.status, 201)
        assert.equal(reservation.data.reservation.status, 'pending')

        reservationId = reservation.data.reservation.id
        console.log('PASS: Crear reservación temporal')

        // 3. Impedir duplicados pendientes
        const duplicate = await request('/reservations', 'POST', {
            userId: 'another-user',
            spaceId
        })

        assert.equal(duplicate.status, 409)
        console.log('PASS: Bloquear duplicados')

        // 4. Confirmar reservación
        const confirmed = await request(
            `/reservations/${reservationId}/confirm`,
            'PUT'
        )

        assert.equal(confirmed.status, 200)
        assert.equal(confirmed.data.reservation.status, 'confirmed')
        console.log('PASS: Confirmar reservación')

        // 5. Impedir duplicados confirmados
        const occupied = await request('/reservations', 'POST', {
            userId: 'another-user',
            spaceId
        })

        assert.equal(occupied.status, 409)
        console.log('PASS: Bloquear espacio confirmado')

        // 6. Impedir eliminar un espacio ocupado
        const protectedSpace = await request(
            `/spaces/${spaceId}`,
            'DELETE'
        )

        assert.equal(protectedSpace.status, 409)
        console.log('PASS: Proteger espacio ocupado')

        // 7. Consultar por estado
        const list = await request('/reservations?status=confirmed')

        assert.equal(list.status, 200)
        assert.ok(
            list.data.reservations.some(r => r.id === reservationId)
        )
        console.log('PASS: Consultar reservaciones confirmadas')

        // 8. Cancelar reservación
        const cancelled = await request(
            `/reservations/${reservationId}`,
            'DELETE'
        )

        assert.equal(cancelled.status, 200)
        assert.equal(cancelled.data.reservation.status, 'cancelled')
        console.log('PASS: Cancelar reservación')

        // 9. Eliminar espacio liberado
        const deleted = await request(`/spaces/${spaceId}`, 'DELETE')

        assert.equal(deleted.status, 200)
        console.log('PASS: Eliminar espacio liberado')

        console.log('\nTodas las pruebas pasaron correctamente.')
    } catch (error) {
        console.error('\nFAIL:', error.message)
        process.exitCode = 1
    }
}

runTests()
