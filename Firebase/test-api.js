'use strict';

/**
 * End-to-end test for the complete CRUD Express API.
 * Start the server first, then run: npm run test:api
 * Override the server URL with BASE_URL when necessary.
 *
 * One created document is intentionally kept for the persistence test. A
 * second temporary document is updated and deleted to prove extra-credit CRUD.
 */

const BASE_URL = (process.env.BASE_URL || 'http://localhost:3000').replace(/\/$/, '');
const ENTRIES_URL = `${BASE_URL}/api/entries`;

async function readJson(response) {
  const contentType = response.headers.get('content-type') || '';

  if (!contentType.includes('application/json')) {
    const text = await response.text();
    throw new Error(`Expected JSON but received: ${text.slice(0, 200)}`);
  }

  return response.json();
}

async function postEntry(payload) {
  const response = await fetch(ENTRIES_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return { response, body: await readJson(response) };
}

async function getEntries() {
  const response = await fetch(ENTRIES_URL, {
    headers: { Accept: 'application/json' },
  });
  return { response, body: await readJson(response) };
}

async function runApiTests() {
  const today = new Date().toISOString().slice(0, 10);

  console.log(`Testing POST ${ENTRIES_URL}`);
  const persistentPost = await postEntry({
    title: 'API Persistence Test',
    content: 'This entry remains in Firestore for the restart persistence test.',
    date: today,
    mood: 'Happy',
  });

  if (persistentPost.response.status !== 201 || !persistentPost.body.entry?.id) {
    throw new Error(
      `POST failed with ${persistentPost.response.status}: ${JSON.stringify(persistentPost.body)}`,
    );
  }

  const persistentId = persistentPost.body.entry.id;
  console.log(`POST passed (201). Created persistent document: ${persistentId}`);

  console.log(`Testing GET ${ENTRIES_URL}`);
  const firstGet = await getEntries();

  if (firstGet.response.status !== 200 || !Array.isArray(firstGet.body)) {
    throw new Error(
      `GET failed with ${firstGet.response.status}: ${JSON.stringify(firstGet.body)}`,
    );
  }

  if (!firstGet.body.some((entry) => entry.id === persistentId)) {
    throw new Error('GET did not return the entry created by POST.');
  }

  console.log(`GET passed (200) and returned ${firstGet.body.length} entry/entries.`);

  console.log('Testing invalid POST validation...');
  const invalidPostResponse = await fetch(ENTRIES_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: '',
      content: '',
      date: '',
      mood: '',
    }),
  });
  const invalidPostBody = await readJson(invalidPostResponse);

  if (invalidPostResponse.status !== 400) {
    throw new Error(
      `Invalid POST expected 400 but received ${invalidPostResponse.status}: ${JSON.stringify(invalidPostBody)}`,
    );
  }

  console.log(`Invalid POST passed (400): ${invalidPostBody.error}`);

  console.log('Creating a temporary document for PATCH and DELETE tests...');
  const temporaryPost = await postEntry({
    title: 'CRUD Temporary Entry',
    content: 'This document will be updated and then deleted.',
    date: today,
    mood: 'Thoughtful',
  });

  if (temporaryPost.response.status !== 201 || !temporaryPost.body.entry?.id) {
    throw new Error(
      `Temporary POST failed with ${temporaryPost.response.status}: ${JSON.stringify(temporaryPost.body)}`,
    );
  }

  const temporaryId = temporaryPost.body.entry.id;
  console.log(`Temporary POST passed (201). Document: ${temporaryId}`);

  console.log(`Testing PATCH ${ENTRIES_URL}/${temporaryId}`);
  const patchResponse = await fetch(`${ENTRIES_URL}/${encodeURIComponent(temporaryId)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: 'CRUD Entry Updated',
      content: 'This document was updated through the PATCH endpoint.',
      mood: 'Focused',
    }),
  });
  const patchBody = await readJson(patchResponse);

  if (
    patchResponse.status !== 200
    || patchBody.entry?.id !== temporaryId
    || patchBody.entry?.title !== 'CRUD Entry Updated'
  ) {
    throw new Error(
      `PATCH failed with ${patchResponse.status}: ${JSON.stringify(patchBody)}`,
    );
  }

  console.log(`PATCH passed (200). Updated document: ${temporaryId}`);

  console.log('Testing invalid PATCH validation...');
  const invalidPatchResponse = await fetch(
    `${ENTRIES_URL}/${encodeURIComponent(temporaryId)}`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    },
  );
  const invalidPatchBody = await readJson(invalidPatchResponse);

  if (invalidPatchResponse.status !== 400) {
    throw new Error(
      `Invalid PATCH expected 400 but received ${invalidPatchResponse.status}: ${JSON.stringify(invalidPatchBody)}`,
    );
  }

  console.log(`Invalid PATCH passed (400): ${invalidPatchBody.error}`);

  const updatedGet = await getEntries();
  const updatedEntry = Array.isArray(updatedGet.body)
    ? updatedGet.body.find((entry) => entry.id === temporaryId)
    : null;

  if (
    updatedGet.response.status !== 200
    || updatedEntry?.title !== 'CRUD Entry Updated'
  ) {
    throw new Error('GET did not return the PATCH-updated document.');
  }

  console.log('GET confirmed the PATCH update (200).');

  console.log(`Testing DELETE ${ENTRIES_URL}/${temporaryId}`);
  const deleteResponse = await fetch(
    `${ENTRIES_URL}/${encodeURIComponent(temporaryId)}`,
    { method: 'DELETE' },
  );
  const deleteBody = await readJson(deleteResponse);

  if (deleteResponse.status !== 200 || deleteBody.entry?.id !== temporaryId) {
    throw new Error(
      `DELETE failed with ${deleteResponse.status}: ${JSON.stringify(deleteBody)}`,
    );
  }

  console.log(`DELETE passed (200). Removed document: ${temporaryId}`);

  const finalGet = await getEntries();

  if (
    finalGet.response.status !== 200
    || !Array.isArray(finalGet.body)
    || finalGet.body.some((entry) => entry.id === temporaryId)
  ) {
    throw new Error('GET still returned the document after DELETE.');
  }

  console.log('GET confirmed the deletion (200).');
  console.log('All API CRUD tests passed.');
  console.log(`PERSISTENCE_ID=${persistentId}`);
}

runApiTests().catch((error) => {
  console.error('API CRUD test failed.');
  console.error(error?.message || error);
  process.exitCode = 1;
});
