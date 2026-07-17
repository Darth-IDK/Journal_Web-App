// Calendar grid rendering and month navigation.

import { state, MONTH_NAMES } from './state.js';
import { calendarGrid, monthLabel, prevMonthButton, nextMonthButton } from './dom.js';
import { escapeHtml } from './utils.js';

export const createCalendar = (entries) => {
    calendarGrid.innerHTML = '';
    const currentMonth = state.viewedMonth;
    const currentYear = state.viewedYear;
    monthLabel.textContent = `${MONTH_NAMES[currentMonth]} ${currentYear}`;

    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

    const entriesByDate = entries.reduce((map, entry) => {
        (map[entry.date] = map[entry.date] || []).push(entry);
        return map;
    }, {});

    for (let day = 1; day <= daysInMonth; day += 1) {
        const dateKey = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const dayEntries = (entriesByDate[dateKey] || []).slice(0, 3);
        const cell = document.createElement('div');
        cell.className = 'calendar-cell';
        const dotsHtml = dayEntries.map((entry) => `
            <button
                type="button"
                class="calendar-dot"
                data-entry-id="${escapeHtml(entry.id)}"
                data-tooltip="${escapeHtml(entry.title)} · ${escapeHtml(entry.mood)}"
                aria-label="${escapeHtml(entry.title)} (${escapeHtml(entry.mood)})"
            ></button>
        `).join('');
        cell.innerHTML = `
            <span class="calendar-day-label">${day}</span>
            <div class="calendar-dots">${dotsHtml}</div>
        `;
        calendarGrid.appendChild(cell);
    }
};

prevMonthButton.addEventListener('click', () => {
    state.viewedMonth -= 1;
    if (state.viewedMonth < 0) {
        state.viewedMonth = 11;
        state.viewedYear -= 1;
    }
    createCalendar(state.currentEntries);
});

nextMonthButton.addEventListener('click', () => {
    state.viewedMonth += 1;
    if (state.viewedMonth > 11) {
        state.viewedMonth = 0;
        state.viewedYear += 1;
    }
    createCalendar(state.currentEntries);
});
