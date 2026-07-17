// All network calls to the Express/Firestore backend.

import { state, API_BASE } from './state.js';

const REQUEST_TIMEOUT_MS = 12000;

const requestJson = async (url, options = {}) => {
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
        const response = await fetch(url, {
            ...options,
            signal: controller.signal,
            headers: {
                Accept: 'application/json',
                ...(options.headers || {}),
            },
        });

        const contentType = response.headers.get('content-type') || '';
        const payload = contentType.includes('application/json')
            ? await response.json()
            : null;

        if (!response.ok) {
            throw new Error(payload?.error || `Request failed with status ${response.status}.`);
        }

        return payload;
    } catch (error) {
        if (error.name === 'AbortError') {
            throw new Error('The server request timed out.');
        }
        throw error;
    } finally {
        window.clearTimeout(timeoutId);
    }
};

const entryUrl = (id) => `${API_BASE}/${encodeURIComponent(String(id))}`;

const toEntryPayload = (entry) => {
    const payload = {
        title: entry.title,
        content: entry.content,
        date: entry.date,
        mood: entry.mood,
    };

    if (entry.email) {
        payload.email = entry.email;
    }

    return payload;
};

export const fetchRemoteEntries = async (email = state.currentUserEmail) => {
    const query = email ? `?email=${encodeURIComponent(email)}` : '';
    const entries = await requestJson(`${API_BASE}${query}`, {
        method: 'GET',
        cache: 'no-store',
    });

    if (!Array.isArray(entries)) {
        throw new Error('The server returned an invalid journal-entry list.');
    }

    return entries;
};

export const postRemoteEntry = async (entry) => requestJson(API_BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(toEntryPayload(entry)),
});

export const patchRemoteEntry = async (id, entry) => requestJson(entryUrl(id), {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(toEntryPayload(entry)),
});

export const deleteRemoteEntry = async (id, email = state.currentUserEmail) => {
    const query = email ? `?email=${encodeURIComponent(email)}` : '';

    return requestJson(`${entryUrl(id)}${query}`, {
        method: 'DELETE',
    });
};
