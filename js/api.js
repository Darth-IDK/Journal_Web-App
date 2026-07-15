// All network calls to the Express/Firestore backend.

import { state, API_BASE, AUTH_API_BASE } from './state.js';

export const fetchRemoteEntries = async () => {
    const url = `${API_BASE}?email=${encodeURIComponent(state.currentUserEmail)}`;
    const response = await fetch(url, { headers: { 'Accept': 'application/json' } });
    if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || 'Remote entries unavailable');
    }
    return response.json();
};

export const postRemoteEntry = async (entry) => {
    const response = await fetch(API_BASE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(entry),
    });
    if (!response.ok) {
        const errorResponse = await response.json().catch(() => ({}));
        throw new Error(errorResponse.error || 'Failed to save remote entry');
    }
    return response.json();
};

export const postRemoteAuth = (path, payload) => fetch(`${AUTH_API_BASE}/${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
});
