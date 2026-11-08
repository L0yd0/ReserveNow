const express = require('express')
const dotenv = require('dotenv')
const redisClient = require('./config/redis')

dotenv.config()

const app = express()

app.use(express.json())

// Rutas
app.use('/api', require('./routes/healthRoutes'))
app.use('/api/spaces', require('./routes/spaceRoutes'))
app.use('/api/reservations', require('./routes/reservationRoutes'))

const PORT = process.env.PORT || 5000

const startServer = async () => {
    try {
        // Conectar con Redis Cloud
        await redisClient.connect()

        console.log('Redis conectado correctamente')

        app.listen(PORT, () => {
            console.log(`Servidor ejecutándose en puerto ${PORT}`)
        })
    } catch (error) {
        console.error('Error al iniciar el servidor:', error)
        process.exit(1)
    }
}

startServer()