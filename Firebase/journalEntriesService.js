'use strict';

/**
 * Firestore data-access functions for the journalEntries collection.
 * This file contains no Express routes, so it can be tested independently.
 */

const { db, FieldValue } = require('./firebase');

const COLLECTION_NAME = 'journalEntries';

function timestampToIso(value) {
  if (!value) {
    return null;
  }

  if (typeof value.toDate === 'function') {
    return value.toDate().toISOString();
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  return typeof value === 'string' ? value : null;
}

function serializeEntry(documentSnapshot) {
  const data = documentSnapshot.data() || {};

  return {
    id: documentSnapshot.id,
    title: typeof data.title === 'string' ? data.title : '',
    content: typeof data.content === 'string' ? data.content : '',
    date: typeof data.date === 'string' ? data.date : '',
    mood: typeof data.mood === 'string' ? data.mood : '',
    email: typeof data.email === 'string' ? data.email : '',
    createdAt: timestampToIso(data.createdAt),
    updatedAt: timestampToIso(data.updatedAt),
  };
}

function compareEntriesNewestFirst(left, right) {
  const leftActivityAt = left.updatedAt || left.createdAt || '';
  const rightActivityAt = right.updatedAt || right.createdAt || '';

  if (leftActivityAt !== rightActivityAt) {
    return rightActivityAt.localeCompare(leftActivityAt);
  }

  if (left.date !== right.date) {
    return right.date.localeCompare(left.date);
  }

  return String(right.id).localeCompare(String(left.id));
}

function matchesOptionalEmail(documentSnapshot, email) {
  if (!email) {
    return true;
  }

  const storedEmail = documentSnapshot.data()?.email;
  return typeof storedEmail === 'string' && storedEmail.toLowerCase() === email.toLowerCase();
}

async function createJournalEntry({ title, content, date, mood, email = '' }) {
  const documentData = {
    title,
    content,
    date,
    mood,
    createdAt: FieldValue.serverTimestamp(),
  };

  if (email) {
    documentData.email = email.toLowerCase();
  }

  const documentReference = await db
    .collection(COLLECTION_NAME)
    .add(documentData);

  const createdDocument = await documentReference.get();
  return serializeEntry(createdDocument);
}

async function getAllJournalEntries(email) {
  let query = db.collection(COLLECTION_NAME);

  if (email) {
    query = query.where('email', '==', email.toLowerCase());
  }

  // Sorting in application code avoids requiring a composite Firestore index
  // for the optional email filter + timestamp ordering combination. The class
  // project is intentionally small, so reading and sorting the result set is
  // an appropriate trade-off here.
  const snapshot = await query.get();

  return snapshot.docs
    .map(serializeEntry)
    .sort(compareEntriesNewestFirst);
}

/**
 * Updates one or more editable journal fields. If an email scope is supplied,
 * the document is treated as not found unless its stored email matches.
 */
async function updateJournalEntry(id, updates, email) {
  const documentReference = db.collection(COLLECTION_NAME).doc(id);
  let entryWasFound = false;

  await db.runTransaction(async (transaction) => {
    entryWasFound = false;
    const snapshot = await transaction.get(documentReference);

    if (!snapshot.exists || !matchesOptionalEmail(snapshot, email)) {
      return;
    }

    entryWasFound = true;
    transaction.update(documentReference, {
      ...updates,
      updatedAt: FieldValue.serverTimestamp(),
    });
  });

  if (!entryWasFound) {
    return null;
  }

  return serializeEntry(await documentReference.get());
}

/**
 * Deletes one journal document and returns its last stored representation.
 * Optional email scoping follows the same behavior as updateJournalEntry().
 */
async function deleteJournalEntry(id, email) {
  const documentReference = db.collection(COLLECTION_NAME).doc(id);
  let deletedEntry = null;

  await db.runTransaction(async (transaction) => {
    deletedEntry = null;
    const snapshot = await transaction.get(documentReference);

    if (!snapshot.exists || !matchesOptionalEmail(snapshot, email)) {
      return;
    }

    deletedEntry = serializeEntry(snapshot);
    transaction.delete(documentReference);
  });

  return deletedEntry;
}

async function verifyFirestoreConnection() {
  await db.collection(COLLECTION_NAME).limit(1).get();
}

module.exports = {
  COLLECTION_NAME,
  createJournalEntry,
  deleteJournalEntry,
  getAllJournalEntries,
  updateJournalEntry,
  verifyFirestoreConnection,
};
