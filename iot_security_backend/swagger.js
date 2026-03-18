const swaggerJSDoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.3',
    info: {
      title: 'IoT Security Monitoring API',
      version: '1.0.0',
      description: 'Express backend for the IoT Security Monitoring Platform with JWT auth, RBAC, MongoDB persistence, realtime Socket.IO updates, suspicious activity detection, and demo device simulation.'
    },
    tags: [
      { name: 'System', description: 'Health and service readiness endpoints.' },
      { name: 'Authentication', description: 'JWT-based login, registration, and current-user profile operations.' },
      { name: 'Devices', description: 'IoT device CRUD and manual trigger operations.' },
      { name: 'Events', description: 'Event logs, alert acknowledgements, and event creation endpoints.' },
      { name: 'Statistics', description: 'Dashboard summary metrics and chart datasets.' },
      { name: 'Realtime', description: 'Socket.IO realtime connection guidance and broadcast metadata.' }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      },
      schemas: {
        User: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            _id: { type: 'string' },
            email: { type: 'string', format: 'email' },
            username: { type: 'string', nullable: true },
            name: { type: 'string' },
            role: { type: 'string', enum: ['admin', 'user'] },
            status: { type: 'string', enum: ['active', 'disabled'] },
            lastLoginAt: { type: 'string', format: 'date-time', nullable: true },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' }
          }
        },
        RegisterRequest: {
          type: 'object',
          required: ['name', 'email', 'password'],
          properties: {
            name: { type: 'string', example: 'Security Analyst' },
            email: { type: 'string', format: 'email', example: 'analyst@iotsecure.demo' },
            password: { type: 'string', example: 'User123!' },
            username: { type: 'string', example: 'analyst' }
          }
        },
        LoginRequest: {
          type: 'object',
          required: ['email', 'password'],
          properties: {
            email: { type: 'string', format: 'email', example: 'admin@iotsecure.demo' },
            password: { type: 'string', example: 'Admin123!' }
          }
        },
        AuthResponse: {
          type: 'object',
          properties: {
            status: { type: 'string', example: 'success' },
            message: { type: 'string', example: 'Authentication successful.' },
            data: {
              type: 'object',
              properties: {
                token: { type: 'string' },
                user: { $ref: '#/components/schemas/User' }
              }
            }
          }
        },
        UserResponse: {
          type: 'object',
          properties: {
            status: { type: 'string', example: 'success' },
            data: { $ref: '#/components/schemas/User' }
          }
        },
        Device: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            _id: { type: 'string' },
            deviceId: { type: 'string' },
            name: { type: 'string' },
            type: { type: 'string', enum: ['motion', 'door'] },
            location: { type: 'string' },
            status: { type: 'string', enum: ['online', 'offline', 'maintenance', 'alert'] },
            batteryLevel: { type: 'integer' },
            firmwareVersion: { type: 'string', nullable: true },
            ipAddress: { type: 'string', nullable: true },
            lastSeenAt: { type: 'string', format: 'date-time', nullable: true },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' }
          }
        },
        DeviceInput: {
          type: 'object',
          required: ['name', 'type', 'location'],
          properties: {
            deviceId: { type: 'string', example: 'door-front-002' },
            name: { type: 'string', example: 'Front Door Sensor' },
            type: { type: 'string', enum: ['motion', 'door'] },
            location: { type: 'string', example: 'HQ Lobby' },
            status: { type: 'string', enum: ['online', 'offline', 'maintenance', 'alert'] },
            batteryLevel: { type: 'integer', example: 92 },
            firmwareVersion: { type: 'string', example: '1.2.0' },
            ipAddress: { type: 'string', example: '10.0.0.10' }
          }
        },
        DeviceUpdateInput: {
          type: 'object',
          properties: {
            deviceId: { type: 'string' },
            name: { type: 'string' },
            type: { type: 'string', enum: ['motion', 'door'] },
            location: { type: 'string' },
            status: { type: 'string', enum: ['online', 'offline', 'maintenance', 'alert'] },
            batteryLevel: { type: 'integer' },
            firmwareVersion: { type: 'string' },
            ipAddress: { type: 'string', nullable: true },
            lastSeenAt: { type: 'string', format: 'date-time' }
          }
        },
        Event: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            _id: { type: 'string' },
            deviceId: { type: 'string' },
            deviceName: { type: 'string' },
            deviceType: { type: 'string', enum: ['motion', 'door'] },
            location: { type: 'string' },
            eventType: { type: 'string', enum: ['motion_detected', 'door_opened', 'door_closed', 'heartbeat_missed', 'tamper_detected'] },
            severity: { type: 'string', enum: ['info', 'warning', 'critical'] },
            suspicious: { type: 'boolean' },
            source: { type: 'string' },
            message: { type: 'string' },
            acknowledged: { type: 'boolean' },
            acknowledgedAt: { type: 'string', format: 'date-time', nullable: true },
            metadata: { type: 'object', additionalProperties: true },
            timestamp: { type: 'string', format: 'date-time' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time', nullable: true }
          }
        },
        EventTriggerRequest: {
          type: 'object',
          properties: {
            eventType: { type: 'string', enum: ['motion_detected', 'door_opened', 'door_closed', 'heartbeat_missed', 'tamper_detected'] },
            severity: { type: 'string', enum: ['info', 'warning', 'critical'] },
            message: { type: 'string' },
            timestamp: { type: 'string', format: 'date-time' },
            forceSuspicious: { type: 'boolean' },
            metadata: { type: 'object', additionalProperties: true }
          }
        },
        EventCreateRequest: {
          allOf: [
            { $ref: '#/components/schemas/EventTriggerRequest' },
            {
              type: 'object',
              required: ['deviceId'],
              properties: {
                deviceId: { type: 'string', example: 'door-front-001' }
              }
            }
          ]
        },
        HealthResponse: {
          type: 'object',
          properties: {
            status: { type: 'string', example: 'ok' },
            message: { type: 'string' },
            timestamp: { type: 'string', format: 'date-time' },
            environment: { type: 'string' },
            services: {
              type: 'object',
              properties: {
                database: { type: 'string' },
                realtime: { type: 'string' },
                mockGenerator: { type: 'string' }
              }
            }
          }
        }
      }
    }
  },
  apis: ['./src/routes/*.js']
};

module.exports = swaggerJSDoc(options);
