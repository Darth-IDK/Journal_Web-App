// The "new journal entry" modal: opening/closing it, the Today shortcut,
// and saving a new entry (posts to the server, then backs it up locally).

import { state } from './state.js';
import {
    journalForm, dateInput, todayButton,
    addEntryButton, entryModal, modalClose, emptyStateCta,
} from './dom.js';
import { normalize, generateId } from './utils.js';
import { getLocalEntries, saveLocalEntry } from './storage.js';
import { postRemoteEntry } from './api.js';
import { loadEntries } from './entries.js';
import { showNotification } from './notifications.js';

export const closeModal = () => entryModal.classList.add('hidden');
export const openModal = () => entryModal.classList.remove('hidden');

addEntryButton.addEventListener('click', openModal);
emptyStateCta.addEventListener('click', openModal);
modalClose.addEventListener('click', closeModal);
entryModal.querySelector('.modal-backdrop').addEventListener('click', closeModal);

todayButton.addEventListener('click', () => {
    const todayDate = new Date().toISOString().split('T')[0];
    dateInput.value = todayDate;
});

journalForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    // Retrieve and trim values
    const titleValue = normalize(document.getElementById('title').value);
    const dateValue = document.getElementById('date').value;
    const moodValue = document.querySelector('input[name="mood"]:checked')?.value;
    const contentValue = normalize(document.getElementById('content').value);

    // 1. Validation Checks (Ensuring fields are not empty)
    if (!titleValue) {
        showNotification('Entry Title cannot be empty.', 'error');
        return;
    }
    if (!dateValue) {
        showNotification('Please select a date for your entry.', 'error');
        return;
    }
    if (!contentValue) {
        showNotification('Journal entry content cannot be empty.', 'error');
        return;
    }
    if (!moodValue) {
        showNotification('Please select a mood representing your day.', 'error');
        return;
    }

    const newEntry = {
        id: generateId(),
        title: titleValue,
        date: dateValue,
        mood: moodValue,
        content: contentValue,
        email: state.currentUserEmail,
    };

    // 2. Business Logic Rule: Limit 3 entries per day
    const todayCount = getLocalEntries().filter((entry) => entry.date === newEntry.date).length;
    if (todayCount >= 3) {
        showNotification('You may not create more than three entries per day.', 'error');
        return;
    }

    try {
        // 3. Send new journal entry using the POST endpoint
        await postRemoteEntry(newEntry);

        // Backup locally for offline capabilities
        saveLocalEntry(newEntry);

        // 4. Show success message
        showNotification('Journal entry saved successfully!', 'success');

        // 5. Clean up form state & Close Modal only on success
        closeModal();
        journalForm.reset();

        // 6. Refresh the journal list after adding an entry
        await loadEntries();
    } catch (error) {
        console.error('API Error:', error);
        showNotification(`Failed to save: ${error.message}`, 'error');
    }
});
