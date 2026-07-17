// Small, pure helper functions with no DOM or state dependencies.

export const normalize = (value) => (
    typeof value === 'string' ? value.trim() : ''
);

export const generateId = () => (window.crypto?.randomUUID)
    ? window.crypto.randomUUID()
    : `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

export const escapeHtml = (value) => String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

export const toLocalDateInputValue = (date = new Date()) => {
    const localTime = new Date(date.getTime() - (date.getTimezoneOffset() * 60000));
    return localTime.toISOString().slice(0, 10);
};

export const capitalize = (value) => {
    const text = normalize(String(value ?? '')).toLowerCase();
    return text ? text.charAt(0).toUpperCase() + text.slice(1) : '';
};

export const sortEntries = (entries) => entries.slice().sort((left, right) => {
    const dateComparison = String(right.date || '').localeCompare(String(left.date || ''));
    if (dateComparison !== 0) return dateComparison;

    const createdAtComparison = String(right.createdAt || '')
        .localeCompare(String(left.createdAt || ''));
    if (createdAtComparison !== 0) return createdAtComparison;

    return String(right.id || '').localeCompare(String(left.id || ''));
});
