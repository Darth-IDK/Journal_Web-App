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
    email: data.email || '',
    createdAt: timestampToIso(data.createdAt),
  };
}

async function createJournalEntry({ title, content, date, mood, email }) {
  const documentReference = await db.collection(COLLECTION_NAME).add({
    title,
    content,
    date,
    mood,
    email: email ? email.toLowerCase() : '',
    createdAt: FieldValue.serverTimestamp(),
  });

  const createdDocument = await documentReference.get();
  return serializeEntry(createdDocument);
}

async function getAllJournalEntries(email) {
  let query = db.collection(COLLECTION_NAME);
  if (email) {
    query = query.where('email', '==', email.toLowerCase());
  }
  const snapshot = await query
    .orderBy('createdAt', 'desc')
    .get();

  return snapshot.docs.map(serializeEntry);
}

module.exports = {
  COLLECTION_NAME,
  createJournalEntry,
  getAllJournalEntries,
};
