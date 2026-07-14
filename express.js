// Required packages: npm install express cors bcryptjs
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const app = express();
const PORT = 3000;

// Middleware
app.use(cors()); // Enable CORS for all routes
app.use(express.json()); // Parse incoming JSON requests
app.use(express.static(__dirname)); // Serve frontend static assets (HTML, CSS, JS) from the current folder

// In-memory storage (Replace with Firestore as per assignment)
let journalEntries = [];
let users = []; // { id, email, passwordHash }

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// GET /api/entries?email=... - Retrieve one account's entries
app.get('/api/entries', (req, res) => {
    const email = typeof req.query.email === 'string' ? req.query.email.toLowerCase() : '';

    if (!email) {
        return res.status(400).json({ error: 'email query parameter is required.' });
    }

    res.status(200).json(journalEntries.filter((entry) => entry.email === email));
});

// POST /api/entries - Submit new data, scoped to an account
app.post('/api/entries', (req, res) => {
    const { title, content, date, mood, email, id } = req.body;

    // Basic Validation
    if (!title || !content || !date || !mood || !email) {
        return res.status(400).json({ error: 'All fields (including email) are required.' });
    }

    const newEntry = { title, content, date, mood, email: email.toLowerCase(), id: id || Date.now() };
    journalEntries.unshift(newEntry);

    res.status(201).json({ message: 'Entry saved successfully!', entry: newEntry });
});

// POST /api/signup - Create a new account
app.post('/api/signup', async (req, res) => {
    const { email, password } = req.body;

    if (!email || !EMAIL_REGEX.test(email)) {
        return res.status(400).json({ error: 'A valid email is required.' });
    }
    if (!password || password.length < 6) {
        return res.status(400).json({ error: 'Password must be at least 6 characters.' });
    }

    const normalizedEmail = email.toLowerCase();
    if (users.some((user) => user.email === normalizedEmail)) {
        return res.status(409).json({ error: 'An account with this email already exists.' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const newUser = { id: Date.now(), email: normalizedEmail, passwordHash };
    users.push(newUser);

    res.status(201).json({ message: 'Account created successfully!', user: { id: newUser.id, email: newUser.email } });
});

// POST /api/login - Validate credentials
app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required.' });
    }

    const normalizedEmail = email.toLowerCase();
    const user = users.find((candidate) => candidate.email === normalizedEmail);
    const passwordMatches = user ? await bcrypt.compare(password, user.passwordHash) : false;

    if (!user || !passwordMatches) {
        return res.status(401).json({ error: 'Invalid email or password.' });
    }

    res.status(200).json({ message: 'Logged in successfully!', user: { id: user.id, email: user.email } });
});

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
