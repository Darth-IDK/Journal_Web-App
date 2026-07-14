const express = require('express');
const cors = require('cors');
const app = express();
const PORT = 3000;

// Middleware
app.use(cors()); // Enable CORS for all routes
app.use(express.json()); // Parse incoming JSON requests

// In-memory storage (Replace with Firestore as per assignment)
let journalEntries = [];

// GET /api/entries - Retrieve all data
app.get('/api/entries', (req, res) => {
    res.status(200).json(journalEntries);
});

// POST /api/entries - Submit new data
app.post('/api/entries', (req, res) => {
    const { title, content, date, mood } = req.body;

    // Basic Validation
    if (!title || !content || !date || !mood) {
        return res.status(400).json({ error: 'All fields are required.' });
    }

    const newEntry = { title, content, date, mood, id: Date.now() };
    journalEntries.unshift(newEntry);

    res.status(201).json({ message: 'Entry saved successfully!', entry: newEntry });
});

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
