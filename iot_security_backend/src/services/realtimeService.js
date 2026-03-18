const { extractBearerToken, verifyAccessToken } = require('../utils/security');

const realtimeChannels = {
  welcome: 'system:welcome',
  eventCreated: 'events:new',
  eventAcknowledged: 'events:acknowledged',
  deviceUpdated: 'devices:updated',
  deviceDeleted: 'devices:deleted',
  statsUpdated: 'stats:updated',
  dashboardUpdated: 'dashboard:updated'
};

let ioInstance = null;
let handlersRegistered = false;

function emitToAll(channel, payload) {
  if (!ioInstance) {
    return;
  }

  ioInstance.emit(channel, payload);
}

function resolveSocketToken(socket) {
  const directToken = socket.handshake.auth?.token || socket.handshake.auth?.accessToken;
  if (directToken) {
    return directToken;
  }

  const authorizationHeader = socket.handshake.headers?.authorization;
  return extractBearerToken(authorizationHeader);
}

function decodeSocketUser(socket) {
  const token = resolveSocketToken(socket);

  if (!token) {
    return null;
  }

  try {
    return verifyAccessToken(token);
  } catch (error) {
    return null;
  }
}

// PUBLIC_INTERFACE
/**
 * Registers the Socket.IO server instance for later broadcast usage.
 *
 * @param {import('socket.io').Server} io - Socket.IO server instance.
 * @returns {void} Nothing.
 */
function setSocketServer(io) {
  ioInstance = io;
}

// PUBLIC_INTERFACE
/**
 * Returns whether realtime broadcasting has been initialized.
 *
 * @returns {boolean} True when a Socket.IO server has been registered.
 */
function isRealtimeInitialized() {
  return Boolean(ioInstance);
}

// PUBLIC_INTERFACE
/**
 * Returns metadata describing how clients should connect to realtime channels.
 *
 * @returns {object} Realtime usage metadata for API consumers.
 */
function getRealtimeInfo() {
  return {
    protocol: 'socket.io',
    path: '/socket.io',
    authentication: 'Optional Bearer JWT via socket.auth.token or Authorization header',
    channels: realtimeChannels,
    notes: [
      'Clients receive dashboard and event updates in real time.',
      'Authenticated sockets automatically join role-based rooms.',
      'Anonymous demo clients may connect without a token for read-only monitoring.'
    ]
  };
}

// PUBLIC_INTERFACE
/**
 * Attaches default connection handlers to the Socket.IO server.
 *
 * @param {import('socket.io').Server} io - Socket.IO server instance.
 * @returns {void} Nothing.
 */
function registerRealtimeHandlers(io) {
  if (handlersRegistered) {
    return;
  }

  handlersRegistered = true;

  io.on('connection', async (socket) => {
    const user = decodeSocketUser(socket);

    if (user?.role) {
      socket.join(`role:${user.role}`);
    }

    if (user?.sub) {
      socket.join(`user:${user.sub}`);
    }

    socket.emit(realtimeChannels.welcome, {
      socketId: socket.id,
      user: user || null,
      channels: realtimeChannels
    });

    socket.on('dashboard:subscribe', async () => {
      await emitStatsSnapshot();
    });
  });
}

// PUBLIC_INTERFACE
/**
 * Broadcasts a newly created event to all connected clients.
 *
 * @param {object} eventPayload - Serialized event payload.
 * @returns {void} Nothing.
 */
function emitEventCreated(eventPayload) {
  emitToAll(realtimeChannels.eventCreated, eventPayload);
}

// PUBLIC_INTERFACE
/**
 * Broadcasts an event acknowledgement update to all connected clients.
 *
 * @param {object} eventPayload - Serialized acknowledged event payload.
 * @returns {void} Nothing.
 */
function emitEventAcknowledged(eventPayload) {
  emitToAll(realtimeChannels.eventAcknowledged, eventPayload);
}

// PUBLIC_INTERFACE
/**
 * Broadcasts a device create/update payload to all connected clients.
 *
 * @param {object} devicePayload - Serialized device payload.
 * @returns {void} Nothing.
 */
function emitDeviceUpdated(devicePayload) {
  emitToAll(realtimeChannels.deviceUpdated, devicePayload);
}

// PUBLIC_INTERFACE
/**
 * Broadcasts a device deletion payload to all connected clients.
 *
 * @param {object} devicePayload - Serialized device payload.
 * @returns {void} Nothing.
 */
function emitDeviceDeleted(devicePayload) {
  emitToAll(realtimeChannels.deviceDeleted, devicePayload);
}

// PUBLIC_INTERFACE
/**
 * Computes and broadcasts the latest dashboard statistics snapshot.
 *
 * @returns {Promise<void>} Resolves once the snapshot has been emitted.
 */
async function emitStatsSnapshot() {
  if (!ioInstance) {
    return;
  }

  const { getStatsOverview } = require('./statsService');
  const snapshot = await getStatsOverview();

  emitToAll(realtimeChannels.statsUpdated, snapshot);
  emitToAll(realtimeChannels.dashboardUpdated, snapshot);
}

module.exports = {
  setSocketServer,
  isRealtimeInitialized,
  getRealtimeInfo,
  registerRealtimeHandlers,
  emitEventCreated,
  emitEventAcknowledged,
  emitDeviceUpdated,
  emitDeviceDeleted,
  emitStatsSnapshot
};
