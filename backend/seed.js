
require('dotenv').config()

const redisClient = require('./config/redis')
const { createSpace } = require('./models/spaceModel')
const { randomUUID } = require('crypto')

const spaces = [
    {
        name: 'Sala de estudio A',
        location: 'Biblioteca - Piso 1',
        capacity: 4
    },
    {
        name: 'Sala de estudio B',
        location: 'Biblioteca - Piso 2',
        capacity: 6
    },
    {
        name: 'Laboratorio de computación',
        location: 'Edificio de Ingeniería',
        capacity: 25
    },
    {
        name: 'Sala de reuniones',
        location: 'Edificio Administrativo',
        capacity: 10
    },
    {
        name: 'Sala multimedia',
        location: 'Centro de Innovación',
        capacity: 12
    }
]

const seedDatabase = async () => {
    try {
        await redisClient.connect()

        console.log('Conectado a Redis Cloud')

        for (const space of spaces) {
            const existingIds = await redisClient.sMembers('spaces:all')
            let alreadyExists = false

            for (const id of existingIds) {
                const existing = await redisClient.hGetAll(`space:${id}`)

                if (
                    existing.name === space.name &&
                    existing.location === space.location
                ) {
                    alreadyExists = true
                    break
                }
            }

            if (alreadyExists) {
                console.log(`Ya existe: ${space.name}`)
                continue
            }

            const created = await createSpace({
                id: randomUUID(),
                ...space
            })

            console.log(`Espacio creado: ${created.name}`)
        }

        console.log('Seeding completado correctamente')
    } catch (error) {
        console.error('Error durante el seeding:', error)
        process.exitCode = 1
    } finally {
        if (redisClient.isOpen) {
            await redisClient.quit()
        }
    }
}

seedDatabase()
