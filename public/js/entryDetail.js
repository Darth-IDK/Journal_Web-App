// Full-screen single-entry view with edit and delete controls.

import { state } from './state.js';
import {
    appSection, addEntryButton, entriesContainer, calendarGrid,
    entryDetailView, detailBackButton, detailEditButton, detailDeleteButton,
    detailTitle, detailDate, detailMood, detailContent,
    deleteConfirmModal, deleteConfirmClose, deleteCancelButton,
    deleteConfirmButton, deleteEntryTitle,
} from './dom.js';
import { capitalize } from './utils.js';
import { deleteRemoteEntry } from './api.js';
import { removeLocalEntry } from './storage.js';
import { loadEntries } from './entries.js';
import { showNotification } from './notifications.js';
import { openEditModal } from './modal.js';

let detailReturnFocusElement = null;
let entryPendingDeletion = null;
let deleteReturnFocusElement = null;
let deleteIsBusy = false;

const getActiveEntry = () => state.currentEntries.find(
    (candidate) => String(candidate.id) === String(state.activeEntryId),
);

const renderEntryDetail = (entry) => {
    detailTitle.textContent = entry.title;
    detailDate.textContent = entry.date;
    detailMood.textContent = capitalize(entry.mood);
    detailContent.textContent = entry.content;
};

export const openEntryDetail = (id, returnFocusElement = document.activeElement) => {
    const entry = state.currentEntries.find(
        (candidate) => String(candidate.id) === String(id),
    );

    if (!entry) return;

    state.activeEntryId = String(entry.id);
    detailReturnFocusElement = returnFocusElement;
    renderEntryDetail(entry);

    appSection.classList.add('hidden');
    addEntryButton.classList.add('hidden');
    entryDetailView.classList.remove('hidden');
    detailBackButton.focus();
};

export const closeEntryDetail = ({ restoreFocus = true } = {}) => {
    entryDetailView.classList.add('hidden');
    appSection.classList.remove('hidden');
    addEntryButton.classList.remove('hidden');
    state.activeEntryId = null;

    if (restoreFocus && detailReturnFocusElement instanceof HTMLElement) {
        detailReturnFocusElement.focus();
    }

    detailReturnFocusElement = null;
};

const setDeleteBusy = (isBusy) => {
    deleteIsBusy = isBusy;
    deleteConfirmButton.disabled = isBusy;
    deleteCancelButton.disabled = isBusy;
    deleteConfirmClose.disabled = isBusy;
    deleteConfirmModal.setAttribute('aria-busy', String(isBusy));
    deleteConfirmButton.textContent = isBusy ? 'Deleting…' : 'Delete Entry';
};

export const closeDeleteConfirmation = ({
    restoreFocus = true,
    force = false,
} = {}) => {
    if (deleteIsBusy && !force) {
        return;
    }

    deleteConfirmModal.classList.add('hidden');
    deleteConfirmModal.setAttribute('aria-hidden', 'true');
    setDeleteBusy(false);
    entryPendingDeletion = null;

    if (restoreFocus && deleteReturnFocusElement instanceof HTMLElement) {
        deleteReturnFocusElement.focus();
    }

    deleteReturnFocusElement = null;
};

const openDeleteConfirmation = (entry) => {
    entryPendingDeletion = entry;
    deleteReturnFocusElement = document.activeElement;
    deleteEntryTitle.textContent = entry.title;
    deleteConfirmModal.classList.remove('hidden');
    deleteConfirmModal.setAttribute('aria-hidden', 'false');
    window.requestAnimationFrame(() => deleteCancelButton.focus());
};

entriesContainer.addEventListener('click', (event) => {
    const card = event.target.closest('.entry-card');
    if (card) openEntryDetail(card.dataset.entryId, card);
});

entriesContainer.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;

    const card = event.target.closest('.entry-card');
    if (!card) return;

    event.preventDefault();
    openEntryDetail(card.dataset.entryId, card);
});

calendarGrid.addEventListener('click', (event) => {
    const dot = event.target.closest('.calendar-dot');
    if (dot) openEntryDetail(dot.dataset.entryId, dot);
});

detailBackButton.addEventListener('click', () => closeEntryDetail());

detailEditButton.addEventListener('click', () => {
    const entry = getActiveEntry();

    if (!entry) {
        showNotification('This journal entry is no longer available.', 'error');
        closeEntryDetail();
        return;
    }

    openEditModal(entry);
});

detailDeleteButton.addEventListener('click', () => {
    const entry = getActiveEntry();

    if (!entry) {
        showNotification('This journal entry is no longer available.', 'error');
        closeEntryDetail();
        return;
    }

    openDeleteConfirmation(entry);
});

deleteConfirmClose.addEventListener('click', () => closeDeleteConfirmation());
deleteCancelButton.addEventListener('click', () => closeDeleteConfirmation());
deleteConfirmModal.querySelector('.modal-backdrop').addEventListener(
    'click',
    () => closeDeleteConfirmation(),
);

deleteConfirmButton.addEventListener('click', async () => {
    const entry = entryPendingDeletion;
    const requestedEmail = state.currentUserEmail;

    if (!entry?.id) {
        closeDeleteConfirmation({ force: true });
        showNotification('Unable to identify the journal entry.', 'error');
        return;
    }

    if (!requestedEmail) {
        closeDeleteConfirmation({ force: true });
        showNotification('Your session has ended. Please log in again.', 'error');
        return;
    }

    setDeleteBusy(true);

    try {
        await deleteRemoteEntry(entry.id, requestedEmail);
        removeLocalEntry(entry.id, requestedEmail);
        closeDeleteConfirmation({ restoreFocus: false, force: true });
        closeEntryDetail({ restoreFocus: false });

        if (state.currentUserEmail !== requestedEmail) {
            return;
        }

        showNotification('Journal entry deleted successfully!', 'success');
        await loadEntries();
    } catch (error) {
        console.error('Unable to delete journal entry:', error);
        showNotification(`Failed to delete: ${error.message}`, 'error');
        setDeleteBusy(false);
    }
});

document.addEventListener('journal:entry-saved', (event) => {
    const savedEntry = event.detail?.entry;

    if (!savedEntry?.id) {
        return;
    }

    const index = state.currentEntries.findIndex(
        (entry) => String(entry.id) === String(savedEntry.id),
    );

    if (index !== -1) {
        state.currentEntries[index] = savedEntry;
    }

    if (
        String(savedEntry.id) === String(state.activeEntryId)
        && !entryDetailView.classList.contains('hidden')
    ) {
        renderEntryDetail(savedEntry);
    }
});

document.addEventListener('journal:entries-loaded', () => {
    if (entryDetailView.classList.contains('hidden') || !state.activeEntryId) {
        return;
    }

    const entry = getActiveEntry();

    if (entry) {
        renderEntryDetail(entry);
    } else {
        closeEntryDetail({ restoreFocus: false });
    }
});

document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;

    if (!deleteConfirmModal.classList.contains('hidden')) {
        closeDeleteConfirmation();
        return;
    }

    if (!entryDetailView.classList.contains('hidden')) {
        closeEntryDetail();
    }
});
