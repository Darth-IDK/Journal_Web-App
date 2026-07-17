// Shared mutable application state and constants.

const today = new Date();

export const state = {
    currentEntries: [],
    activeView: 'list',
    authMode: 'login',
    currentUserEmail: null,
    activeEntryId: null,
    editingEntryId: null,
    viewedMonth: today.getMonth(),
    viewedYear: today.getFullYear(),
};

export const API_BASE = '/api/entries';

export const MONTH_NAMES = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
];

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
