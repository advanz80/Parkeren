const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { db } = require('../database');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

router.post('/register', (req, res) => {
  const { email, password, first_name, last_name, phone, license_plate } = req.body;

  if (!email || !password || !first_name || !last_name || !phone || !license_plate) {
    return res.status(400).json({ error: 'Alle velden zijn verplicht.' });
  }

  if (password.length < 6) {
    return res.status(400).json({ error: 'Wachtwoord moet minimaal 6 tekens zijn.' });
  }

  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email.toLowerCase());
  if (existing) {
    return res.status(400).json({ error: 'Er bestaat al een account met dit emailadres.' });
  }

  const hashedPassword = bcrypt.hashSync(password, 10);
  const result = db.prepare(
    'INSERT INTO users (email, password, first_name, last_name, phone, license_plate) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(email.toLowerCase(), hashedPassword, first_name, last_name, phone, license_plate.toUpperCase());

  const token = jwt.sign(
    { id: result.lastInsertRowid, email: email.toLowerCase(), role: 'user' },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );

  res.status(201).json({
    token,
    user: { id: result.lastInsertRowid, email: email.toLowerCase(), first_name, last_name, phone, license_plate: license_plate.toUpperCase(), role: 'user' }
  });
});

router.post('/login', (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email en wachtwoord zijn verplicht.' });
  }

  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email.toLowerCase());
  if (!user || !bcrypt.compareSync(password, user.password)) {
    return res.status(401).json({ error: 'Onjuist emailadres of wachtwoord.' });
  }

  const token = jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );

  res.json({
    token,
    user: { id: user.id, email: user.email, first_name: user.first_name, last_name: user.last_name, phone: user.phone, license_plate: user.license_plate, role: user.role }
  });
});

router.get('/profile', authenticate, (req, res) => {
  const user = db.prepare('SELECT id, email, first_name, last_name, phone, license_plate, role, created_at FROM users WHERE id = ?').get(req.user.id);
  if (!user) {
    return res.status(404).json({ error: 'Gebruiker niet gevonden.' });
  }
  res.json(user);
});

router.put('/profile', authenticate, (req, res) => {
  const { first_name, last_name, phone, license_plate, password } = req.body;

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  if (!user) {
    return res.status(404).json({ error: 'Gebruiker niet gevonden.' });
  }

  const updates = {
    first_name: first_name || user.first_name,
    last_name: last_name || user.last_name,
    phone: phone || user.phone,
    license_plate: license_plate ? license_plate.toUpperCase() : user.license_plate
  };

  if (password) {
    if (password.length < 6) {
      return res.status(400).json({ error: 'Wachtwoord moet minimaal 6 tekens zijn.' });
    }
    updates.password = bcrypt.hashSync(password, 10);
  }

  if (updates.password) {
    db.prepare('UPDATE users SET first_name = ?, last_name = ?, phone = ?, license_plate = ?, password = ? WHERE id = ?')
      .run(updates.first_name, updates.last_name, updates.phone, updates.license_plate, updates.password, req.user.id);
  } else {
    db.prepare('UPDATE users SET first_name = ?, last_name = ?, phone = ?, license_plate = ? WHERE id = ?')
      .run(updates.first_name, updates.last_name, updates.phone, updates.license_plate, req.user.id);
  }

  res.json({ message: 'Profiel bijgewerkt.', user: { id: req.user.id, email: user.email, first_name: updates.first_name, last_name: updates.last_name, phone: updates.phone, license_plate: updates.license_plate, role: user.role } });
});

module.exports = router;
