'use strict';

/**
 * Firebase Admin / Firestore initialization.
 *
 * Local development:
 *   Set GOOGLE_APPLICATION_CREDENTIALS to the absolute path of your
 *   Firebase service-account JSON file before starting Node.js.
 *
 * The private key file must never be placed in public/ or committed to Git.
 */

const {
  applicationDefault,
  getApps,
  initializeApp,
} = require('firebase-admin/app');
const {
  FieldValue,
  getFirestore,
  Timestamp,
} = require('firebase-admin/firestore');

function getOrCreateFirebaseApp() {
  const existingApps = getApps();

  if (existingApps.length > 0) {
    return existingApps[0];
  }

  return initializeApp({
    credential: applicationDefault(),
  });
}

const firebaseApp = getOrCreateFirebaseApp();
const db = getFirestore(firebaseApp);

module.exports = {
  db,
  FieldValue,
  Timestamp,
};
