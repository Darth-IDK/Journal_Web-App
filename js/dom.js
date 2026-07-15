// All DOM element lookups, in one place, so every other module imports
// the same references instead of re-querying the document.
// Safe to run at module top level (not wrapped in DOMContentLoaded) because
// `type="module"` scripts are deferred and only run after the HTML is parsed.

export const journalForm = document.getElementById('journalForm');
export const entriesContainer = document.getElementById('entriesContainer');
export const message = document.getElementById('message');
export const dateInput = document.getElementById('date');
export const todayButton = document.getElementById('todayButton');
export const addEntryButton = document.getElementById('addEntryButton');
export const entryModal = document.getElementById('entryModal');
export const modalClose = document.getElementById('modalClose');
export const emptyStateCta = document.getElementById('emptyStateCta');
export const tabNav = document.querySelector('.tab-nav');
export const tabButtons = document.querySelectorAll('.tab-button');
export const listView = document.getElementById('listView');
export const calendarView = document.getElementById('calendarView');
export const emptyState = document.getElementById('emptyState');
export const calendarGrid = document.getElementById('calendarGrid');
export const monthLabel = document.getElementById('monthLabel');
export const authScreen = document.getElementById('authScreen');
export const appRoot = document.getElementById('appRoot');
export const authForm = document.getElementById('authForm');
export const authEmail = document.getElementById('authEmail');
export const authPassword = document.getElementById('authPassword');
export const authConfirmField = document.getElementById('authConfirmField');
export const authConfirmPassword = document.getElementById('authConfirmPassword');
export const authError = document.getElementById('authError');
export const authSubmit = document.getElementById('authSubmit');
export const authToggleButtons = document.querySelectorAll('.auth-toggle-button');
export const logoutButton = document.getElementById('logoutButton');
export const appSection = document.getElementById('appSection');
export const entryDetailView = document.getElementById('entryDetailView');
export const detailBackButton = document.getElementById('detailBackButton');
export const detailTitle = document.getElementById('detailTitle');
export const detailDate = document.getElementById('detailDate');
export const detailMood = document.getElementById('detailMood');
export const detailContent = document.getElementById('detailContent');
export const prevMonthButton = document.getElementById('prevMonthButton');
export const nextMonthButton = document.getElementById('nextMonthButton');
