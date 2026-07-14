'use strict';

/**
 * Independent Firestore connection test.
 * It writes one permanent sample entry, then reads the collection back.
 */

const {
  createJournalEntry,
  getAllJournalEntries,
} = require('./journalEntriesService');

async function runFirestoreTest() {
  const today = new Date().toISOString().slice(0, 10);

  console.log('Creating a Firestore test journal entry...');

  const createdEntry = await createJournalEntry({
    title: 'Firestore Connection Test',
    content: 'This entry confirms that the Daily Journal server can write to Firestore.',
    date: today,
    mood: 'Happy',
  });

  console.log('Created document:', createdEntry.id);

  const entries = await getAllJournalEntries();
  const savedEntry = entries.find((entry) => entry.id === createdEntry.id);

  if (!savedEntry) {
    throw new Error('The created document was not returned by Firestore.');
  }

  console.log('Read-back successful:', savedEntry);
  console.log(`journalEntries contains ${entries.length} document(s).`);
  console.log('Firestore connection test passed.');
}

runFirestoreTest().catch((error) => {
  console.error('Firestore connection test failed:', error);
  process.exitCode = 1;
});
