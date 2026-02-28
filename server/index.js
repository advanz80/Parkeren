require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { initialize } = require('./database');
const { startReminderJobs } = require('./jobs/reminders');

const app = express();
const PORT = process.env.PORT || 5000;

// Initialize database
initialize();

// Middleware
app.use(cors());
app.use(express.json());

// API Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/reservations', require('./routes/reservations'));
app.use('/api/waitlist', require('./routes/waitlist'));

// Serve React app in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '..', 'client', 'build')));
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'client', 'build', 'index.html'));
  });
}

// Start reminder jobs
startReminderJobs();

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
