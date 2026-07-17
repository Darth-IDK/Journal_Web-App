'use strict';

const path = require('node:path');
const express = require('express');
const cors = require('cors');
const { registerJournalApi } = require('../Firebase/journalApi');

function createApp({
  journalService,
  publicDirectory = path.join(__dirname, '..', 'public'),
} = {}) {
  const app = express();

  app.disable('x-powered-by');

  app.use(cors({
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Accept', 'Content-Type'],
  }));

  app.use(express.json({
    limit: '64kb',
    strict: true,
  }));

  registerJournalApi(app, journalService);

  // Only public browser assets are exposed. Backend source, tests, package
  // metadata, and Firebase modules remain inaccessible over HTTP.
  app.use(express.static(publicDirectory, {
    dotfiles: 'deny',
    extensions: ['html'],
    index: 'index.html',
    redirect: false,
  }));

  // Unknown /api paths receive JSON instead of the HTML application shell.
  app.use('/api', (request, response) => {
    response.status(404).json({ error: 'API endpoint not found.' });
  });

  app.use((error, request, response, next) => {
    if (response.headersSent) {
      return next(error);
    }

    if (
      error instanceof SyntaxError
      && error.status === 400
      && Object.prototype.hasOwnProperty.call(error, 'body')
    ) {
      return response.status(400).json({ error: 'Request body contains invalid JSON.' });
    }

    console.error('Unhandled server error:', error);
    return response.status(500).json({ error: 'Internal server error.' });
  });

  return app;
}

module.exports = {
  createApp,
};
