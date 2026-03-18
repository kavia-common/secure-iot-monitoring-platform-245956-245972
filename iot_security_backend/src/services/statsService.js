const { getDb } = require('../db/mongo');
const { sanitizeEvent } = require('../utils/serializers');

function startOfWindow(days) {
  const currentDate = new Date();
  currentDate.setUTCDate(currentDate.getUTCDate() - days);
  currentDate.setUTCHours(0, 0, 0, 0);
  return currentDate;
}

function buildAlertQuery() {
  return {
    $or: [
      { suspicious: true },
      { severity: 'warning' },
      { severity: 'critical' }
    ]
  };
}

// PUBLIC_INTERFACE
/**
 * Builds the dashboard statistics and chart-friendly datasets used by the frontend.
 *
 * @returns {Promise<object>} Aggregated summary, charts, and recent alerts payload.
 */
async function getStatsOverview() {
  const database = getDb();
  const devicesCollection = database.collection('devices');
  const eventsCollection = database.collection('events');
  const alertQuery = buildAlertQuery();
  const lastSevenDays = startOfWindow(6);
  const lastTwentyFourHours = new Date(Date.now() - (24 * 60 * 60 * 1000));

  const [
    totalDevices,
    activeDevices,
    offlineDevices,
    totalEvents,
    suspiciousEvents,
    criticalAlerts,
    unacknowledgedAlerts,
    eventsLast24Hours,
    recentAlerts,
    recentEvents,
    deviceStatusBreakdown,
    alertsByType,
    alertsByDevice,
    alertsOverTime
  ] = await Promise.all([
    devicesCollection.countDocuments({}),
    devicesCollection.countDocuments({
      status: { $in: ['online', 'alert'] }
    }),
    devicesCollection.countDocuments({
      status: 'offline'
    }),
    eventsCollection.countDocuments({}),
    eventsCollection.countDocuments({
      suspicious: true
    }),
    eventsCollection.countDocuments({
      severity: 'critical'
    }),
    eventsCollection.countDocuments({
      acknowledged: false,
      ...alertQuery
    }),
    eventsCollection.countDocuments({
      timestamp: { $gte: lastTwentyFourHours }
    }),
    eventsCollection
      .find(alertQuery)
      .sort({ timestamp: -1 })
      .limit(10)
      .toArray(),
    eventsCollection
      .find({})
      .sort({ timestamp: -1 })
      .limit(10)
      .toArray(),
    devicesCollection.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      },
      {
        $project: {
          _id: 0,
          status: '$_id',
          count: 1
        }
      },
      {
        $sort: {
          status: 1
        }
      }
    ]).toArray(),
    eventsCollection.aggregate([
      {
        $match: {
          ...alertQuery,
          timestamp: { $gte: lastSevenDays }
        }
      },
      {
        $group: {
          _id: '$eventType',
          count: { $sum: 1 }
        }
      },
      {
        $project: {
          _id: 0,
          eventType: '$_id',
          count: 1
        }
      },
      {
        $sort: {
          count: -1,
          eventType: 1
        }
      }
    ]).toArray(),
    eventsCollection.aggregate([
      {
        $match: {
          ...alertQuery,
          timestamp: { $gte: lastSevenDays }
        }
      },
      {
        $group: {
          _id: '$deviceName',
          count: { $sum: 1 }
        }
      },
      {
        $project: {
          _id: 0,
          deviceName: '$_id',
          count: 1
        }
      },
      {
        $sort: {
          count: -1,
          deviceName: 1
        }
      },
      {
        $limit: 5
      }
    ]).toArray(),
    eventsCollection.aggregate([
      {
        $match: {
          timestamp: { $gte: lastSevenDays }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: {
              format: '%Y-%m-%d',
              date: '$timestamp'
            }
          },
          totalEvents: { $sum: 1 },
          alertCount: {
            $sum: {
              $cond: [
                {
                  $or: [
                    { $eq: ['$suspicious', true] },
                    { $eq: ['$severity', 'warning'] },
                    { $eq: ['$severity', 'critical'] }
                  ]
                },
                1,
                0
              ]
            }
          }
        }
      },
      {
        $project: {
          _id: 0,
          day: '$_id',
          totalEvents: 1,
          alertCount: 1
        }
      },
      {
        $sort: {
          day: 1
        }
      }
    ]).toArray()
  ]);

  return {
    summary: {
      totalDevices,
      activeDevices,
      offlineDevices,
      totalEvents,
      suspiciousEvents,
      criticalAlerts,
      unacknowledgedAlerts,
      eventsLast24Hours
    },
    charts: {
      alertsByType,
      alertsByDevice,
      alertsOverTime,
      deviceStatusBreakdown
    },
    recentAlerts: recentAlerts.map((event) => sanitizeEvent(event)),
    recentEvents: recentEvents.map((event) => sanitizeEvent(event))
  };
}

module.exports = {
  getStatsOverview
};
