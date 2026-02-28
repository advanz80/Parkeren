const express = require('express');
const { db } = require('../database');
const { authenticate, requireAdmin } = require('../middleware/auth');

const router = express.Router();

router.use(authenticate, requireAdmin);

// --- Charging Plazas ---
router.get('/plazas', (req, res) => {
  const plazas = db.prepare('SELECT * FROM charging_plazas ORDER BY name').all();
  const result = plazas.map(plaza => {
    const spots = db.prepare('SELECT * FROM charging_spots WHERE plaza_id = ? ORDER BY spot_number').all(plaza.id);
    return { ...plaza, spots };
  });
  res.json(result);
});

router.post('/plazas', (req, res) => {
  const { name, location_description } = req.body;
  if (!name) {
    return res.status(400).json({ error: 'Naam is verplicht.' });
  }

  const result = db.prepare('INSERT INTO charging_plazas (name, location_description) VALUES (?, ?)')
    .run(name, location_description || null);

  res.status(201).json({ id: result.lastInsertRowid, name, location_description });
});

router.put('/plazas/:id', (req, res) => {
  const { name, location_description } = req.body;
  const plaza = db.prepare('SELECT * FROM charging_plazas WHERE id = ?').get(req.params.id);
  if (!plaza) {
    return res.status(404).json({ error: 'Laadplein niet gevonden.' });
  }

  db.prepare('UPDATE charging_plazas SET name = ?, location_description = ? WHERE id = ?')
    .run(name || plaza.name, location_description !== undefined ? location_description : plaza.location_description, req.params.id);

  res.json({ message: 'Laadplein bijgewerkt.' });
});

router.delete('/plazas/:id', (req, res) => {
  const plaza = db.prepare('SELECT * FROM charging_plazas WHERE id = ?').get(req.params.id);
  if (!plaza) {
    return res.status(404).json({ error: 'Laadplein niet gevonden.' });
  }

  db.prepare('DELETE FROM charging_plazas WHERE id = ?').run(req.params.id);
  res.json({ message: 'Laadplein verwijderd.' });
});

// --- Charging Spots ---
router.post('/plazas/:id/spots', (req, res) => {
  const { spot_number, max_duration_hours } = req.body;
  const plaza = db.prepare('SELECT * FROM charging_plazas WHERE id = ?').get(req.params.id);
  if (!plaza) {
    return res.status(404).json({ error: 'Laadplein niet gevonden.' });
  }

  if (!spot_number) {
    return res.status(400).json({ error: 'Pleknummer is verplicht.' });
  }

  const result = db.prepare('INSERT INTO charging_spots (plaza_id, spot_number, max_duration_hours) VALUES (?, ?, ?)')
    .run(req.params.id, spot_number, max_duration_hours || 4);

  res.status(201).json({ id: result.lastInsertRowid, plaza_id: parseInt(req.params.id), spot_number, max_duration_hours: max_duration_hours || 4 });
});

router.put('/spots/:id', (req, res) => {
  const { spot_number, max_duration_hours, is_active } = req.body;
  const spot = db.prepare('SELECT * FROM charging_spots WHERE id = ?').get(req.params.id);
  if (!spot) {
    return res.status(404).json({ error: 'Laadplek niet gevonden.' });
  }

  db.prepare('UPDATE charging_spots SET spot_number = ?, max_duration_hours = ?, is_active = ? WHERE id = ?')
    .run(
      spot_number || spot.spot_number,
      max_duration_hours !== undefined ? max_duration_hours : spot.max_duration_hours,
      is_active !== undefined ? (is_active ? 1 : 0) : spot.is_active,
      req.params.id
    );

  res.json({ message: 'Laadplek bijgewerkt.' });
});

router.delete('/spots/:id', (req, res) => {
  const spot = db.prepare('SELECT * FROM charging_spots WHERE id = ?').get(req.params.id);
  if (!spot) {
    return res.status(404).json({ error: 'Laadplek niet gevonden.' });
  }

  db.prepare('DELETE FROM charging_spots WHERE id = ?').run(req.params.id);
  res.json({ message: 'Laadplek verwijderd.' });
});

// --- Admin Stats ---
router.get('/stats', (req, res) => {
  const totalUsers = db.prepare('SELECT COUNT(*) as count FROM users WHERE role = ?').get('user').count;
  const totalPlazas = db.prepare('SELECT COUNT(*) as count FROM charging_plazas').get().count;
  const totalSpots = db.prepare('SELECT COUNT(*) as count FROM charging_spots WHERE is_active = 1').get().count;
  const activeReservations = db.prepare("SELECT COUNT(*) as count FROM reservations WHERE status = 'active' OR status = 'confirmed'").get().count;
  const waitlistCount = db.prepare("SELECT COUNT(*) as count FROM waitlist WHERE status = 'waiting'").get().count;

  res.json({ totalUsers, totalPlazas, totalSpots, activeReservations, waitlistCount });
});

// --- All Reservations (admin view) ---
router.get('/reservations', (req, res) => {
  const reservations = db.prepare(`
    SELECT r.*, u.first_name, u.last_name, u.email, u.license_plate,
           cs.spot_number, cp.name as plaza_name
    FROM reservations r
    JOIN users u ON r.user_id = u.id
    JOIN charging_spots cs ON r.spot_id = cs.id
    JOIN charging_plazas cp ON cs.plaza_id = cp.id
    ORDER BY r.start_time DESC
    LIMIT 200
  `).all();
  res.json(reservations);
});

module.exports = router;
