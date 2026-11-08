const asyncHandler = require('express-async-handler')

const {
    createReservation,
    confirmReservation,
    getReservations,
    getReservationById,
    cancelReservation
} = require('../models/reservationModel')

// Crear una reservación temporal
const createNewReservation = asyncHandler(async (req, res) => {
    const { userId, spaceId } = req.body

    // Validar campos obligatorios
    if (
        typeof userId !== 'string' ||
        !userId.trim() ||
        typeof spaceId !== 'string' ||
        !spaceId.trim()
    ) {
        return res.status(400).json({
            message: 'userId y spaceId son obligatorios'
        })
    }

    // Solicitar la reservación al modelo
    const result = await createReservation({
        userId: userId.trim(),
        spaceId: spaceId.trim()
    })

    if (!result.success) {
        const statusCode = result.statusCode || 409

        return res.status(statusCode).json({
            message: result.message
        })
    }

    res.status(201).json({
        message: 'Reservación temporal creada correctamente',
        reservation: result.reservation,
        expiresIn: 600
    })
})
const confirmExistingReservation = asyncHandler(async (req, res) => {
    const { id } = req.params

    const result = await confirmReservation(id)

    if (!result.success) {
        return res.status(result.statusCode).json({
            message: result.message
        })
    }

    res.status(200).json({
        message: 'Reservación confirmada correctamente',
        reservation: result.reservation
    })
})
const getReservation = asyncHandler(async (req, res) => {
    const reservation = await getReservationById(req.params.id)

    if (!reservation) {
        return res.status(404).json({
            message: 'Reservación no encontrada'
        })
    }

    res.status(200).json(reservation)
})
const cancelExistingReservation = asyncHandler(async (req, res) => {
    const result = await cancelReservation(req.params.id)

    if (!result.success) {
        return res.status(result.statusCode).json({
            message: result.message
        })
    }

    res.status(200).json({
        message: 'Reservación cancelada correctamente',
        reservation: result.reservation
    })
})
const listReservations = asyncHandler(async (req, res) => {
    const { userId, spaceId, status } = req.query

    const validStatuses = ['pending', 'confirmed', 'cancelled']

    if (status && !validStatuses.includes(status)) {
        return res.status(400).json({
            message: 'Estado de reservación inválido'
        })
    }

    const reservations = await getReservations({
        userId,
        spaceId,
        status
    })

    res.status(200).json({
        total: reservations.length,
        reservations
    })
})

module.exports = {
    createNewReservation,
    confirmExistingReservation,
    getReservation,
    cancelExistingReservation,
    listReservations
}