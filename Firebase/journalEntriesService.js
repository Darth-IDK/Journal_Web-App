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

  return value;
}

function serializeEntry(documentSnapshot) {
  const data = documentSnapshot.data();

  return {
    id: documentSnapshot.id,
    title: data.title,
    content: data.content,
    date: data.date,
    mood: data.mood,
    createdAt: timestampToIso(data.createdAt),
  };
}

async function createJournalEntry({ title, content, date, mood }) {
  const documentReference = await db.collection(COLLECTION_NAME).add({
    title,
    content,
    date,
    mood,
    createdAt: FieldValue.serverTimestamp(),
  });

  const createdDocument = await documentReference.get();
  return serializeEntry(createdDocument);
}

async function getAllJournalEntries() {
  const snapshot = await db
    .collection(COLLECTION_NAME)
    .orderBy('createdAt', 'desc')
    .get();

  return snapshot.docs.map(serializeEntry);
}

module.exports = {
  COLLECTION_NAME,
  createJournalEntry,
  getAllJournalEntries,
};
