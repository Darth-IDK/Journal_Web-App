'use strict';

/**
 * End-to-end test for the project's two Express endpoints.
 * Start the Express server first, then run: node test-api.js
 * Override the server URL with BASE_URL when necessary.
 */

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const ENTRIES_URL = `${BASE_URL}/api/entries`;

async function readJson(response) {
  const contentType = response.headers.get('content-type') || '';

  if (!contentType.includes('application/json')) {
    const text = await response.text();
    throw new Error(`Expected JSON but received: ${text.slice(0, 200)}`);
  }

  return response.json();
}

async function runApiTests() {
  const today = new Date().toISOString().slice(0, 10);

  console.log(`Testing POST ${ENTRIES_URL}`);
  const postResponse = await fetch(ENTRIES_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      title: 'API Integration Test',
      content: 'This entry was created through the Express POST endpoint.',
      date: today,
      mood: 'Happy',
    }),
  });
  const postBody = await readJson(postResponse);

  if (postResponse.status !== 201) {
    throw new Error(`POST failed with ${postResponse.status}: ${JSON.stringify(postBody)}`);
  }

  console.log('POST passed:', postBody);

  console.log(`Testing GET ${ENTRIES_URL}`);
  const getResponse = await fetch(ENTRIES_URL);
  const getBody = await readJson(getResponse);

  if (getResponse.status !== 200 || !Array.isArray(getBody)) {
    throw new Error(`GET failed with ${getResponse.status}: ${JSON.stringify(getBody)}`);
  }

  const createdId = postBody.entry?.id;
  const wasReturned = getBody.some((entry) => entry.id === createdId);

  if (!wasReturned) {
    throw new Error('GET did not return the entry created by POST.');
  }

  console.log(`GET passed and returned ${getBody.length} entry/entries.`);

  console.log('Testing POST validation with empty fields...');
  const invalidResponse = await fetch(ENTRIES_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      title: '',
      content: '',
      date: '',
      mood: '',
    }),
  });
  const invalidBody = await readJson(invalidResponse);

  if (invalidResponse.status !== 400) {
    throw new Error(
      `Validation test expected 400 but received ${invalidResponse.status}: ${JSON.stringify(invalidBody)}`,
    );
  }

  console.log('Validation test passed:', invalidBody);
  console.log('All API tests passed.');
}

runApiTests().catch((error) => {
  console.error('API test failed:', error);
  process.exitCode = 1;
});
