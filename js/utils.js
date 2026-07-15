// Small, pure helper functions with no DOM or state dependencies.

export const normalize = (value) => value.trim();

export const generateId = () => (window.crypto?.randomUUID)
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

export const escapeHtml = (value) => String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

export const sortEntries = (entries) => entries.slice().sort((a, b) => b.date.localeCompare(a.date));
