// The login/signup gate: mode switching, form validation, session
// creation, and the two functions (showApp/showAuthScreen) that flip
// between the auth screen and the main app.

import { state, EMAIL_REGEX } from './state.js';
import {
    authScreen, appRoot, authForm, authEmail, authPassword,
    authConfirmField, authConfirmPassword, authError, authSubmit,
    authToggleButtons, logoutButton,
} from './dom.js';
import { normalize } from './utils.js';
import { getUsers, saveUsers, getSession, setSession, clearSession } from './storage.js';
import { postRemoteAuth } from './api.js';
import { loadEntries } from './entries.js';
import { closeEntryDetail } from './entryDetail.js';

const showAuthError = (text) => {
    authError.textContent = text;
    authError.classList.remove('hidden');
};

const clearAuthError = () => {
    authError.textContent = '';
    authError.classList.add('hidden');
};

export const setAuthMode = (mode) => {
    state.authMode = mode;
    authToggleButtons.forEach((button) => {
        button.classList.toggle('active', button.dataset.mode === mode);
    });
    authConfirmField.classList.toggle('hidden', mode === 'login');
    authConfirmPassword.required = mode === 'signup';
    authSubmit.textContent = mode === 'login' ? 'Log In' : 'Sign Up';
    clearAuthError();
    authForm.reset();
};

export const showApp = (email) => {
    state.currentUserEmail = email;
    authScreen.classList.add('hidden');
    appRoot.classList.remove('hidden');
    loadEntries();
};

export const showAuthScreen = () => {
    state.currentUserEmail = null;
    closeEntryDetail();
    appRoot.classList.add('hidden');
    authScreen.classList.remove('hidden');
    setAuthMode('login');
};

authToggleButtons.forEach((button) => {
    button.addEventListener('click', () => setAuthMode(button.dataset.mode));
});

authForm.addEventListener('submit', (e) => {
    e.preventDefault();
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

    const users = getUsers();

    if (state.authMode === 'signup') {
        if (password !== authConfirmPassword.value) {
            showAuthError('Passwords do not match.');
            return;
        }
        if (users.some((user) => user.email === email)) {
            showAuthError('An account with this email already exists.');
            return;
        }

        users.push({ email, password });
        saveUsers(users);
        postRemoteAuth('signup', { email, password }).catch(() => {});
    } else {
        const user = users.find((candidate) => candidate.email === email);
        if (!user || user.password !== password) {
            showAuthError('Invalid email or password.');
            return;
        }
        postRemoteAuth('login', { email, password }).catch(() => {});
    }

    setSession(email);
    showApp(email);
});

logoutButton.addEventListener('click', () => {
    clearSession();
    showAuthScreen();
});

export const bootstrapSession = () => {
    if (getSession()) {
        showApp(getSession());
    } else {
        showAuthScreen();
    }
};
