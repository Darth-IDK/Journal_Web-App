'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  MAX_CONTENT_LENGTH,
  MAX_MOOD_LENGTH,
  MAX_TITLE_LENGTH,
  isValidCalendarDate,
  validateEntryId,
  validateJournalEntry,
  validateJournalEntryPatch,
  validateOptionalEmail,
} = require('../Firebase/journalEntryValidation');

test('the required four-field journal body is accepted without email', () => {
  const result = validateJournalEntry({
    title: ' My Day ',
    content: ' Productive work. ',
    date: '2026-07-14',
    mood: ' Happy ',
  });

  assert.deepEqual(result, {
    entry: {
      email: '',
      title: 'My Day',
      content: 'Productive work.',
      date: '2026-07-14',
      mood: 'Happy',
    },
  });
});

test('optional email is normalized and validated', () => {
  assert.deepEqual(validateOptionalEmail(' Student@Example.COM '), {
    email: 'student@example.com',
  });

  assert.match(validateOptionalEmail('not-an-email').error, /valid email/i);
});

test('missing and empty required fields return a validation error', () => {
  const result = validateJournalEntry({
    title: ' ',
    content: '',
    date: '',
    mood: '',
  });

  assert.match(result.error, /title, content, date, mood/);
});

test('invalid calendar dates are rejected', () => {
  assert.equal(isValidCalendarDate('2024-02-29'), true);
  assert.equal(isValidCalendarDate('2025-02-29'), false);
  assert.equal(isValidCalendarDate('2026-13-01'), false);
  assert.equal(isValidCalendarDate('16-07-2026'), false);
});

test('request body must be a JSON object', () => {
  assert.match(validateJournalEntry(null).error, /JSON object/);
  assert.match(validateJournalEntry([]).error, /JSON object/);
  assert.match(validateJournalEntryPatch(null).error, /JSON object/);
  assert.match(validateJournalEntryPatch([]).error, /JSON object/);
});

test('length limits match the browser form and API contract', () => {
  const base = {
    title: 'Title',
    content: 'Content',
    date: '2026-07-14',
    mood: 'Happy',
  };

  assert.match(
    validateJournalEntry({ ...base, title: 'x'.repeat(MAX_TITLE_LENGTH + 1) }).error,
    /title must not exceed/,
  );
  assert.match(
    validateJournalEntry({ ...base, content: 'x'.repeat(MAX_CONTENT_LENGTH + 1) }).error,
    /content must not exceed/,
  );
  assert.match(
    validateJournalEntry({ ...base, mood: 'x'.repeat(MAX_MOOD_LENGTH + 1) }).error,
    /mood must not exceed/,
  );
});

test('PATCH validation accepts partial journal updates and optional scope email', () => {
  assert.deepEqual(
    validateJournalEntryPatch({
      title: ' Revised title ',
      mood: ' Focused ',
      email: ' Student@Example.com ',
    }),
    {
      updates: {
        title: 'Revised title',
        mood: 'Focused',
      },
      email: 'student@example.com',
    },
  );
});

test('PATCH validation rejects empty, invalid, and no-op updates', () => {
  assert.match(validateJournalEntryPatch({}).error, /at least one field/i);
  assert.match(validateJournalEntryPatch({ email: 'student@example.com' }).error, /at least one field/i);
  assert.match(validateJournalEntryPatch({ title: ' ' }).error, /cannot be empty/i);
  assert.match(validateJournalEntryPatch({ date: '2025-02-29' }).error, /valid calendar date/i);
  assert.match(
    validateJournalEntryPatch({ title: 'Updated', email: 'invalid' }).error,
    /valid email/i,
  );
});

test('Firestore document ids are validated before update or delete', () => {
  assert.deepEqual(validateEntryId(' entry-123 '), { id: 'entry-123' });
  assert.match(validateEntryId('').error, /required/i);
  assert.match(validateEntryId('nested/path').error, /invalid/i);
});
