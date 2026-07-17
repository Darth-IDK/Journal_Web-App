# Daily Journal

Daily Journal is a full-stack web app for keeping a personal journal. Entries have a title, date, mood, and written content, and can be browsed as a list or on a calendar, opened for full-screen reading, edited, or deleted. An Express API backs the browser, and Cloud Firestore stores entries permanently.

## Features

- List and calendar views of journal entries, with a full-screen detail page for each one
- Full CRUD: create, read, update, and delete entries, with an in-app delete confirmation
- Mood tagging with icon badges on each entry
- A lightweight local-profile login/sign-up screen, so multiple people sharing a browser get separate journals
- Responsive, accessible UI (ARIA roles/labels, keyboard navigation) with a dark, purple-accented design
- Falls back to a per-profile local cache for viewing entries if the API is temporarily unreachable; Firestore is always the source of truth

## Tech stack

- **Frontend:** vanilla JavaScript (native ES modules), HTML, CSS — no framework or build step
- **Backend:** Node.js + Express
- **Database:** Google Cloud Firestore

## Project structure

```text
Journal_Web-App/
├── public/                  # Everything served to the browser
│   ├── index.html
│   ├── style.css
│   ├── app.js               # Entry point (ES module)
│   └── js/                  # Feature-scoped modules (auth, entries, calendar, ...)
├── src/
│   └── createApp.js         # Express app factory
├── Firebase/                # Firestore access layer + standalone test scripts
├── tests/                   # Automated tests (no credentials required)
├── scripts/
│   └── check-syntax.js      # Syntax, import, and credential-leak checks
├── server.js                # Entry point — verifies Firestore, then starts Express
├── package.json
└── .gitignore
```

Only `public/` is served over HTTP. Backend source, tests, and Firebase modules are not reachable from the browser.

## API reference

| Operation | Method | Endpoint | Purpose | Success |
|---|---|---|---|---|
| Create | `POST` | `/api/entries` | Add a journal entry | `201` |
| Read | `GET` | `/api/entries` | Retrieve journal entries | `200` |
| Update | `PATCH` | `/api/entries/:id` | Update one or more entry fields | `200` |
| Delete | `DELETE` | `/api/entries/:id` | Permanently delete an entry | `200` |

Validation failures return `400`, missing entries return `404`, and Firestore or unexpected server failures return `500`.

**Create** — the four required fields:

```json
{
  "title": "My Day",
  "content": "Today was productive.",
  "date": "2026-07-14",
  "mood": "Happy"
}
```

An optional `email` field scopes the entry to a local profile, so different browser profiles see separate journals.

**Update** — `PATCH` accepts any nonempty subset of `title`, `content`, `date`, and `mood`:

```json
{
  "title": "My Updated Day",
  "mood": "Focused"
}
```

**Delete:**

```text
DELETE /api/entries/<document-id>
```

An optional `?email=` query parameter scopes the deletion to a profile. A missing document or profile mismatch both return `404`, without revealing whether another profile owns the document.

## Getting started

### Prerequisites

- Node.js 22 or newer, and npm
- A Firebase project with Cloud Firestore enabled
- A Firebase Admin service-account JSON key, saved **outside this repository**

### 1. Install dependencies

```bash
npm install
```

### 2. Provide Firebase credentials

Point the `GOOGLE_APPLICATION_CREDENTIALS` environment variable at your service-account key file. This is set at launch time — the path never appears in code or in the repo.

macOS/Linux:

```bash
export GOOGLE_APPLICATION_CREDENTIALS=/absolute/path/to/service-account-key.json
```

Windows (Command Prompt):

```cmd
set "GOOGLE_APPLICATION_CREDENTIALS=C:\full\path\service-account-key.json"
```

### 3. Start the server

```bash
npm start
```

The server verifies its Firestore connection before it starts listening — if credentials are missing or invalid, it fails fast with a clear error instead of silently falling back to fake data. On success:

```text
Firebase Firestore connection verified.
Firebase Firestore endpoints loaded successfully.
Server running at http://localhost:3000
```

Open `http://localhost:3000` in a browser (set a `PORT` environment variable to use a different port). Don't open `public/index.html` directly — the frontend expects the API to be reachable at the same origin.

## Testing

```bash
npm run check          # Syntax, import, HTML-id, and credential-leak checks — no Firebase needed
npm test               # Unit/contract tests — no Firebase needed
npm run test:firestore # Confirms a live Firestore connection and basic CRUD
npm run test:api       # End-to-end CRUD test against a running server (needs `npm start` in another terminal)
npm run test:persistence -- <document-id>  # Confirms a document survives a server restart
```

## Authentication note

The login/sign-up screen is a browser-local profile gate, not a production authentication system. Passwords are PBKDF2-hashed before being stored in the browser, but the server does not issue sessions or authorize access by email — it's meant to let multiple people share a browser with separate journals, not to secure data against a determined attacker. Real authentication would require Firebase Authentication (or another identity provider) plus server-side authorization.

## How it works

- Firestore is the source of truth; the browser's local cache is only used to keep showing entries if the API is briefly unreachable.
- Creating or editing an entry enforces a maximum of three entries per journal date; editing an entry doesn't count against itself.
- Deleting requires an in-app confirmation, and the local cache is only updated after Firestore confirms the delete succeeded.
- Updates set an `updatedAt` server timestamp while preserving the original `createdAt`.
- The server does not fall back to in-memory storage if Firestore is unreachable — it fails startup visibly instead.
- Reads that filter by profile email sort results in application code rather than in a Firestore query, to avoid requiring a composite index for a small project like this.
