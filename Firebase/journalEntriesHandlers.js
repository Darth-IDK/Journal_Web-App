'use strict';

/**
 * Express handlers for the Daily Journal API.
 *
 * Core assignment routes:
 *   GET    /api/entries
 *   POST   /api/entries
 *
 * Extra-credit CRUD routes:
 *   PATCH  /api/entries/:id
 *   DELETE /api/entries/:id
 *
 * The optional email query/body field preserves the existing account-scoped
 * journal experience. It is a profile filter, not production authorization.
 */

const {
  validateEntryId,
  validateJournalEntry,
  validateJournalEntryPatch,
  validateOptionalEmail,
} = require('./journalEntryValidation');

function assertJournalService(service) {
  const requiredMethods = [
    'createJournalEntry',
    'deleteJournalEntry',
    'getAllJournalEntries',
    'updateJournalEntry',
  ];

  const missingMethods = requiredMethods.filter(
    (method) => typeof service?.[method] !== 'function',
  );

  if (missingMethods.length > 0) {
    throw new TypeError(
      `Journal service is missing required method(s): ${missingMethods.join(', ')}.`,
    );
  }
}


function readOptionalEmailQuery(request) {
  const rawEmail = request.query.email;

  if (rawEmail === undefined) {
    return { email: '' };
  }

  if (typeof rawEmail !== 'string') {
    return { error: 'email query parameter must be a single value.' };
  }

  return validateOptionalEmail(rawEmail);
}

function createJournalEntriesHandlers(service) {
  assertJournalService(service);

  async function getEntriesHandler(request, response) {
    const emailResult = readOptionalEmailQuery(request);

    if (emailResult.error) {
      return response.status(400).json({ error: emailResult.error });
    }

    try {
      const entries = await service.getAllJournalEntries(
        emailResult.email || undefined,
      );

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
      const entry = await service.createJournalEntry(validationResult.entry);

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

  async function updateEntryHandler(request, response) {
    const idResult = validateEntryId(request.params.id);
    if (idResult.error) {
      return response.status(400).json({ error: idResult.error });
    }

    const validationResult = validateJournalEntryPatch(request.body);
    if (validationResult.error) {
      return response.status(400).json({ error: validationResult.error });
    }

    try {
      const entry = await service.updateJournalEntry(
        idResult.id,
        validationResult.updates,
        validationResult.email || undefined,
      );

      if (!entry) {
        return response.status(404).json({
          error: 'Journal entry not found.',
        });
      }

      return response.status(200).json({
        message: 'Journal entry updated successfully.',
        entry,
      });
    } catch (error) {
      console.error('Failed to update journal entry:', error);

      return response.status(500).json({
        error: 'Unable to update the journal entry.',
      });
    }
  }

  async function deleteEntryHandler(request, response) {
    const idResult = validateEntryId(request.params.id);
    if (idResult.error) {
      return response.status(400).json({ error: idResult.error });
    }

    const emailResult = readOptionalEmailQuery(request);

    if (emailResult.error) {
      return response.status(400).json({ error: emailResult.error });
    }

    try {
      const entry = await service.deleteJournalEntry(
        idResult.id,
        emailResult.email || undefined,
      );

      if (!entry) {
        return response.status(404).json({
          error: 'Journal entry not found.',
        });
      }

      return response.status(200).json({
        message: 'Journal entry deleted successfully.',
        entry,
      });
    } catch (error) {
      console.error('Failed to delete journal entry:', error);

      return response.status(500).json({
        error: 'Unable to delete the journal entry.',
      });
    }
  }

  return {
    createEntryHandler,
    deleteEntryHandler,
    getEntriesHandler,
    updateEntryHandler,
  };
}

module.exports = {
  createJournalEntriesHandlers,
};
