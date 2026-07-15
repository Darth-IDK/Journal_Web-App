// localStorage-backed persistence: journal entries (per account), accounts,
// and the active session. This is the "offline database" the app falls
// back to whenever the Express/Firestore API isn't reachable.

import { state, USERS_KEY, SESSION_KEY } from './state.js';
import { generateId } from './utils.js';

const entriesKey = () => `journalEntries:${state.currentUserEmail}`;

export const getLocalEntries = () => {
    const entries = JSON.parse(localStorage.getItem(entriesKey())) || [];
    let backfilled = false;
    entries.forEach((entry) => {
        if (!entry.id) {
            entry.id = generateId();
            backfilled = true;
        }
    });
    if (backfilled) localStorage.setItem(entriesKey(), JSON.stringify(entries));
    return entries;
};

export const saveLocalEntry = (entry) => {
    const entries = getLocalEntries();
    entries.unshift(entry);
    localStorage.setItem(entriesKey(), JSON.stringify(entries));
};

export const getUsers = () => JSON.parse(localStorage.getItem(USERS_KEY)) || [];
export const saveUsers = (users) => localStorage.setItem(USERS_KEY, JSON.stringify(users));

export const getSession = () => localStorage.getItem(SESSION_KEY);
export const setSession = (email) => localStorage.setItem(SESSION_KEY, email);
export const clearSession = () => localStorage.removeItem(SESSION_KEY);
