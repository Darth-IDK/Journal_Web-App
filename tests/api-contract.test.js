'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { once } = require('node:events');
const path = require('node:path');
const { createApp } = require('../src/createApp');

function createInMemoryJournalService() {
  const entries = [];
  let nextId = 1;

  const matchesScope = (entry, email) => !email || entry.email === email;

  return {
    async createJournalEntry(entry) {
      const savedEntry = {
        ...entry,
        id: `test-${nextId}`,
        createdAt: new Date(Date.now() + nextId).toISOString(),
        updatedAt: null,
      };
      nextId += 1;
      entries.unshift(savedEntry);
      return { ...savedEntry };
    },

    async getAllJournalEntries(email) {
      return entries
        .filter((entry) => matchesScope(entry, email))
        .map((entry) => ({ ...entry }));
    },

    async updateJournalEntry(id, updates, email) {
      const index = entries.findIndex(
        (entry) => entry.id === id && matchesScope(entry, email),
      );

      if (index === -1) return null;

      entries[index] = {
        ...entries[index],
        ...updates,
        updatedAt: new Date(Date.now() + nextId).toISOString(),
      };
      nextId += 1;
      return { ...entries[index] };
    },

    async deleteJournalEntry(id, email) {
      const index = entries.findIndex(
        (entry) => entry.id === id && matchesScope(entry, email),
      );

      if (index === -1) return null;

      const [deletedEntry] = entries.splice(index, 1);
      return { ...deletedEntry };
    },
  };
}

async function readJson(response) {
  assert.match(response.headers.get('content-type') || '', /application\/json/);
  return response.json();
}

