'use strict';

/**
 * Express request handlers for the project's two required API endpoints.
 * The routes themselves are registered in journalApi.js.
 */

const {
  createJournalEntry,
  getAllJournalEntries,
} = require('./journalEntriesService');

const MAX_TITLE_LENGTH = 120;
const MAX_CONTENT_LENGTH = 10000;
const MAX_MOOD_LENGTH = 50;

function cleanText(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function isValidCalendarDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

function validateJournalEntry(body) {
  const entry = {
    title: cleanText(body?.title),
    content: cleanText(body?.content),
    date: cleanText(body?.date),
    mood: cleanText(body?.mood),
    email: cleanText(body?.email),
  };

  const missingFields = Object.entries(entry)
    .filter(([, value]) => value.length === 0)
    .map(([field]) => field);

  if (missingFields.length > 0) {
    return {
      error: `Missing or empty field(s): ${missingFields.join(', ')}`,
    };
  }

  if (!isValidCalendarDate(entry.date)) {
    return {
      error: 'date must be a valid calendar date in YYYY-MM-DD format.',
    };
  }

  if (entry.title.length > MAX_TITLE_LENGTH) {
    return {
      error: `title must not exceed ${MAX_TITLE_LENGTH} characters.`,
    };
  }

  if (entry.content.length > MAX_CONTENT_LENGTH) {
    return {
      error: `content must not exceed ${MAX_CONTENT_LENGTH} characters.`,
    };
  }

  if (entry.mood.length > MAX_MOOD_LENGTH) {
    return {
      error: `mood must not exceed ${MAX_MOOD_LENGTH} characters.`,
    };
  }

  return { entry };
}

async function getEntriesHandler(request, response) {
  const email = typeof request.query.email === 'string' ? request.query.email.toLowerCase().trim() : '';

  if (!email) {
    return response.status(400).json({ error: 'email query parameter is required.' });
  }

  try {
    const entries = await getAllJournalEntries(email);
    return response.status(200).json(entries);
  } catch (error) {
    console.error('Failed to retrieve journal entries:', error);
    return response.status(500).json({
      error: 'Unable to retrieve journal entries.',
    });
  }
}

async function createEntryHandler(request, response) {
  const validationResult = validateJournalEntry(request.body);

  if (validationResult.error) {
    return response.status(400).json({
      error: validationResult.error,
    });
  }

  try {
    const entry = await createJournalEntry(validationResult.entry);

    return response.status(201).json({
      message: 'Journal entry created successfully.',
      entry,
    });
  } catch (error) {
    console.error('Failed to create journal entry:', error);
    return response.status(500).json({
      error: 'Unable to create the journal entry.',
    });
  }
}

module.exports = {
  createEntryHandler,
  getEntriesHandler,
  validateJournalEntry,
};
