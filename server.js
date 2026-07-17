'use strict';

const path = require('node:path');
const { createApp } = require('./src/createApp');

const DEFAULT_PORT = 3000;

function parsePort(value) {
  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 65535) {
    return DEFAULT_PORT;
  }

  return parsed;
}

async function startServer() {
  // Requiring the Firestore service here keeps pure code tests independent of
  // Firebase credentials while ensuring the real server always uses Firestore.
  const journalService = require('./Firebase/journalEntriesService');

  console.log('Verifying Firebase Firestore connection...');
  await journalService.verifyFirestoreConnection();
  console.log('Firebase Firestore connection verified.');

  const app = createApp({
    journalService,
    publicDirectory: path.join(__dirname, 'public'),
  });

  const port = parsePort(process.env.PORT || DEFAULT_PORT);

  return new Promise((resolve, reject) => {
    const server = app.listen(port, () => {
      console.log('Firebase Firestore endpoints loaded successfully.');
      console.log(`Server running at http://localhost:${port}`);
      resolve(server);
    });

    server.once('error', (error) => {
      reject(error);
    });
  });
}

if (require.main === module) {
  startServer().catch((error) => {
    console.error('Server failed to start.');
    console.error(error?.message || error);
    process.exitCode = 1;
  });
}

module.exports = {
  parsePort,
  startServer,
};
