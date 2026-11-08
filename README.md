# ReserveNow

API REST para la gestión de espacios y reservaciones temporales utilizando Node.js, Express y Redis Cloud.

## Descripción

ReserveNow permite administrar espacios, como salas de estudio, laboratorios y salas de reuniones, mediante un sistema de reservaciones.

Cuando un usuario solicita un espacio, se genera una reservación temporal con una duración de 10 minutos. Si el usuario confirma antes de que expire, la reservación se conserva permanentemente. De lo contrario, Redis libera automáticamente el espacio mediante TTL.

## Tecnologías utilizadas

- **Node.js:** entorno de ejecución de JavaScript.
- **Express.js:** framework para desarrollar la API REST.
- **Redis Cloud:** base de datos NoSQL administrada en la nube.
- **node-redis:** cliente oficial de Redis para Node.js.
- **Lua:** ejecución atómica de operaciones en Redis.

## Arquitectura

El sistema utiliza una arquitectura modular organizada en:

- `config/`: configuración de Redis Cloud.
- `models/`: operaciones de almacenamiento y consultas Redis.
- `controllers/`: validación de solicitudes y respuestas HTTP.
- `routes/`: definición de endpoints.
- `tests/`: pruebas automatizadas.

Flujo de comunicación:

Cliente HTTP → Express → Controllers → Models → Redis Cloud

## Modelo de datos NoSQL

ReserveNow utiliza principalmente tres estructuras de Redis:

**Hashes:** almacenan los atributos de espacios y reservaciones.

**Sets:** mantienen índices de identificadores para consultar los registros.

**Strings:** representan bloqueos temporales y reservaciones confirmadas.

Las claves principales son:

| Clave | Estructura | Descripción |
|---|---|---|
| `space:{id}` | Hash | Información del espacio |
| `spaces:all` | Set | Índice de espacios |
| `reservation:{id}` | Hash | Información de reservación |
| `reservations:all` | Set | Índice de reservaciones |
| `lock:space:{id}` | String | Bloqueo temporal con TTL |
| `confirmed:space:{id}` | String | Identificador de reservación confirmada |

## Endpoints

### Espacios

| Método | Endpoint | Descripción |
|---|---|---|
| POST | `/api/spaces` | Crear espacio |
| GET | `/api/spaces` | Listar espacios |
| GET | `/api/spaces/:id` | Consultar espacio |
| PUT | `/api/spaces/:id` | Actualizar espacio |
| DELETE | `/api/spaces/:id` | Eliminar espacio |

### Reservaciones

| Método | Endpoint | Descripción |
|---|---|---|
| POST | `/api/reservations` | Crear reservación temporal |
| GET | `/api/reservations` | Consultar y filtrar reservaciones |
| GET | `/api/reservations/:id` | Consultar reservación |
| PUT | `/api/reservations/:id/confirm` | Confirmar reservación |
| DELETE | `/api/reservations/:id` | Cancelar reservación |

Las consultas de reservaciones permiten filtrar mediante `userId`, `spaceId` y `status`.

## Instalación y ejecución

**Requisitos:** Node.js 22 o superior y una instancia activa de Redis Cloud.

1. Clonar el repositorio.
2. Instalar dependencias mediante `npm install`.
3. Crear un archivo `.env` utilizando `.env.example` como referencia.
4. Configurar las credenciales de Redis Cloud.
5. Ejecutar `npm start`.

El servidor utilizará el puerto 5000 de forma predeterminada.
### Poblar la base de datos

El proyecto incluye un script de inicialización que permite cargar cinco espacios de ejemplo en Redis Cloud.

Ejecutar desde la raíz del proyecto:

```bash
npm run seed
```

El script verifica si los espacios de ejemplo ya existen antes de insertarlos, evitando duplicados al ejecutarlo nuevamente.

Para iniciar la aplicación:

```bash
npm start
```

### Ejecutar las pruebas

Con el servidor iniciado, ejecutar:

```bash
node backend/tests/reservation.test.js
node backend/tests/concurrency.test.js
node backend/tests/ttl.test.js
```

Estas pruebas verifican el funcionamiento de las reservaciones, los bloqueos concurrentes y la expiración automática de las claves temporales.
## Pruebas automatizadas

Con el servidor ejecutándose, utilizar:

- `node backend/tests/reservation.test.js`
- `node backend/tests/concurrency.test.js`
- `node backend/tests/ttl.test.js`

Las pruebas comprueban operaciones CRUD, reservaciones, confirmación, cancelación, prevención de duplicados, concurrencia y expiración automática.

## Consideraciones técnicas

- Las reservaciones pendientes expiran después de 600 segundos.
- Las reservaciones confirmadas permanecen almacenadas sin TTL.
- Las operaciones críticas utilizan scripts Lua para garantizar atomicidad.
- Los espacios con reservaciones activas no pueden eliminarse.
- Las credenciales se almacenan mediante variables de entorno.

## Limitaciones

Esta versión académica administra una reservación activa por espacio, sin calendario ni franjas horarias. Los usuarios se identifican mediante un `userId` proporcionado por el cliente y no existe un sistema de autenticación.

El proyecto está diseñado como una demostración funcional del paradigma NoSQL clave-valor y del uso de Redis Cloud.

## Autor

Ricardo Vargas Rodríguez

Proyecto académico — Desarrollo e Integración de Aplicaciones con Bases de Datos NoSQL en la Nube.