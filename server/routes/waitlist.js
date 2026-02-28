const express = require('express');
const { db } = require('../database');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

// Join waitlist for a plaza on a date
router.post('/', (req, res) => {
  const { plaza_id, desired_date } = req.body;

  if (!plaza_id || !desired_date) {
    return res.status(400).json({ error: 'plaza_id en desired_date zijn verplicht.' });
  }

  const plaza = db.prepare('SELECT * FROM charging_plazas WHERE id = ?').get(plaza_id);
  if (!plaza) {
    return res.status(404).json({ error: 'Laadplein niet gevonden.' });
  }

  // Check if user is already on waitlist for this plaza/date
  const existing = db.prepare(
    "SELECT * FROM waitlist WHERE user_id = ? AND plaza_id = ? AND desired_date = ? AND status = 'waiting'"
  ).get(req.user.id, plaza_id, desired_date);

  if (existing) {
    return res.status(400).json({ error: 'Je staat al op de wachtlijst voor deze dag.', position: existing.position });
  }

  // Determine position
  const lastPosition = db.prepare(
    "SELECT MAX(position) as max_pos FROM waitlist WHERE plaza_id = ? AND desired_date = ? AND status IN ('waiting', 'notified')"
  ).get(plaza_id, desired_date);

  const position = (lastPosition.max_pos || 0) + 1;

  const result = db.prepare(
    'INSERT INTO waitlist (user_id, plaza_id, desired_date, position) VALUES (?, ?, ?, ?)'
  ).run(req.user.id, plaza_id, desired_date, position);

  res.status(201).json({
    id: result.lastInsertRowid,
    plaza_id,
    desired_date,
    position,
    message: `Je staat op positie ${position} van de wachtlijst.`
  });
});

// Get user's waitlist entries
router.get('/mine', (req, res) => {
  const entries = db.prepare(`
    SELECT w.*, cp.name as plaza_name
    FROM waitlist w
    JOIN charging_plazas cp ON w.plaza_id = cp.id
    WHERE w.user_id = ?
    ORDER BY w.desired_date ASC
  `).all(req.user.id);
  res.json(entries);
});

// Get waitlist position for a specific plaza/date
router.get('/position', (req, res) => {
  const { plaza_id, date } = req.query;
  if (!plaza_id || !date) {
    return res.status(400).json({ error: 'plaza_id en date zijn verplicht.' });
  }

  const entry = db.prepare(
    "SELECT * FROM waitlist WHERE user_id = ? AND plaza_id = ? AND desired_date = ? AND status = 'waiting'"
  ).get(req.user.id, plaza_id, date);

  if (!entry) {
    return res.json({ onWaitlist: false });
  }

  const totalAhead = db.prepare(
    "SELECT COUNT(*) as count FROM waitlist WHERE plaza_id = ? AND desired_date = ? AND status = 'waiting' AND position < ?"
  ).get(plaza_id, date, entry.position).count;

  res.json({ onWaitlist: true, position: totalAhead + 1, id: entry.id });
});

// Cancel waitlist entry
router.delete('/:id', (req, res) => {
  const entry = db.prepare('SELECT * FROM waitlist WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
  if (!entry) {
    return res.status(404).json({ error: 'Wachtlijst-entry niet gevonden.' });
  }

  db.prepare("UPDATE waitlist SET status = 'cancelled' WHERE id = ?").run(req.params.id);
  res.json({ message: 'Je bent van de wachtlijst verwijderd.' });
});

// Claim a spot from waitlist notification
router.post('/claim/:token', (req, res) => {
  const entry = db.prepare("SELECT * FROM waitlist WHERE notification_token = ? AND status = 'notified'").get(req.params.token);
  if (!entry) {
    return res.status(404).json({ error: 'Ongeldige of verlopen wachtlijst-notificatie.' });
  }

  db.prepare("UPDATE waitlist SET status = 'claimed' WHERE id = ?").run(entry.id);
  res.json({
    message: 'Plek geclaimd! Ga naar de reserveringspagina om je tijdslot te kiezen.',
    plaza_id: entry.plaza_id,
    date: entry.desired_date
  });
});

module.exports = router;
