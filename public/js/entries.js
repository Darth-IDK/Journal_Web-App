// Loading and rendering journal entries. Firestore is authoritative; the
// browser cache is used only when the API cannot be reached.

import { state, MOOD_ICONS } from './state.js';
import { entriesContainer } from './dom.js';
import { capitalize, escapeHtml, sortEntries } from './utils.js';
import { getLocalEntries, replaceLocalEntries } from './storage.js';
import { fetchRemoteEntries } from './api.js';
import { showNotification } from './notifications.js';
import { createCalendar } from './calendar.js';
import { applyView } from './view.js';

export const renderEntries = (entries) => {
    entriesContainer.innerHTML = '';

    entries.forEach((entry) => {
        const card = document.createElement('article');
        card.className = 'entry-card';
        card.tabIndex = 0;
        card.setAttribute('role', 'button');
        card.setAttribute('aria-label', `Open journal entry: ${entry.title}`);
        card.dataset.entryId = String(entry.id || '');

        const moodKey = String(entry.mood || '').toLowerCase();
        const iconName = MOOD_ICONS[moodKey] || 'smile';
        const moodLabel = capitalize(moodKey) || 'Mood';

        card.innerHTML = `
            <div class="card-entry">
                <div class="card-entry-header">
                    <div class="card-entry-title">${escapeHtml(entry.title)}</div>
                    <div class="mood-badge">
                        <i data-lucide="${iconName}"></i>
                        <span>${escapeHtml(moodLabel)}</span>
                    </div>
                </div>
                <div class="card-entry-date">${escapeHtml(entry.date)}</div>
                <div class="card-entry-content">${escapeHtml(entry.content)}</div>
            </div>
        `;

        entriesContainer.appendChild(card);
    });

    if (window.lucide) {
        window.lucide.createIcons();
    }
};

export const loadEntries = async () => {
    const requestedEmail = state.currentUserEmail;
    let entries;

    try {
        const remoteEntries = await fetchRemoteEntries(requestedEmail);

        // Ignore a stale response if the user logged out or switched profiles.
        if (state.currentUserEmail !== requestedEmail) return;

        entries = sortEntries(remoteEntries);
        replaceLocalEntries(entries, requestedEmail);
    } catch (error) {
        if (state.currentUserEmail !== requestedEmail) return;

        console.warn('API unavailable. Loading the local journal cache:', error.message);
        entries = sortEntries(getLocalEntries(requestedEmail));
        showNotification('Offline mode: loaded entries from the local cache.', 'error');
    }

    state.currentEntries = entries;
    renderEntries(entries);
    createCalendar(entries);
    applyView();

    document.dispatchEvent(new CustomEvent('journal:entries-loaded', {
        detail: { entries: state.currentEntries.slice() },
    }));
};
