// The full-screen single-entry page, reachable from a list card or a
// calendar dot, with a back button that returns to the app view.

import { state } from './state.js';
import {
    appSection, addEntryButton, entriesContainer, calendarGrid,
    entryDetailView, detailBackButton, detailTitle, detailDate, detailMood, detailContent,
} from './dom.js';

export const openEntryDetail = (id) => {
    const entry = state.currentEntries.find((candidate) => String(candidate.id) === String(id));
    if (!entry) return;

    detailTitle.textContent = entry.title;
    detailDate.textContent = entry.date;
    detailMood.textContent = entry.mood;
    detailContent.textContent = entry.content;

    appSection.classList.add('hidden');
    addEntryButton.classList.add('hidden');
    entryDetailView.classList.remove('hidden');
};

export const closeEntryDetail = () => {
    entryDetailView.classList.add('hidden');
    appSection.classList.remove('hidden');
    addEntryButton.classList.remove('hidden');
};

entriesContainer.addEventListener('click', (e) => {
    const card = e.target.closest('.entry-card');
    if (card) openEntryDetail(card.dataset.entryId);
});

entriesContainer.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    const card = e.target.closest('.entry-card');
    if (!card) return;
    e.preventDefault();
    openEntryDetail(card.dataset.entryId);
});

calendarGrid.addEventListener('click', (e) => {
    const dot = e.target.closest('.calendar-dot');
    if (dot) openEntryDetail(dot.dataset.entryId);
});

detailBackButton.addEventListener('click', closeEntryDetail);
