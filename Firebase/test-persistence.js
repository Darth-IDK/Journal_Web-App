'use strict';

/**
 * Confirms that an existing Firestore document still appears after the Express
 * server has been restarted.
 *
 * Usage:
 *   node Firebase/test-persistence.js <document-id>
 */

const BASE_URL = (process.env.BASE_URL || 'http://localhost:3000').replace(/\/$/, '');
const documentId = process.argv[2] || process.env.ENTRY_ID;

async function runPersistenceTest() {
  if (!documentId) {
    throw new Error('Provide the Firestore document ID as the first argument or ENTRY_ID.');
  }

  const response = await fetch(`${BASE_URL}/api/entries`, {
    headers: { Accept: 'application/json' },
  });
  const body = await response.json();

  if (response.status !== 200 || !Array.isArray(body)) {
    throw new Error(`GET failed with ${response.status}: ${JSON.stringify(body)}`);
  }

  const persistedEntry = body.find((entry) => entry.id === documentId);
  if (!persistedEntry) {
    throw new Error(`Document ${documentId} was not returned after the restart.`);
  }

  console.log(`Persistent storage verified for document: ${documentId}`);
  console.log('Firestore persistence test passed.');
}

runPersistenceTest().catch((error) => {
  console.error('Firestore persistence test failed.');
  console.error(error?.message || error);
  process.exitCode = 1;
});
