const USER_ROLES = ['admin', 'user'];
const DEVICE_TYPES = ['motion', 'door'];
const DEVICE_STATUSES = ['online', 'offline', 'maintenance', 'alert'];
const EVENT_TYPES = [
  'motion_detected',
  'door_opened',
  'door_closed',
  'heartbeat_missed',
  'tamper_detected'
];
const EVENT_SEVERITIES = ['info', 'warning', 'critical'];

module.exports = {
  USER_ROLES,
  DEVICE_TYPES,
  DEVICE_STATUSES,
  EVENT_TYPES,
  EVENT_SEVERITIES
};