test('application exposes complete CRUD while keeping backend files private', async (t) => {
  const journalService = createInMemoryJournalService();
  const app = createApp({
    journalService,
    publicDirectory: path.join(__dirname, '..', 'public'),
  });
  const server = app.listen(0);
  await once(server, 'listening');

  t.after(async () => {
    server.close();
    await once(server, 'close');
  });

  const address = server.address();
  const baseUrl = `http://127.0.0.1:${address.port}`;
  const entriesUrl = `${baseUrl}/api/entries`;

  const indexResponse = await fetch(`${baseUrl}/`);
  assert.equal(indexResponse.status, 200);
  assert.match(await indexResponse.text(), /Daily Journal/);

  const sourceResponse = await fetch(`${baseUrl}/server.js`);
  assert.equal(sourceResponse.status, 404);

  const corsPreflight = await fetch(entriesUrl, {
    method: 'OPTIONS',
    headers: {
      Origin: 'http://example.test',
      'Access-Control-Request-Method': 'PATCH',
    },
  });
  assert.equal(corsPreflight.status, 204);
  const allowedMethods = corsPreflight.headers.get('access-control-allow-methods') || '';
  assert.match(allowedMethods, /PATCH/);
  assert.match(allowedMethods, /DELETE/);

  const initialGet = await fetch(entriesUrl);
  assert.equal(initialGet.status, 200);
  assert.deepEqual(await readJson(initialGet), []);

  // CREATE: the original required four-field body remains valid.
  const standardPost = await fetch(entriesUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: 'My Day',
      content: 'Today was productive.',
      date: '2026-07-14',
      mood: 'Happy',
    }),
  });
  const standardPostBody = await readJson(standardPost);
  assert.equal(standardPost.status, 201);
  assert.equal(standardPostBody.entry.title, 'My Day');
  assert.equal(standardPostBody.entry.email, '');
  const standardId = standardPostBody.entry.id;

  // UPDATE: PATCH changes supplied fields and preserves the rest.
  const standardPatch = await fetch(`${entriesUrl}/${standardId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: 'My Updated Day',
      mood: 'Focused',
    }),
  });
  const standardPatchBody = await readJson(standardPatch);
  assert.equal(standardPatch.status, 200);
  assert.equal(standardPatchBody.entry.id, standardId);
  assert.equal(standardPatchBody.entry.title, 'My Updated Day');
  assert.equal(standardPatchBody.entry.content, 'Today was productive.');
  assert.equal(standardPatchBody.entry.mood, 'Focused');
  assert.ok(standardPatchBody.entry.updatedAt);

  const invalidPatch = await fetch(`${entriesUrl}/${standardId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  });
  assert.equal(invalidPatch.status, 400);
  assert.match((await readJson(invalidPatch)).error, /at least one field/i);

  // Optional profile scoping remains available without adding auth routes.
  const scopedPost = await fetch(entriesUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: 'Private Profile Entry',
      content: 'Stored for one local profile.',
      date: '2026-07-15',
      mood: 'Focused',
      email: 'Student@Example.com',
    }),
  });
  const scopedPostBody = await readJson(scopedPost);
  assert.equal(scopedPost.status, 201);
  assert.equal(scopedPostBody.entry.email, 'student@example.com');
  const scopedId = scopedPostBody.entry.id;

  const wrongScopePatch = await fetch(`${entriesUrl}/${scopedId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: 'Should Not Update',
      email: 'other@example.com',
    }),
  });
  assert.equal(wrongScopePatch.status, 404);

  const scopedPatch = await fetch(`${entriesUrl}/${scopedId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      content: 'Updated for the same local profile.',
      email: 'student@example.com',
    }),
  });
  const scopedPatchBody = await readJson(scopedPatch);
  assert.equal(scopedPatch.status, 200);
  assert.equal(scopedPatchBody.entry.content, 'Updated for the same local profile.');

  // READ: unscoped and scoped GET both work.
  const allGet = await fetch(entriesUrl);
  const allEntries = await readJson(allGet);
  assert.equal(allGet.status, 200);
  assert.equal(allEntries.length, 2);
  assert.equal(
    allEntries.find((entry) => entry.id === standardId).title,
    'My Updated Day',
  );

  const scopedGet = await fetch(`${entriesUrl}?email=student%40example.com`);
  const scopedEntries = await readJson(scopedGet);
  assert.equal(scopedGet.status, 200);
  assert.equal(scopedEntries.length, 1);
  assert.equal(scopedEntries[0].id, scopedId);

  // DELETE: scope mismatch behaves as not found, matching scope deletes.
  const wrongScopeDelete = await fetch(
    `${entriesUrl}/${scopedId}?email=other%40example.com`,
    { method: 'DELETE' },
  );
  assert.equal(wrongScopeDelete.status, 404);

  const scopedDelete = await fetch(
    `${entriesUrl}/${scopedId}?email=student%40example.com`,
    { method: 'DELETE' },
  );
  const scopedDeleteBody = await readJson(scopedDelete);
  assert.equal(scopedDelete.status, 200);
  assert.equal(scopedDeleteBody.entry.id, scopedId);

  const standardDelete = await fetch(`${entriesUrl}/${standardId}`, {
    method: 'DELETE',
  });
  assert.equal(standardDelete.status, 200);
  assert.equal((await readJson(standardDelete)).entry.id, standardId);

  const repeatedDelete = await fetch(`${entriesUrl}/${standardId}`, {
    method: 'DELETE',
  });
  assert.equal(repeatedDelete.status, 404);

  const finalGet = await fetch(entriesUrl);
  assert.equal(finalGet.status, 200);
  assert.deepEqual(await readJson(finalGet), []);

  const invalidPost = await fetch(entriesUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title: '', content: '', date: '', mood: '' }),
  });
  assert.equal(invalidPost.status, 400);
  assert.match((await readJson(invalidPost)).error, /Missing or empty/);

  const malformedPost = await fetch(entriesUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{bad json',
  });
  assert.equal(malformedPost.status, 400);
  assert.match((await readJson(malformedPost)).error, /invalid JSON/);

  const invalidEmailGet = await fetch(`${entriesUrl}?email=invalid`);
  assert.equal(invalidEmailGet.status, 400);

  const repeatedEmailQuery = await fetch(
    `${entriesUrl}?email=student%40example.com&email=other%40example.com`,
  );
  assert.equal(repeatedEmailQuery.status, 400);
  assert.match((await readJson(repeatedEmailQuery)).error, /single value/i);

  const removedAuthEndpoint = await fetch(`${baseUrl}/api/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'student@example.com', password: 'secret' }),
  });
  assert.equal(removedAuthEndpoint.status, 404);
  assert.deepEqual(await readJson(removedAuthEndpoint), {
    error: 'API endpoint not found.',
  });

  const unsupportedPut = await fetch(`${entriesUrl}/missing-id`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title: 'Unsupported' }),
  });
  assert.equal(unsupportedPut.status, 404);
});

test('database failures return 500 for every CRUD operation', async (t) => {
  const failure = new Error('database unavailable');
  const failingService = {
    async createJournalEntry() { throw failure; },
    async getAllJournalEntries() { throw failure; },
    async updateJournalEntry() { throw failure; },
    async deleteJournalEntry() { throw failure; },
  };
  const app = createApp({
    journalService: failingService,
    publicDirectory: path.join(__dirname, '..', 'public'),
  });
  const server = app.listen(0);
  await once(server, 'listening');

  t.after(async () => {
    server.close();
    await once(server, 'close');
  });

  const address = server.address();
  const entriesUrl = `http://127.0.0.1:${address.port}/api/entries`;

  const getResponse = await fetch(entriesUrl);
  assert.equal(getResponse.status, 500);

  const postResponse = await fetch(entriesUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: 'Valid',
      content: 'Valid content',
      date: '2026-07-16',
      mood: 'Focused',
    }),
  });
  assert.equal(postResponse.status, 500);

  const patchResponse = await fetch(`${entriesUrl}/test-id`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title: 'Updated' }),
  });
  assert.equal(patchResponse.status, 500);

  const deleteResponse = await fetch(`${entriesUrl}/test-id`, {
    method: 'DELETE',
  });
  assert.equal(deleteResponse.status, 500);
});
