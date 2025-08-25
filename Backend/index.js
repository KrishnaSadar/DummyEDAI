// /backend/index.js

const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const projectRoutes = require('./routes/projectRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

// Ensure the 'files' directory exists
const filesDir = path.join(__dirname, 'files');
if (!fs.existsSync(filesDir)) {
    fs.mkdirSync(filesDir);
}

// Middleware
app.use(cors()); // Enable Cross-Origin Resource Sharing
app.use(express.json()); // To parse JSON bodies
app.use(express.urlencoded({ extended: true })); // To parse URL-encoded bodies

// Serve static files from the 'files' directory
app.use('/files', express.static(filesDir));

// API Routes
app.use('/api/projects', projectRoutes);

// Root endpoint
app.get('/', (req, res) => {
    res.send('Project Management API is running...');
});

// Start the server
app.listen(PORT, () => {
    console.log(`🚀 Server is running on http://localhost:${PORT}`);
});