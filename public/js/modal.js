// Journal entry modal for both create and edit operations.

import { state } from './state.js';
import {
    journalForm, titleInput, contentInput, dateInput, todayButton,
    addEntryButton, entryModal, entryModalTitle, modalClose, emptyStateCta,
    entrySubmitButton,
} from './dom.js';
import { normalize, toLocalDateInputValue } from './utils.js';
import { saveLocalEntry } from './storage.js';
import { patchRemoteEntry, postRemoteEntry } from './api.js';
import { loadEntries } from './entries.js';
import { showNotification } from './notifications.js';

let previouslyFocusedElement = null;
let isSubmitting = false;

const setModalCopy = () => {
    const isEditing = Boolean(state.editingEntryId);
    entryModalTitle.textContent = isEditing ? 'Edit Journal Entry' : 'New Journal Entry';
    entrySubmitButton.textContent = isEditing ? 'Save Changes' : 'Save Entry';
};

const setSubmitting = (submitting) => {
    isSubmitting = submitting;
    const isEditing = Boolean(state.editingEntryId);

    entrySubmitButton.disabled = submitting;
    modalClose.disabled = submitting;
    todayButton.disabled = submitting;
    entryModal.setAttribute('aria-busy', String(submitting));
    entrySubmitButton.textContent = submitting
        ? (isEditing ? 'Updating…' : 'Saving…')
        : (isEditing ? 'Save Changes' : 'Save Entry');
};

const resetEntryForm = () => {
    journalForm.reset();
    state.editingEntryId = null;
    setModalCopy();
};

export const closeModal = ({
    restoreFocus = true,
    resetForm = true,
    force = false,
} = {}) => {
    if (isSubmitting && !force) {
        return;
    }

    entryModal.classList.add('hidden');
    entryModal.setAttribute('aria-hidden', 'true');
    entryModal.setAttribute('aria-busy', 'false');

    if (resetForm) {
        resetEntryForm();
    }

    if (restoreFocus && previouslyFocusedElement instanceof HTMLElement) {
        previouslyFocusedElement.focus();
    }

    previouslyFocusedElement = null;
};

const showModal = () => {
    entryModal.classList.remove('hidden');
    entryModal.setAttribute('aria-hidden', 'false');
    setModalCopy();

    window.requestAnimationFrame(() => titleInput.focus());
};

export const openModal = () => {
    previouslyFocusedElement = document.activeElement;
    resetEntryForm();
    dateInput.value = toLocalDateInputValue();
    showModal();
};

export const openEditModal = (entry) => {
    if (!entry?.id) {
        showNotification('Unable to edit this journal entry.', 'error');
        return;
    }

    previouslyFocusedElement = document.activeElement;
    resetEntryForm();
    state.editingEntryId = String(entry.id);

    titleInput.value = entry.title || '';
    contentInput.value = entry.content || '';
    dateInput.value = entry.date || toLocalDateInputValue();

    const moodInput = Array.from(
        journalForm.querySelectorAll('input[name="mood"]'),
    ).find((input) => input.value === entry.mood);

    if (moodInput) {
        moodInput.checked = true;
    }

    showModal();
};

addEntryButton.addEventListener('click', openModal);
emptyStateCta.addEventListener('click', openModal);
modalClose.addEventListener('click', () => closeModal());
entryModal.querySelector('.modal-backdrop').addEventListener('click', () => closeModal());

document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !entryModal.classList.contains('hidden')) {
        closeModal();
    }
});

todayButton.addEventListener('click', () => {
    dateInput.value = toLocalDateInputValue();
});

journalForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    const title = normalize(titleInput.value);
    const date = dateInput.value;
    const mood = journalForm.querySelector('input[name="mood"]:checked')?.value || '';
    const content = normalize(contentInput.value);
    const editingEntryId = state.editingEntryId;
    const requestedEmail = state.currentUserEmail;
    const isEditing = Boolean(editingEntryId);

    if (!title) {
        showNotification('Entry title cannot be empty.', 'error');
        titleInput.focus();
        return;
    }

    if (!date) {
        showNotification('Please select a date for your entry.', 'error');
        dateInput.focus();
        return;
    }

    if (!content) {
        showNotification('Journal entry content cannot be empty.', 'error');
        contentInput.focus();
        return;
    }

    if (!mood) {
        showNotification('Please select a mood representing your day.', 'error');
        return;
    }

    if (!requestedEmail) {
        showNotification('Your session has ended. Please log in again.', 'error');
        return;
    }

    const sameDayCount = state.currentEntries.filter(
        (entry) => entry.date === date
            && String(entry.id) !== String(editingEntryId || ''),
    ).length;

    if (sameDayCount >= 3) {
        showNotification('You may not have more than three entries per day.', 'error');
        return;
    }

    const entryPayload = {
        title,
        content,
        date,
        mood,
        email: requestedEmail,
    };

    setSubmitting(true);

    try {
        const result = isEditing
            ? await patchRemoteEntry(editingEntryId, entryPayload)
            : await postRemoteEntry(entryPayload);
        const savedEntry = result?.entry;

        if (!savedEntry?.id) {
            throw new Error('The server did not return the saved journal entry.');
        }

        saveLocalEntry(savedEntry, requestedEmail);
        closeModal({ force: true });

        if (state.currentUserEmail !== requestedEmail) {
            return;
        }

        document.dispatchEvent(new CustomEvent('journal:entry-saved', {
            detail: {
                entry: savedEntry,
                mode: isEditing ? 'update' : 'create',
            },
        }));

        showNotification(
            isEditing
                ? 'Journal entry updated successfully!'
                : 'Journal entry saved successfully!',
            'success',
        );

        await loadEntries();
    } catch (error) {
        console.error('Unable to save journal entry:', error);
        showNotification(`Failed to save: ${error.message}`, 'error');
    } finally {
        setSubmitting(false);
    }
});
