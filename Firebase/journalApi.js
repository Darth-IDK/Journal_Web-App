'use strict';

/**
 * Registers exactly the two endpoints required by the assignment.
 *
 * Usage in server.js:
 *   const { registerJournalApi } = require('./journalApi');
 *   registerJournalApi(app);
 */

const {
  createEntryHandler,
  getEntriesHandler,
} = require('./journalEntriesHandlers');

function registerJournalApi(app) {
  if (!app || typeof app.get !== 'function' || typeof app.post !== 'function') {
    throw new TypeError('registerJournalApi requires an Express application.');
  }

  app.get('/api/entries', getEntriesHandler);
  app.post('/api/entries', createEntryHandler);
}

module.exports = {
  registerJournalApi,
};
