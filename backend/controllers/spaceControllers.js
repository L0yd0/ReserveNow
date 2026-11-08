const asyncHandler = require('express-async-handler')
const { randomUUID } = require('crypto')

const {
    createSpace,
    getSpaceById,
    getAllSpaces,
    updateSpace,
    deleteSpace
} = require('../models/spaceModel')

// Crear espacio
const createNewSpace = asyncHandler(async (req, res) => {
    const { name, location, capacity } = req.body

    if (!name || !location || !capacity || Number(capacity) <= 0) {
        return res.status(400).json({
            message: 'Nombre, ubicación y capacidad válida son obligatorios'
        })
    }

    const space = await createSpace({
        id: randomUUID(),
        name,
        location,
        capacity: Number(capacity)
    })

    res.status(201).json(space)
})

// Obtener todos los espacios
const getSpaces = asyncHandler(async (req, res) => {
    const spaces = await getAllSpaces()
    res.status(200).json(spaces)
})

// Obtener un espacio por ID
const getSpace = asyncHandler(async (req, res) => {
    const space = await getSpaceById(req.params.id)

    if (!space || Object.keys(space).length === 0) {
        return res.status(404).json({
            message: 'Espacio no encontrado'
        })
    }

    res.status(200).json(space)
})
const updateExistingSpace = asyncHandler(async (req, res) => {
    const { name, location, capacity } = req.body
    const data = {}

    if (name !== undefined) {
        if (typeof name !== 'string' || !name.trim()) {
            return res.status(400).json({ message: 'Nombre inválido' })
        }
        data.name = name.trim()
    }

    if (location !== undefined) {
        if (typeof location !== 'string' || !location.trim()) {
            return res.status(400).json({ message: 'Ubicación inválida' })
        }
        data.location = location.trim()
    }

    if (capacity !== undefined) {
        if (!Number.isInteger(capacity) || capacity <= 0) {
            return res.status(400).json({ message: 'Capacidad inválida' })
        }
        data.capacity = String(capacity)
    }

    if (Object.keys(data).length === 0) {
        return res.status(400).json({ message: 'No hay campos válidos para actualizar' })
    }

    const space = await updateSpace(req.params.id, data)

    if (!space) {
        return res.status(404).json({ message: 'Espacio no encontrado' })
    }

    res.status(200).json(space)
})

const deleteExistingSpace = asyncHandler(async (req, res) => {
    const result = await deleteSpace(req.params.id)

    if (result === -1) {
        return res.status(404).json({
            message: 'Espacio no encontrado'
        })
    }

    if (result === -2) {
        return res.status(409).json({
            message: 'No se puede eliminar un espacio con reservaciones activas'
        })
    }

    res.status(200).json({
        message: 'Espacio eliminado correctamente'
    })
})

module.exports = {
    createNewSpace,
    getSpaces,
    getSpace,
    updateExistingSpace,
    deleteExistingSpace
}