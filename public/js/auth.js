// Browser-local profile gate. It preserves the existing login/signup design
// while the Express server exposes the core routes plus CRUD extra credit.

import { state, EMAIL_REGEX } from './state.js';
import {
    authScreen, appRoot, authForm, authEmail, authPassword,
    authConfirmField, authConfirmPassword, authError, authSubmit,
    authToggleButtons, logoutButton, entryModal, journalForm, message,
} from './dom.js';
import { normalize } from './utils.js';
import {
    getUsers, saveUsers, getSession, setSession, clearSession,
} from './storage.js';
import { createPasswordRecord, verifyPassword } from './password.js';
import { loadEntries } from './entries.js';
import { closeDeleteConfirmation, closeEntryDetail } from './entryDetail.js';

const showAuthError = (text) => {
    authError.textContent = text;
    authError.classList.remove('hidden');
};

const clearAuthError = () => {
    authError.textContent = '';
    authError.classList.add('hidden');
};

const setAuthBusy = (isBusy) => {
    authSubmit.disabled = isBusy;
    authToggleButtons.forEach((button) => {
        button.disabled = isBusy;
    });

    if (isBusy) {
        authSubmit.textContent = state.authMode === 'login' ? 'Logging In…' : 'Creating Account…';
    } else {
        authSubmit.textContent = state.authMode === 'login' ? 'Log In' : 'Sign Up';
    }
};

export const setAuthMode = (mode) => {
    state.authMode = mode === 'signup' ? 'signup' : 'login';

    authToggleButtons.forEach((button) => {
        const isActive = button.dataset.mode === state.authMode;
        button.classList.toggle('active', isActive);
        button.setAttribute('aria-selected', String(isActive));
    });

    const isSignup = state.authMode === 'signup';
    authConfirmField.classList.toggle('hidden', !isSignup);
    authConfirmPassword.required = isSignup;
    authPassword.autocomplete = isSignup ? 'new-password' : 'current-password';
    authSubmit.textContent = isSignup ? 'Sign Up' : 'Log In';

    clearAuthError();
    authForm.reset();
};

export const showApp = (email) => {
    const normalizedEmail = normalize(email).toLowerCase();
    if (!EMAIL_REGEX.test(normalizedEmail)) {
        showAuthScreen();
        return;
    }

    state.currentUserEmail = normalizedEmail;
    authScreen.classList.add('hidden');
    appRoot.classList.remove('hidden');
    void loadEntries();
};

export const showAuthScreen = () => {
    state.currentUserEmail = null;
    state.currentEntries = [];
    closeEntryDetail({ restoreFocus: false });
    entryModal.classList.add('hidden');
    entryModal.setAttribute('aria-hidden', 'true');
    closeDeleteConfirmation({ restoreFocus: false });
    state.activeEntryId = null;
    state.editingEntryId = null;
    journalForm.reset();
    message.classList.add('hidden');
    appRoot.classList.add('hidden');
    authScreen.classList.remove('hidden');
    setAuthMode('login');
};

authToggleButtons.forEach((button) => {
    button.addEventListener('click', () => setAuthMode(button.dataset.mode));
});

authForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    clearAuthError();

    const email = normalize(authEmail.value).toLowerCase();
    const password = authPassword.value;

    if (!EMAIL_REGEX.test(email)) {
        showAuthError('Enter a valid email address.');
        return;
    }

    if (password.length < 6) {
        showAuthError('Password must be at least 6 characters.');
        return;
    }

    setAuthBusy(true);

    try {
        const users = getUsers();
        const existingUserIndex = users.findIndex((user) => user.email === email);

        if (state.authMode === 'signup') {
            if (password !== authConfirmPassword.value) {
                showAuthError('Passwords do not match.');
                return;
            }

            if (existingUserIndex !== -1) {
                showAuthError('An account with this email already exists.');
                return;
            }

            const passwordRecord = await createPasswordRecord(password);
            users.push({ email, ...passwordRecord });
            saveUsers(users);
        } else {
            if (existingUserIndex === -1) {
                showAuthError('Invalid email or password.');
                return;
            }

            const user = users[existingUserIndex];
            let passwordMatches = await verifyPassword(password, user);

            // Migrate records created by the original version, which stored a
            // plain-text password in localStorage, immediately after a valid login.
            if (!passwordMatches && typeof user.password === 'string') {
                passwordMatches = user.password === password;

                if (passwordMatches) {
                    const passwordRecord = await createPasswordRecord(password);
                    users[existingUserIndex] = { email, ...passwordRecord };
                    saveUsers(users);
                }
            }

            if (!passwordMatches) {
                showAuthError('Invalid email or password.');
                return;
            }
        }

        setSession(email);
        showApp(email);
    } catch (error) {
        console.error('Local profile operation failed:', error);
        showAuthError(error.message || 'Unable to complete the profile request.');
    } finally {
        setAuthBusy(false);
    }
});

logoutButton.addEventListener('click', () => {
    clearSession();
    showAuthScreen();
});

export const bootstrapSession = () => {
    const savedSession = normalize(getSession()).toLowerCase();

    if (EMAIL_REGEX.test(savedSession)) {
        showApp(savedSession);
    } else {
        clearSession();
        showAuthScreen();
    }
};
