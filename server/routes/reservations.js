const express = require('express');
const { db } = require('../database');
const { authenticate } = require('../middleware/auth');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();
router.use(authenticate);

// Get all plazas with spots (public listing)
router.get('/plazas', (req, res) => {
  const plazas = db.prepare('SELECT * FROM charging_plazas ORDER BY name').all();
  const result = plazas.map(plaza => {
    const spots = db.prepare('SELECT id, plaza_id, spot_number, max_duration_hours FROM charging_spots WHERE plaza_id = ? AND is_active = 1 ORDER BY spot_number').all(plaza.id);
    return { ...plaza, spots };
  });
  res.json(result);
});

// Get availability for a specific plaza on a date
router.get('/availability', (req, res) => {
  const { plaza_id, date } = req.query;
  if (!plaza_id || !date) {
    return res.status(400).json({ error: 'plaza_id en date zijn verplicht.' });
  }

  const spots = db.prepare('SELECT * FROM charging_spots WHERE plaza_id = ? AND is_active = 1 ORDER BY spot_number').all(plaza_id);

  const dayStart = `${date}T00:00:00`;
  const dayEnd = `${date}T23:59:59`;

  const availability = spots.map(spot => {
    const reservations = db.prepare(
      "SELECT id, start_time, end_time, status FROM reservations WHERE spot_id = ? AND start_time >= ? AND start_time <= ? AND status IN ('pending', 'active', 'confirmed') ORDER BY start_time"
    ).all(spot.id, dayStart, dayEnd);

    return {
      ...spot,
      reservations
    };
  });

  // Check waitlist count for this plaza/date
  const waitlistCount = db.prepare(
    "SELECT COUNT(*) as count FROM waitlist WHERE plaza_id = ? AND desired_date = ? AND status = 'waiting'"
  ).get(plaza_id, date).count;

  res.json({ spots: availability, waitlistCount });
});

// Create a reservation
router.post('/', (req, res) => {
  const { spot_id, start_time, end_time } = req.body;

  if (!spot_id || !start_time || !end_time) {
    return res.status(400).json({ error: 'spot_id, start_time en end_time zijn verplicht.' });
  }

  const spot = db.prepare('SELECT * FROM charging_spots WHERE id = ? AND is_active = 1').get(spot_id);
  if (!spot) {
    return res.status(404).json({ error: 'Laadplek niet gevonden of niet actief.' });
  }

  // Validate: reservation must be in the future
  const now = new Date();
  const startDate = new Date(start_time);
  const endDate = new Date(end_time);

  if (startDate <= now) {
    return res.status(400).json({ error: 'Reservering moet in de toekomst liggen.' });
  }

  // Validate: max 1 week in advance
  const maxAdvance = new Date();
  maxAdvance.setDate(maxAdvance.getDate() + 7);
  if (startDate > maxAdvance) {
    return res.status(400).json({ error: 'Je kunt maximaal 1 week vooruit reserveren.' });
  }

  // Validate: duration must be in 30-min increments
  const durationMs = endDate - startDate;
  const durationMinutes = durationMs / (1000 * 60);
  if (durationMinutes % 30 !== 0 || durationMinutes < 30) {
    return res.status(400).json({ error: 'Reserveringen moeten in blokken van 30 minuten.' });
  }

  // Validate: duration must not exceed max
  const maxMinutes = spot.max_duration_hours * 60;
  if (durationMinutes > maxMinutes) {
    return res.status(400).json({ error: `Maximale laadtijd is ${spot.max_duration_hours} uur.` });
  }

  // Check for overlapping reservations
  const overlap = db.prepare(
    "SELECT id FROM reservations WHERE spot_id = ? AND status IN ('pending', 'active', 'confirmed') AND start_time < ? AND end_time > ?"
  ).get(spot_id, end_time, start_time);

  if (overlap) {
    return res.status(409).json({ error: 'Deze plek is al gereserveerd op dit tijdstip.' });
  }

  const token = uuidv4();
  const result = db.prepare(
    'INSERT INTO reservations (user_id, spot_id, start_time, end_time, status, confirmation_token) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(req.user.id, spot_id, start_time, end_time, 'pending', token);

  res.status(201).json({
    id: result.lastInsertRowid,
    spot_id,
    start_time,
    end_time,
    status: 'pending',
    message: 'Reservering aangemaakt. Je ontvangt een herinnering per email.'
  });
});

// Get user's reservations
router.get('/mine', (req, res) => {
  const reservations = db.prepare(`
    SELECT r.*, cs.spot_number, cs.max_duration_hours, cp.name as plaza_name, cp.id as plaza_id
    FROM reservations r
    JOIN charging_spots cs ON r.spot_id = cs.id
    JOIN charging_plazas cp ON cs.plaza_id = cp.id
    WHERE r.user_id = ?
    ORDER BY r.start_time DESC
  `).all(req.user.id);
  res.json(reservations);
});

// Cancel a reservation
router.delete('/:id', (req, res) => {
  const reservation = db.prepare('SELECT * FROM reservations WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
  if (!reservation) {
    return res.status(404).json({ error: 'Reservering niet gevonden.' });
  }

  if (reservation.status === 'cancelled' || reservation.status === 'expired') {
    return res.status(400).json({ error: 'Deze reservering is al geannuleerd of verlopen.' });
  }

  db.prepare("UPDATE reservations SET status = 'cancelled' WHERE id = ?").run(req.params.id);

  // Notify first person on waitlist for this spot's plaza on this date
  const spot = db.prepare('SELECT * FROM charging_spots WHERE id = ?').get(reservation.spot_id);
  const reservationDate = reservation.start_time.split('T')[0];
  notifyWaitlist(spot.plaza_id, reservationDate);

  res.json({ message: 'Reservering geannuleerd.' });
});

// Confirm a reservation via token
router.post('/confirm/:token', (req, res) => {
  const reservation = db.prepare("SELECT * FROM reservations WHERE confirmation_token = ? AND status IN ('pending', 'active')").get(req.params.token);
  if (!reservation) {
    return res.status(404).json({ error: 'Reservering niet gevonden of al bevestigd.' });
  }

  db.prepare("UPDATE reservations SET confirmed = 1, status = 'confirmed' WHERE id = ?").run(reservation.id);
  res.json({ message: 'Reservering bevestigd! Je laadplek is gegarandeerd.' });
});

function notifyWaitlist(plazaId, date) {
  const { sendWaitlistNotification } = require('../email');
  const firstInLine = db.prepare(
    "SELECT w.*, u.email, u.first_name FROM waitlist w JOIN users u ON w.user_id = u.id WHERE w.plaza_id = ? AND w.desired_date = ? AND w.status = 'waiting' ORDER BY w.position ASC LIMIT 1"
  ).get(plazaId, date);

  if (firstInLine) {
    const token = uuidv4();
    db.prepare("UPDATE waitlist SET status = 'notified', notified_at = datetime('now'), notification_token = ? WHERE id = ?").run(token, firstInLine.id);
    const plaza = db.prepare('SELECT name FROM charging_plazas WHERE id = ?').get(plazaId);
    sendWaitlistNotification(firstInLine.email, firstInLine.first_name, plaza.name, date, token);
  }
}

module.exports = router;
module.exports.notifyWaitlist = notifyWaitlist;
