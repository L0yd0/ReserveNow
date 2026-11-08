const express = require('express')
const router = express.Router()

const {
    createNewReservation,
    confirmExistingReservation,
    getReservation,
    cancelExistingReservation,
    listReservations
} = require('../controllers/reservationControllers')

router.post('/', createNewReservation)
router.put('/:id/confirm', confirmExistingReservation)
router.get('/:id', getReservation)
router.delete('/:id', cancelExistingReservation)
router.get('/', listReservations)

module.exports = router