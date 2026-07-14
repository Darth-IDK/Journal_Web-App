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

    // 3. Load entries from localStorage
    const loadEntries = () => {
        const entries = JSON.parse(localStorage.getItem('journalEntries')) || [];
        entriesContainer.innerHTML = '';

        entries.forEach((entry, index) => {
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

    // 4. Handle Form Submission
    journalForm.addEventListener('submit', (e) => {
        e.preventDefault();

        const newEntry = {
            title: document.getElementById('title').value,
            date: document.getElementById('date').value,
            mood: document.querySelector('input[name="mood"]:checked')?.value || 'N/A',
            content: document.getElementById('content').value
        };

        // Save to LocalStorage
        const entries = JSON.parse(localStorage.getItem('journalEntries')) || [];
        entries.unshift(newEntry); // Newest first
        localStorage.setItem('journalEntries', JSON.stringify(entries));

        // UI Feedback
        journalForm.reset();
        message.innerText = 'Entry saved successfully!';
        setTimeout(() => message.innerText = '', 3000);

        loadEntries();
    });

    // Initial load
    loadEntries();
});
