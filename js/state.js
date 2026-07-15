// Shared, mutable app state and constants.
// Other modules import `state` and read/write its properties directly —
// object references are shared across ES modules, so this acts like a
// single source of truth without needing a global variable.

const today = new Date();

export const state = {
    currentEntries: [],
    activeView: 'list',
    authMode: 'login',
    currentUserEmail: null,
    viewedMonth: today.getMonth(),
    viewedYear: today.getFullYear(),
};

export const API_BASE = '/api/entries';
export const AUTH_API_BASE = '/api';

export const MONTH_NAMES = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
];

// Not wired up to the UI yet — available for whoever adds mood icons to entry cards.
export const MOOD_ICONS = {
    thoughtful: 'moon',
    serene: 'cloud-drizzle',
    inspired: 'sparkles',
    focused: 'target',
    rested: 'coffee',
    balanced: 'book-open',
};

export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const USERS_KEY = 'journalUsers';
export const SESSION_KEY = 'journalCurrentUser';
