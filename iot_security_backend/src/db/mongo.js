const { MongoClient } = require('mongodb');
const { env } = require('../config/env');

let clientInstance = null;
let databaseInstance = null;

// PUBLIC_INTERFACE
/**
 * Establishes a singleton MongoDB connection for the application.
 *
 * @returns {Promise<import('mongodb').Db>} The connected MongoDB database instance.
 */
async function connectToDatabase() {
  if (databaseInstance) {
    return databaseInstance;
  }

  clientInstance = new MongoClient(env.mongodbUrl, {
    ignoreUndefined: true,
    serverSelectionTimeoutMS: 5000
  });

  await clientInstance.connect();
  databaseInstance = clientInstance.db(env.mongodbDb);

  return databaseInstance;
}

// PUBLIC_INTERFACE
/**
 * Returns the active MongoDB database instance after initialization.
 *
 * @returns {import('mongodb').Db} The active database instance.
 * @throws {Error} When the database has not been connected yet.
 */
function getDb() {
  if (!databaseInstance) {
    throw new Error('Database connection has not been initialized yet.');
  }

  return databaseInstance;
}

// PUBLIC_INTERFACE
/**
 * Closes the active MongoDB connection when the server shuts down.
 *
 * @returns {Promise<void>} A promise that resolves once the MongoDB client is closed.
 */
async function closeDatabase() {
  if (!clientInstance) {
    return;
  }

  await clientInstance.close();
  clientInstance = null;
  databaseInstance = null;
}

module.exports = {
  connectToDatabase,
  getDb,
  closeDatabase
};
