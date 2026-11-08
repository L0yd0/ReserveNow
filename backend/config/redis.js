const { createClient } = require('redis')
require('dotenv').config()

const redisClient = createClient({
    username: process.env.REDIS_USERNAME,
    password: process.env.REDIS_PASSWORD,
    socket: {
        host: process.env.REDIS_HOST,
        port: Number(process.env.REDIS_PORT)
    }
})

redisClient.on('error', (err) => {
    console.error('Redis Client Error:', err.message)
})

redisClient.on('connect', () => {
    console.log('Conectando a Redis...')
})

redisClient.on('ready', () => {
    console.log('Redis está listo para recibir operaciones')
})

redisClient.on('reconnecting', () => {
    console.log('Intentando reconectar con Redis...')
})

redisClient.on('end', () => {
    console.log('Conexión con Redis cerrada')
})

module.exports = redisClient