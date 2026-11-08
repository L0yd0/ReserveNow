const express = require('express')
const router = express.Router()

const {
    createNewSpace,
    getSpaces,
    getSpace,
    updateExistingSpace,
    deleteExistingSpace
} = require('../controllers/spaceControllers')

router.post('/', createNewSpace)
router.get('/', getSpaces)
router.get('/:id', getSpace)
router.put('/:id', updateExistingSpace)
router.delete('/:id', deleteExistingSpace)

module.exports = router