// List/Calendar tab switching, plus the empty-state gate.

import { state } from './state.js';
import { tabNav, tabButtons, listView, calendarView, emptyState } from './dom.js';

export const applyView = () => {
    tabButtons.forEach((button) => {
        button.classList.toggle('active', button.dataset.view === state.activeView);
    });

    const hasEntries = state.currentEntries.length > 0;
    tabNav.classList.toggle('hidden', !hasEntries);

    if (!hasEntries) {
        emptyState.classList.remove('hidden');
        listView.classList.add('hidden');
        calendarView.classList.add('hidden');
        return;
    }

    emptyState.classList.add('hidden');

    if (state.activeView === 'calendar') {
        listView.classList.add('hidden');
        calendarView.classList.remove('hidden');
    } else {
        calendarView.classList.add('hidden');
        listView.classList.remove('hidden');
    }
};

export const switchView = (view) => {
    state.activeView = view;
    applyView();
};

tabButtons.forEach((button) => {
    button.addEventListener('click', () => switchView(button.dataset.view));
});
