const { getDb } = require('../db/mongo');
const { env } = require('../config/env');
const { createEventForDevice } = require('./eventService');

let intervalHandle = null;

function randomItem(items) {
  return items[Math.floor(Math.random() * items.length)];
}

function randomSeverity(eventType) {
  if (eventType === 'tamper_detected') {
    return 'critical';
  }

  if (eventType === 'heartbeat_missed') {
    return 'warning';
  }

  return Math.random() > 0.8 ? 'warning' : 'info';
}

function eventTypeForDevice(device) {
  if (device.type === 'door') {
    return randomItem(['door_opened', 'door_closed', 'tamper_detected']);
  }

  return randomItem(['motion_detected', 'motion_detected', 'heartbeat_missed']);
}

// PUBLIC_INTERFACE
/**
 * Executes one background mock event generation cycle.
 *
 * @returns {Promise<object|null>} Persisted event payload when a device was available, otherwise null.
 */
async function generateMockEventTick() {
  const eligibleDevices = await getDb().collection('devices')
    .find({
      status: { $ne: 'maintenance' }
    })
    .toArray();

  if (eligibleDevices.length === 0) {
    return null;
  }

  const device = randomItem(eligibleDevices);
  const eventType = eventTypeForDevice(device);

  return createEventForDevice({
    device,
    eventType,
    severity: randomSeverity(eventType),
    source: 'mock-generator',
    metadata: {
      generator: 'mock-device-service',
      automated: true
    }
  });
}

// PUBLIC_INTERFACE
/**
 * Starts the background mock device generator when enabled by environment configuration.
 *
 * @returns {void} Nothing.
 */
function startMockDeviceGenerator() {
  if (!env.mockDeviceGeneratorEnabled || intervalHandle) {
    return;
  }

  intervalHandle = setInterval(async () => {
    try {
      await generateMockEventTick();
    } catch (error) {
      console.error('Mock device generator failed:', error.message);
    }
  }, env.mockDeviceGeneratorIntervalMs);
}

// PUBLIC_INTERFACE
/**
 * Stops the background mock device generator.
 *
 * @returns {void} Nothing.
 */
function stopMockDeviceGenerator() {
  if (!intervalHandle) {
    return;
  }

  clearInterval(intervalHandle);
  intervalHandle = null;
}

// PUBLIC_INTERFACE
/**
 * Returns whether the mock device generator is currently active.
 *
 * @returns {boolean} True when the generator interval is running.
 */
function isMockDeviceGeneratorRunning() {
  return Boolean(intervalHandle);
}

module.exports = {
  generateMockEventTick,
  startMockDeviceGenerator,
  stopMockDeviceGenerator,
  isMockDeviceGeneratorRunning
};
