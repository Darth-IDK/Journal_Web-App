document.addEventListener('DOMContentLoaded', () => {
    const journalForm = document.getElementById('journalForm');
    const entriesContainer = document.getElementById('entriesContainer');
    const message = document.getElementById('message');
    const dateInput = document.getElementById('date');
    const todayButton = document.getElementById('todayButton');

    // 1. Initialize Lucide icons
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }

    // 2. Helper: Set today's date
    todayButton.addEventListener('click', () => {
        const today = new Date().toISOString().split('T')[0];
        dateInput.value = today;
    });

    const API_BASE = '/api/entries';

    const renderEntries = (entries) => {
        entriesContainer.innerHTML = '';

        entries.forEach((entry) => {
            const card = document.createElement('div');
            card.className = 'column is-half';
            card.innerHTML = `
                <div class="card">
                    <header class="card-header">
                        <p class="card-header-title">${entry.title}</p>
                    </header>
                    <div class="card-content">
                        <div class="content">${entry.content}</div>
                        <p><strong>Date:</strong> ${entry.date}</p>
                        <p><strong>Mood:</strong> ${entry.mood}</p>
                    </div>
                </div>
            `;
            entriesContainer.appendChild(card);
        });
    };

    const getLocalEntries = () => JSON.parse(localStorage.getItem('journalEntries')) || [];
    const saveLocalEntry = (entry) => {
        const entries = getLocalEntries();
        entries.unshift(entry);
        localStorage.setItem('journalEntries', JSON.stringify(entries));
    };

    const fetchRemoteEntries = async () => {
        const response = await fetch(API_BASE, {
            headers: {
                'Accept': 'application/json',
            },
        });

        if (!response.ok) {
            throw new Error('Remote entries unavailable');
        }

        return response.json();
    };

    const postRemoteEntry = async (entry) => {
        const response = await fetch(API_BASE, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(entry),
        });

        if (!response.ok) {
            throw new Error('Failed to save remote entry');
        }

        return response.json();
    };

    const loadEntries = async () => {
        let entries = getLocalEntries();

        try {
            const remoteEntries = await fetchRemoteEntries();
            if (Array.isArray(remoteEntries) && remoteEntries.length > 0) {
                entries = remoteEntries;
            }
        } catch (error) {
            // Remote API not available yet; continue using localStorage.
            console.warn(error.message);
        }

        renderEntries(entries);
    };

    journalForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const newEntry = {
            title: document.getElementById('title').value,
            date: document.getElementById('date').value,
            mood: document.querySelector('input[name="mood"]:checked')?.value || 'N/A',
            content: document.getElementById('content').value,
        };

        saveLocalEntry(newEntry);

        try {
            await postRemoteEntry(newEntry);
            message.innerText = 'Entry saved locally and prepared for remote sync.';
        } catch (error) {
            message.innerText = 'Saved locally. Remote API not available yet.';
        }

        journalForm.reset();
        setTimeout(() => {
            message.innerText = '';
        }, 3000);

        loadEntries();
    });

    loadEntries();
});
