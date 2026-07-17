// The dismissible banner (#message) used for success/error/offline notices.

import { message } from './dom.js';

let notificationTimeout = null;

export const showNotification = (text, type = 'success') => {
    if (notificationTimeout) {
        clearTimeout(notificationTimeout);
    }

    message.textContent = text;

    message.className = 'app-message';
    if (type === 'success') {
        message.classList.add('is-success');
    } else if (type === 'error') {
        message.classList.add('is-error');
    }

    message.classList.remove('hidden');

    notificationTimeout = setTimeout(() => {
        message.classList.add('hidden');
    }, 4000);
};
