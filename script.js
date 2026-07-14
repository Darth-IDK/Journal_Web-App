document.addEventListener('DOMContentLoaded', () => {
    const journalForm = document.getElementById('journalForm');
    const entriesContainer = document.getElementById('entriesContainer');
    const message = document.getElementById('message');
    const dateInput = document.getElementById('date');
    const todayButton = document.getElementById('todayButton');
    const addEntryButton = document.getElementById('addEntryButton');
    const entryModal = document.getElementById('entryModal');
    const modalClose = document.getElementById('modalClose');
    const tabNav = document.querySelector('.tab-nav');
    const tabButtons = document.querySelectorAll('.tab-button');
    const listView = document.getElementById('listView');
    const calendarView = document.getElementById('calendarView');
    const emptyState = document.getElementById('emptyState');
    const calendarGrid = document.getElementById('calendarGrid');
    const monthLabel = document.getElementById('monthLabel');
    const authScreen = document.getElementById('authScreen');
    const appRoot = document.getElementById('appRoot');
    const authForm = document.getElementById('authForm');
    const authEmail = document.getElementById('authEmail');
    const authPassword = document.getElementById('authPassword');
    const authConfirmField = document.getElementById('authConfirmField');
    const authConfirmPassword = document.getElementById('authConfirmPassword');
    const authError = document.getElementById('authError');
    const authSubmit = document.getElementById('authSubmit');
    const authToggleButtons = document.querySelectorAll('.auth-toggle-button');
    const logoutButton = document.getElementById('logoutButton');
    const appSection = document.getElementById('appSection');
    const entryDetailView = document.getElementById('entryDetailView');
    const detailBackButton = document.getElementById('detailBackButton');
    const detailTitle = document.getElementById('detailTitle');
    const detailDate = document.getElementById('detailDate');
    const detailMood = document.getElementById('detailMood');
    const detailContent = document.getElementById('detailContent');
    const prevMonthButton = document.getElementById('prevMonthButton');
    const nextMonthButton = document.getElementById('nextMonthButton');
    const emptyStateCta = document.getElementById('emptyStateCta');

    if (window.lucide) lucide.createIcons();

    const API_BASE = '/api/entries';
    const AUTH_API_BASE = '/api';
    const today = new Date();
    let currentEntries = [];
    let activeView = 'list';
    let authMode = 'login';
    let currentUserEmail = null;
    let viewedMonth = today.getMonth();
    let viewedYear = today.getFullYear();

    const MONTH_NAMES = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December',
    ];
    
    const MOOD_ICONS = {
        thoughtful: 'moon',
        serene: 'cloud-drizzle',
        inspired: 'sparkles',
        focused: 'target',
        rested: 'coffee',
        balanced: 'book-open'
    };

    const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const USERS_KEY = 'journalUsers';
    const SESSION_KEY = 'journalCurrentUser';

    const normalize = (value) => value.trim();

    const generateId = () => (window.crypto?.randomUUID)
        ? crypto.randomUUID()
        : `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

    const escapeHtml = (value) => String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');

    const entriesKey = () => `journalEntries:${currentUserEmail}`;
    const getLocalEntries = () => {
        const entries = JSON.parse(localStorage.getItem(entriesKey())) || [];
        let backfilled = false;
        entries.forEach((entry) => {
            if (!entry.id) {
                entry.id = generateId();
                backfilled = true;
            }
        });
        if (backfilled) localStorage.setItem(entriesKey(), JSON.stringify(entries));
        return entries;
    };
    const saveLocalEntry = (entry) => {
        const entries = getLocalEntries();
        entries.unshift(entry);
        localStorage.setItem(entriesKey(), JSON.stringify(entries));
    };

    let notificationTimeout = null;
    const showNotification = (text, type = 'success') => {
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

    const getUsers = () => JSON.parse(localStorage.getItem(USERS_KEY)) || [];
    const saveUsers = (users) => localStorage.setItem(USERS_KEY, JSON.stringify(users));

    const getSession = () => localStorage.getItem(SESSION_KEY);
    const setSession = (email) => localStorage.setItem(SESSION_KEY, email);
    const clearSession = () => localStorage.removeItem(SESSION_KEY);

    const sortEntries = (entries) => entries.slice().sort((a, b) => b.date.localeCompare(a.date));

    const renderEntries = (entries) => {
        entriesContainer.innerHTML = '';

        entries.forEach((entry) => {
            const card = document.createElement('div');
            card.className = 'entry-card';
            card.tabIndex = 0;
            card.dataset.entryId = entry.id;

            const moodKey = String(entry.mood).toLowerCase();
            const iconName = MOOD_ICONS[moodKey] || 'smile';
            const capitalizedMood = moodKey.charAt(0).toUpperCase() + moodKey.slice(1);

            card.innerHTML = `
                <div class="card-entry">
                    <div class="card-entry-header" style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.5rem;">
                        <div class="card-entry-title" style="margin-bottom: 0;">${escapeHtml(entry.title)}</div>
                        <div class="mood-badge" style="display: flex; align-items: center; gap: 0.35rem; font-size: 0.8rem; background: rgba(136, 92, 255, 0.15); color: var(--accent); padding: 0.25rem 0.65rem; border-radius: 12px; border: 1px solid rgba(136, 92, 255, 0.25);">
                            <i data-lucide="${iconName}" style="width: 12px; height: 12px;"></i>
                            <span>${escapeHtml(capitalizedMood)}</span>
                        </div>
                    </div>
                    <div class="card-entry-date">${escapeHtml(entry.date)}</div>
                    <div class="card-entry-content">${escapeHtml(entry.content)}</div>
                </div>
            `;
            entriesContainer.appendChild(card);
        });

        // Re-render new Lucide Icons dynamically
        if (window.lucide) {
            lucide.createIcons();
        }
    };

    const createCalendar = (entries) => {
        calendarGrid.innerHTML = '';
        const currentMonth = viewedMonth;
        const currentYear = viewedYear;
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

    const fetchRemoteEntries = async () => {
        const url = `${API_BASE}?email=${encodeURIComponent(currentUserEmail)}`;
        const response = await fetch(url, { headers: { 'Accept': 'application/json' } });
        if (!response.ok) {
            const errData = await response.json().catch(() => ({}));
            throw new Error(errData.error || 'Remote entries unavailable');
        }
        return response.json();
    };

    const postRemoteEntry = async (entry) => {
        const response = await fetch(API_BASE, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(entry),
        });
        if (!response.ok) {
            const errorResponse = await response.json().catch(() => ({}));
            throw new Error(errorResponse.error || 'Failed to save remote entry');
        }
        return response.json();
    };

    const closeModal = () => entryModal.classList.add('hidden');
    const openModal = () => entryModal.classList.remove('hidden');

    const openEntryDetail = (id) => {
        const entry = currentEntries.find((candidate) => String(candidate.id) === String(id));
        if (!entry) return;

        detailTitle.textContent = entry.title;
        detailDate.textContent = entry.date;
        detailMood.textContent = entry.mood;
        detailContent.textContent = entry.content;

        appSection.classList.add('hidden');
        addEntryButton.classList.add('hidden');
        entryDetailView.classList.remove('hidden');
    };

    const closeEntryDetail = () => {
        entryDetailView.classList.add('hidden');
        appSection.classList.remove('hidden');
        addEntryButton.classList.remove('hidden');
    };

    const showAuthError = (text) => {
        authError.textContent = text;
        authError.classList.remove('hidden');
    };

    const clearAuthError = () => {
        authError.textContent = '';
        authError.classList.add('hidden');
    };

    const setAuthMode = (mode) => {
        authMode = mode;
        authToggleButtons.forEach((button) => {
            button.classList.toggle('active', button.dataset.mode === mode);
        });
        authConfirmField.classList.toggle('hidden', mode === 'login');
        authConfirmPassword.required = mode === 'signup';
        authSubmit.textContent = mode === 'login' ? 'Log In' : 'Sign Up';
        clearAuthError();
        authForm.reset();
    };

    const showApp = (email) => {
        currentUserEmail = email;
        authScreen.classList.add('hidden');
        appRoot.classList.remove('hidden');
        loadEntries();
    };

    const showAuthScreen = () => {
        currentUserEmail = null;
        closeEntryDetail();
        appRoot.classList.add('hidden');
        authScreen.classList.remove('hidden');
        setAuthMode('login');
    };

    const postRemoteAuth = (path, payload) => fetch(`${AUTH_API_BASE}/${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    });

    const applyView = () => {
        tabButtons.forEach((button) => {
            button.classList.toggle('active', button.dataset.view === activeView);
        });

        const hasEntries = currentEntries.length > 0;
        tabNav.classList.toggle('hidden', !hasEntries);

        if (!hasEntries) {
            emptyState.classList.remove('hidden');
            listView.classList.add('hidden');
            calendarView.classList.add('hidden');
            return;
        }

        emptyState.classList.add('hidden');

        if (activeView === 'calendar') {
            listView.classList.add('hidden');
            calendarView.classList.remove('hidden');
        } else {
            calendarView.classList.add('hidden');
            listView.classList.remove('hidden');
        }
    };

    const switchView = (view) => {
        activeView = view;
        applyView();
    };

    const loadEntries = async () => {
        let entries = [];

        try {
            const remoteEntries = await fetchRemoteEntries();
            if (Array.isArray(remoteEntries)) {
                entries = sortEntries(remoteEntries);
            }
        } catch (error) {
            console.warn('API Offline. Falling back to Local Storage:', error.message);
            const localEntries = getLocalEntries();
            entries = sortEntries(localEntries);
            showNotification('Offline mode: Loaded entries from local storage.', 'error');
        }

        currentEntries = entries;
        renderEntries(entries);
        createCalendar(entries);
        applyView();
    };

    addEntryButton.addEventListener('click', openModal);
    emptyStateCta.addEventListener('click', openModal);
    modalClose.addEventListener('click', closeModal);
    entryModal.querySelector('.modal-backdrop').addEventListener('click', closeModal);

    entriesContainer.addEventListener('click', (e) => {
        const card = e.target.closest('.entry-card');
        if (card) openEntryDetail(card.dataset.entryId);
    });

    entriesContainer.addEventListener('keydown', (e) => {
        if (e.key !== 'Enter' && e.key !== ' ') return;
        const card = e.target.closest('.entry-card');
        if (!card) return;
        e.preventDefault();
        openEntryDetail(card.dataset.entryId);
    });

    calendarGrid.addEventListener('click', (e) => {
        const dot = e.target.closest('.calendar-dot');
        if (dot) openEntryDetail(dot.dataset.entryId);
    });

    detailBackButton.addEventListener('click', closeEntryDetail);

    prevMonthButton.addEventListener('click', () => {
        viewedMonth -= 1;
        if (viewedMonth < 0) {
            viewedMonth = 11;
            viewedYear -= 1;
        }
        createCalendar(currentEntries);
    });

    nextMonthButton.addEventListener('click', () => {
        viewedMonth += 1;
        if (viewedMonth > 11) {
            viewedMonth = 0;
            viewedYear += 1;
        }
        createCalendar(currentEntries);
    });

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
            email: currentUserEmail,
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

    tabButtons.forEach((button) => {
        button.addEventListener('click', () => switchView(button.dataset.view));
    });

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

        if (authMode === 'signup') {
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

    if (getSession()) {
        showApp(getSession());
    } else {
        showAuthScreen();
    }
});
