'use strict';

/**
 * Independent Firestore CRUD connection test.
 * It creates, reads, updates, and deletes documents through the same service
 * functions used by the Express API. One updated document is intentionally
 * retained so it can be shown in the Firebase Console.
 */

const {
  createJournalEntry,
  deleteJournalEntry,
  getAllJournalEntries,
  updateJournalEntry,
  verifyFirestoreConnection,
} = require('./journalEntriesService');

async function runFirestoreTest() {
  const today = new Date().toISOString().slice(0, 10);

  console.log('Verifying Firestore access...');
  await verifyFirestoreConnection();

  console.log('Creating a Firestore CRUD test journal entry...');
  const createdEntry = await createJournalEntry({
    title: 'Firestore CRUD Connection Test',
    content: 'This entry confirms that the Daily Journal server can create Firestore documents.',
    date: today,
    mood: 'Focused',
  });
  console.log('CREATE passed. Document:', createdEntry.id);

  const entriesAfterCreate = await getAllJournalEntries();
  const savedEntry = entriesAfterCreate.find((entry) => entry.id === createdEntry.id);

  if (!savedEntry) {
    throw new Error('READ failed: the created document was not returned by Firestore.');
  }
  console.log('READ passed.');

  const updatedEntry = await updateJournalEntry(createdEntry.id, {
    content: 'This entry confirms that the Daily Journal server can create, read, and update Firestore documents.',
    mood: 'Balanced',
  });

  if (
    !updatedEntry
    || !updatedEntry.content.includes('update Firestore documents')
    || updatedEntry.mood !== 'Balanced'
  ) {
    throw new Error('UPDATE failed: Firestore returned unexpected data.');
  }
  console.log('UPDATE passed.');

  const deleteTarget = await createJournalEntry({
    title: 'Firestore Delete Test',
    content: 'This temporary document should be deleted by the test.',
    date: today,
    mood: 'Thoughtful',
  });

  const deletedEntry = await deleteJournalEntry(deleteTarget.id);
  if (!deletedEntry || deletedEntry.id !== deleteTarget.id) {
    throw new Error('DELETE failed: the service did not return the deleted document.');
  }

  const entriesAfterDelete = await getAllJournalEntries();

  if (entriesAfterDelete.some((entry) => entry.id === deleteTarget.id)) {
    throw new Error('DELETE failed: the temporary document still exists.');
  }
  console.log('DELETE passed.');

  const retainedEntry = entriesAfterDelete.find((entry) => entry.id === createdEntry.id);
  if (!retainedEntry) {
    throw new Error('The retained CRUD test document could not be read back.');
  }

  console.log('Retained document for Firebase Console evidence:', retainedEntry);
  console.log(`journalEntries contains ${entriesAfterDelete.length} document(s).`);
  console.log('Firestore CRUD connection test passed.');
  console.log('Firestore connection test passed.');
}

runFirestoreTest().catch((error) => {
  console.error('Firestore CRUD connection test failed.');
  console.error(error?.message || error);
  process.exitCode = 1;
});
