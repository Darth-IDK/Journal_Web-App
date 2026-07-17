'use strict';

/**
 * Registers the two core assignment routes plus the two extra-credit CRUD
 * routes. The resulting API supports complete Create, Read, Update, Delete.
 */

const {
  createJournalEntriesHandlers,
} = require('./journalEntriesHandlers');

function registerJournalApi(app, journalService) {
  const requiredAppMethods = ['get', 'post', 'patch', 'delete'];
  const missingMethods = requiredAppMethods.filter(
    (method) => typeof app?.[method] !== 'function',
  );

  if (missingMethods.length > 0) {
    throw new TypeError(
      `registerJournalApi requires an Express application with: ${missingMethods.join(', ')}.`,
    );
  }

  const {
    createEntryHandler,
    deleteEntryHandler,
    getEntriesHandler,
    updateEntryHandler,
  } = createJournalEntriesHandlers(journalService);

  app.get('/api/entries', getEntriesHandler);
  app.post('/api/entries', createEntryHandler);
  app.patch('/api/entries/:id', updateEntryHandler);
  app.delete('/api/entries/:id', deleteEntryHandler);
}

module.exports = {
  registerJournalApi,
};
