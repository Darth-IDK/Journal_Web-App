// Loading and rendering the list of journal entries. Tries the server
// first; if it's unreachable, falls back to localStorage and lets the
// user know via a notification.

import { state, MOOD_ICONS } from './state.js';
import { entriesContainer } from './dom.js';
import { escapeHtml, sortEntries } from './utils.js';
import { getLocalEntries } from './storage.js';
import { fetchRemoteEntries } from './api.js';
import { showNotification } from './notifications.js';
import { createCalendar } from './calendar.js';
import { applyView } from './view.js';

export const renderEntries = (entries) => {
    entriesContainer.innerHTML = '';

    entries.forEach((entry) => {
        const card = document.createElement('div');
        card.className = 'entry-card';
        card.tabIndex = 0;
        card.dataset.entryId = entry.id;

        const moodKey = String(entry.mood).toLowerCase();
        const iconName = MOOD_ICONS[moodKey] || 'smile';
        const capitalizedMood = moodKey.charAt(0).toUpperCase() + moodKey.slice(1);

        card.innerHTML = `
            <div class="card-entry">
                <div class="card-entry-header" style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.5rem;">
                    <div class="card-entry-title" style="margin-bottom: 0;">${escapeHtml(entry.title)}</div>
                    <div class="mood-badge" style="display: flex; align-items: center; gap: 0.35rem; font-size: 0.8rem; background: rgba(136, 92, 255, 0.15); color: var(--accent); padding: 0.25rem 0.65rem; border-radius: 12px; border: 1px solid rgba(136, 92, 255, 0.25);">
                        <i data-lucide="${iconName}" style="width: 12px; height: 12px;"></i>
                        <span>${escapeHtml(capitalizedMood)}</span>
                    </div>
                </div>
                <div class="card-entry-date">${escapeHtml(entry.date)}</div>
                <div class="card-entry-content">${escapeHtml(entry.content)}</div>
            </div>
        `;
        entriesContainer.appendChild(card);
    });

    // Re-render new Lucide Icons dynamically
    if (window.lucide) {
        lucide.createIcons();
    }
};

export const loadEntries = async () => {
    let entries = [];

    try {
        // Attempt to load from the server using GET
        const remoteEntries = await fetchRemoteEntries();
        if (Array.isArray(remoteEntries)) {
            entries = sortEntries(remoteEntries);
        }
    } catch (error) {
        console.warn('API offline. Falling back to local storage:', error.message);
        const localEntries = getLocalEntries();
        entries = sortEntries(localEntries);
        showNotification('Offline mode: loaded entries from local storage.', 'error');
    }

    state.currentEntries = entries;
    renderEntries(entries);
    createCalendar(entries);
    applyView();
};
