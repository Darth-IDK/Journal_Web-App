// Browser-local cache, profile records, and active-session persistence.
// Firestore remains the authoritative journal database whenever the API is online.

import { state, USERS_KEY, SESSION_KEY } from './state.js';
import { generateId } from './utils.js';

const safeParse = (rawValue, fallback) => {
    if (!rawValue) return fallback;

    try {
        return JSON.parse(rawValue);
    } catch (error) {
        console.warn('Ignoring corrupted local storage data:', error);
        return fallback;
    }
};

const entriesKey = (email = state.currentUserEmail) => `journalEntries:${email || 'guest'}`;

const normalizeEntryArray = (value) => {
    if (!Array.isArray(value)) return [];

    return value
        .filter((entry) => entry && typeof entry === 'object')
        .map((entry) => ({
            ...entry,
            id: entry.id || generateId(),
        }));
};

export const getLocalEntries = (email = state.currentUserEmail) => {
    const key = entriesKey(email);
    const stored = safeParse(localStorage.getItem(key), []);
    const entries = normalizeEntryArray(stored);

    if (JSON.stringify(entries) !== JSON.stringify(stored)) {
        localStorage.setItem(key, JSON.stringify(entries));
    }

    return entries;
};

export const replaceLocalEntries = (entries, email = state.currentUserEmail) => {
    const normalizedEntries = normalizeEntryArray(entries);
    localStorage.setItem(entriesKey(email), JSON.stringify(normalizedEntries));
};

export const saveLocalEntry = (entry, email = state.currentUserEmail) => {
    const entries = getLocalEntries(email);
    const entryId = String(entry.id || generateId());
    const normalizedEntry = { ...entry, id: entryId };
    const withoutDuplicate = entries.filter(
        (candidate) => String(candidate.id) !== entryId,
    );

    localStorage.setItem(
        entriesKey(email),
        JSON.stringify([normalizedEntry, ...withoutDuplicate]),
    );
};

export const removeLocalEntry = (id, email = state.currentUserEmail) => {
    const entryId = String(id ?? '');
    const remainingEntries = getLocalEntries(email).filter(
        (candidate) => String(candidate.id) !== entryId,
    );

    localStorage.setItem(entriesKey(email), JSON.stringify(remainingEntries));
};

export const getUsers = () => {
    const users = safeParse(localStorage.getItem(USERS_KEY), []);
    return Array.isArray(users)
        ? users.filter((user) => user && typeof user.email === 'string')
        : [];
};

export const saveUsers = (users) => {
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
};

export const getSession = () => localStorage.getItem(SESSION_KEY);
export const setSession = (email) => localStorage.setItem(SESSION_KEY, email);
export const clearSession = () => localStorage.removeItem(SESSION_KEY);
