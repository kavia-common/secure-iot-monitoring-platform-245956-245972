const http = require('http');
const { Server } = require('socket.io');
const app = require('./app');
const { env, assertRequiredConfig } = require('./config/env');
const { connectToDatabase, closeDatabase } = require('./db/mongo');
const {
  setSocketServer,
  registerRealtimeHandlers
} = require('./services/realtimeService');
const {
  startMockDeviceGenerator,
  stopMockDeviceGenerator
} = require('./services/mockDeviceService');

let httpServer = null;

async function shutdown(signal) {
  console.log(`${signal} received: shutting down IoT Security backend...`);

  stopMockDeviceGenerator();
  await closeDatabase();

  if (httpServer) {
    httpServer.close(() => {
      process.exit(0);
    });
    return;
  }

  process.exit(0);
}

// PUBLIC_INTERFACE
/**
 * Initializes the backend server, database, realtime layer, and background demo services.
 *
 * @returns {Promise<http.Server>} Running HTTP server instance.
 */
async function bootstrap() {
  assertRequiredConfig();
  await connectToDatabase();

  httpServer = http.createServer(app);

  const io = new Server(httpServer, {
    cors: {
      origin: env.socketCorsOrigin === '*' ? true : env.socketCorsOrigin,
      methods: ['GET', 'POST']
    }
  });

  setSocketServer(io);
  registerRealtimeHandlers(io);

  await new Promise((resolve) => {
    httpServer.listen(env.port, env.host, () => {
      console.log(`Server running at http://${env.host}:${env.port}`);
      resolve();
    });
  });

  startMockDeviceGenerator();

  process.on('SIGINT', () => {
    shutdown('SIGINT').catch((error) => {
      console.error('Shutdown failed:', error);
      process.exit(1);
    });
  });

  process.on('SIGTERM', () => {
    shutdown('SIGTERM').catch((error) => {
      console.error('Shutdown failed:', error);
      process.exit(1);
    });
  });

  return httpServer;
}

if (require.main === module) {
  bootstrap().catch((error) => {
    console.error('Failed to start backend:', error);
    process.exit(1);
  });
}

module.exports = {
  bootstrap
};
