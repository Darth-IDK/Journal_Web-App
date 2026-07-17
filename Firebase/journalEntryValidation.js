'use strict';

/**
 * Pure validation and normalization helpers for journal API input.
 * This module has no Firebase or Express dependencies, which makes it
 * straightforward to test independently.
 */

const MAX_TITLE_LENGTH = 120;
const MAX_CONTENT_LENGTH = 10000;
const MAX_MOOD_LENGTH = 50;
const MAX_EMAIL_LENGTH = 254;
const MAX_ENTRY_ID_BYTES = 1500;

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MUTABLE_ENTRY_FIELDS = ['title', 'content', 'date', 'mood'];

function cleanText(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeEmail(value) {
  return cleanText(value).toLowerCase();
}

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function isValidCalendarDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));

  return (
    date.getUTCFullYear() === year
    && date.getUTCMonth() === month - 1
    && date.getUTCDate() === day
  );
}

function validateOptionalEmail(value) {
  const email = normalizeEmail(value);

  if (!email) {
    return { email: '' };
  }

  if (email.length > MAX_EMAIL_LENGTH || !EMAIL_REGEX.test(email)) {
    return { error: 'email must be a valid email address when provided.' };
  }

  return { email };
}

function validateEntryId(value) {
  const id = cleanText(value);

  if (!id) {
    return { error: 'Journal entry id is required.' };
  }

  // These values are unsafe or invalid for a single Firestore document id.
  if (
    id === '.'
    || id === '..'
    || id.includes('/')
    || id.includes('\\')
    || id.includes('\0')
    || Buffer.byteLength(id, 'utf8') > MAX_ENTRY_ID_BYTES
  ) {
    return { error: 'Journal entry id is invalid.' };
  }

  return { id };
}

function validateEntryField(field, value) {
  const normalizedValue = cleanText(value);

  if (!normalizedValue) {
    return { error: `${field} cannot be empty.` };
  }

  if (field === 'title' && normalizedValue.length > MAX_TITLE_LENGTH) {
    return {
      error: `title must not exceed ${MAX_TITLE_LENGTH} characters.`,
    };
  }

  if (field === 'content' && normalizedValue.length > MAX_CONTENT_LENGTH) {
    return {
      error: `content must not exceed ${MAX_CONTENT_LENGTH} characters.`,
    };
  }

  if (field === 'mood' && normalizedValue.length > MAX_MOOD_LENGTH) {
    return {
      error: `mood must not exceed ${MAX_MOOD_LENGTH} characters.`,
    };
  }

  if (field === 'date' && !isValidCalendarDate(normalizedValue)) {
    return {
      error: 'date must be a valid calendar date in YYYY-MM-DD format.',
    };
  }

  return { value: normalizedValue };
}

function validateJournalEntry(body) {
  if (!isPlainObject(body)) {
    return { error: 'Request body must be a JSON object.' };
  }

  const emailResult = validateOptionalEmail(body.email);
  if (emailResult.error) {
    return emailResult;
  }

  const cleanedFields = Object.fromEntries(
    MUTABLE_ENTRY_FIELDS.map((field) => [field, cleanText(body[field])]),
  );
  const missingFields = MUTABLE_ENTRY_FIELDS.filter(
    (field) => !cleanedFields[field],
  );

  if (missingFields.length > 0) {
    return {
      error: `Missing or empty field(s): ${missingFields.join(', ')}`,
    };
  }

  const entry = { email: emailResult.email };

  for (const field of MUTABLE_ENTRY_FIELDS) {
    const result = validateEntryField(field, cleanedFields[field]);
    if (result.error) {
      return { error: result.error };
    }
    entry[field] = result.value;
  }

  return { entry };
}

/**
 * Validates a PATCH body. At least one journal field must be present.
 * `email` is accepted only as an optional profile-scope check and is not
 * treated as an editable journal field.
 */
function validateJournalEntryPatch(body) {
  if (!isPlainObject(body)) {
    return { error: 'Request body must be a JSON object.' };
  }

  const emailResult = validateOptionalEmail(body.email);
  if (emailResult.error) {
    return emailResult;
  }

  const updates = {};

  for (const field of MUTABLE_ENTRY_FIELDS) {
    if (!Object.prototype.hasOwnProperty.call(body, field)) {
      continue;
    }

    const result = validateEntryField(field, body[field]);
    if (result.error) {
      return { error: result.error };
    }

    updates[field] = result.value;
  }

  if (Object.keys(updates).length === 0) {
    return {
      error: 'Provide at least one field to update: title, content, date, or mood.',
    };
  }

  return {
    updates,
    email: emailResult.email,
  };
}

module.exports = {
  EMAIL_REGEX,
  MAX_CONTENT_LENGTH,
  MAX_ENTRY_ID_BYTES,
  MAX_EMAIL_LENGTH,
  MAX_MOOD_LENGTH,
  MAX_TITLE_LENGTH,
  MUTABLE_ENTRY_FIELDS,
  cleanText,
  isValidCalendarDate,
  normalizeEmail,
  validateEntryId,
  validateJournalEntry,
  validateJournalEntryPatch,
  validateOptionalEmail,
};
