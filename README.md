# Daily Journal

Daily Journal is a full-stack web application that lets users create, read, update, and delete journal entries containing a title, date, mood, and written content. The browser communicates with an Express API, and Cloud Firestore stores the entries permanently for the list, calendar, detail, edit, and delete flows.

## Core requirements and extra credit

The original assignment requires the first two routes. The extra-credit CRUD implementation adds the final two routes:

| Operation | Method | Endpoint | Purpose | Success |
|---|---|---|---|---|
| Create | `POST` | `/api/entries` | Add a journal entry | `201` |
| Read | `GET` | `/api/entries` | Retrieve journal entries | `200` |
| Update | `PATCH` | `/api/entries/:id` | Update one or more entry fields | `200` |
| Delete | `DELETE` | `/api/entries/:id` | Permanently delete an entry | `200` |

Validation failures return `400`, missing entries return `404`, and Firestore or unexpected server failures return `500`.

### Create request

The required four-field POST body is accepted exactly as specified:

```json
{
  "title": "My Day",
  "content": "Today was productive.",
  "date": "2026-07-14",
  "mood": "Happy"
}
```

The existing interface may also send an optional `email` field so local profiles see separate journal lists.

### Update request

`PATCH` accepts any nonempty subset of `title`, `content`, `date`, and `mood`:

```json
{
  "title": "My Updated Day",
  "mood": "Focused"
}
```

The browser also sends its optional profile email. Email is used only as a scope check and is not changed by PATCH.

### Delete request

```text
DELETE /api/entries/<document-id>
```

The browser appends `?email=user@example.com` when a local profile is active. A missing document or profile mismatch returns `404` without revealing whether another profile owns the document.

## Authentication note

The login/sign-up screen is retained as a browser-local profile gate so the original interface and account-separated experience remain intact. Passwords are PBKDF2-hashed before being stored in the browser, but this is not production authentication: the server does not issue sessions or authorize email access. Production use would require Firebase Authentication or another identity provider plus server-side authorization.

## Project structure

```text
Journal_Web-App-main/
├── public/
│   ├── index.html
│   ├── style.css
│   ├── app.js
│   └── js/
├── Firebase/
│   ├── firebase.js
│   ├── journalApi.js
│   ├── journalEntryValidation.js
│   ├── journalEntriesHandlers.js
│   ├── journalEntriesService.js
│   ├── test-api.js
│   ├── test-firestore.js
│   └── test-persistence.js
├── src/
│   └── createApp.js
├── tests/
├── scripts/
├── server.js
├── package.json
├── README.md
└── .gitignore
```

Only `public/` is exposed by Express. Backend source files, tests, package metadata, and Firebase modules are not served to the browser.

## Prerequisites

- Node.js 22 or newer
- npm
- A Firebase project with Cloud Firestore enabled
- A Firebase Admin service-account JSON key stored **outside** this repository

## Installation and code-only checks

From the project root:

```cmd
npm install
npm run check
npm test
```

These checks do not require Firebase credentials. They validate JavaScript syntax, browser imports, local assets, duplicate HTML IDs, credential leaks, the four CRUD route registrations, input validation, CORS, and the in-memory API contract.

## Firebase Admin credentials on Windows Command Prompt

Set the credential only in the terminal that will run the server. Replace the example with the real absolute path; never paste the JSON contents into source code.

```cmd
set "GOOGLE_APPLICATION_CREDENTIALS=C:\full\path\service-account-key.json"
```

Verify that the file exists without displaying its contents:

```cmd
if exist "%GOOGLE_APPLICATION_CREDENTIALS%" (echo CREDENTIAL_FILE_FOUND) else (echo CREDENTIAL_FILE_NOT_FOUND)
```

The service-account file must remain outside `public/`, outside screenshots, and outside Git/GitHub.

## Firestore connection test

```cmd
npm run test:firestore
```

A successful result ends with:

```text
Firestore connection test passed.
```

The first successful write creates the `journalEntries` collection automatically if it does not already exist.

## Start the application

```cmd
npm start
```

The server verifies Firestore before opening port 3000. Successful startup includes:

```text
Firebase Firestore connection verified.
Firebase Firestore endpoints loaded successfully.
Server running at http://localhost:3000
```

Open `http://localhost:3000` in a browser. Do not open `public/index.html` directly because the frontend API calls require the Express server.

## Complete CRUD API test

With the server running in one terminal, use another terminal in the same project folder:

```cmd
npm run test:api
```

The test verifies:

- successful POST with status `201`
- successful GET with status `200`
- invalid POST with status `400`
- successful PATCH with status `200`
- invalid PATCH with status `400`
- GET returning the updated Firestore document
- successful DELETE with status `200`
- GET confirming that the deleted document is gone

The test creates one persistent document and a second temporary CRUD document. The temporary document is updated and deleted; the first document remains and produces:

```text
PERSISTENCE_ID=<document-id>
```

## Permanent-storage verification

Restart the Express server, then run:

```cmd
npm run test:persistence -- <document-id>
```

A successful result ends with:

```text
Firestore persistence test passed.
```

## Browser CRUD flow

1. Sign up or log in through the existing local-profile screen.
2. Create an entry with the floating add button.
3. Open the saved card to view its detail page.
4. Select **Edit**, change one or more fields, and save.
5. Open **Delete**, review the confirmation, and permanently remove the entry.
6. Confirm that list and calendar views refresh after each operation.

The edit and delete controls use the existing dark-purple design system. No original view or layout was removed.

## Final evidence checklist

Capture screenshots only after the corresponding success result is visible:

1. `npm run test:firestore` ending in `Firestore connection test passed.`
2. Firebase Console showing `(default)`, `journalEntries`, and the Firestore fields.
3. `npm run test:api` showing POST `201`.
4. The same test showing GET `200`.
5. The same test showing invalid POST `400`.
6. The same test showing PATCH `200` and the GET update confirmation.
7. The same test showing DELETE `200` and the GET deletion confirmation.
8. Browser interface showing a saved journal card.
9. Browser detail page showing the Edit and Delete controls.
10. Browser showing a successfully edited entry.
11. `npm run test:persistence -- <document-id>` after restarting the server.

Do not include the service-account filename, path, private key, browser Downloads page, or JSON contents in screenshots.

## Design, data, and reliability notes

- The original visual theme, login screen, list view, calendar view, entry detail page, modal, mood cards, and responsive CSS are preserved.
- Firestore is authoritative; localStorage is only a per-profile browser cache for temporary offline viewing.
- Create and edit enforce the existing maximum of three entries per journal date; editing an entry does not count the entry against itself.
- Delete uses an in-app confirmation dialog and does not remove the local cache unless Firestore confirms success.
- Firestore updates use `updatedAt` server timestamps while preserving the original `createdAt` timestamp.
- The server does not silently fall back to in-memory storage. If Firestore authentication or connectivity fails, startup fails visibly instead of pretending data is permanent.
- Email filtering is performed without combining a Firestore `where` with `orderBy`, avoiding a composite-index requirement for this small class project.
