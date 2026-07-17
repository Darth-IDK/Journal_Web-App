// Browser application entry point.

import './js/view.js';
import './js/calendar.js';
import './js/entryDetail.js';
import './js/modal.js';
import { bootstrapSession } from './js/auth.js';

const renderIcons = () => {
    if (window.lucide) {
        window.lucide.createIcons();
    }
};

renderIcons();
window.addEventListener('load', renderIcons, { once: true });
bootstrapSession();
