// List/calendar tab switching and empty-state handling.

import { state } from './state.js';
import { tabNav, tabButtons, listView, calendarView, emptyState } from './dom.js';

export const applyView = () => {
    tabButtons.forEach((button) => {
        const isActive = button.dataset.view === state.activeView;
        button.classList.toggle('active', isActive);
        button.setAttribute('aria-selected', String(isActive));
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
    state.activeView = view === 'calendar' ? 'calendar' : 'list';
    applyView();
};

tabButtons.forEach((button) => {
    button.addEventListener('click', () => switchView(button.dataset.view));
});
