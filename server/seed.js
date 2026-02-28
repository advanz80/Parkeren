require('dotenv').config();
const bcrypt = require('bcryptjs');
const { db, initialize } = require('./database');

initialize();

// Create admin user
const adminPassword = bcrypt.hashSync('admin123', 10);
db.prepare(`
  INSERT OR IGNORE INTO users (email, password, first_name, last_name, phone, license_plate, role)
  VALUES (?, ?, ?, ?, ?, ?, ?)
`).run('admin@humancampus.nl', adminPassword, 'Admin', 'Human Campus', '0612345678', 'HC-001-A', 'admin');

// Create sample charging plazas
const plaza1 = db.prepare("INSERT OR IGNORE INTO charging_plazas (id, name, location_description) VALUES (1, ?, ?)")
  .run('Laadplein Noord', 'Bij de hoofdingang van de campus, naast gebouw A');

const plaza2 = db.prepare("INSERT OR IGNORE INTO charging_plazas (id, name, location_description) VALUES (2, ?, ?)")
  .run('Laadplein Zuid', 'Achter het parkeerterrein, bij gebouw C');

// Create sample spots for plaza 1
for (let i = 1; i <= 6; i++) {
  db.prepare("INSERT OR IGNORE INTO charging_spots (id, plaza_id, spot_number, max_duration_hours) VALUES (?, 1, ?, ?)")
    .run(i, `N-${i}`, 4);
}

// Create sample spots for plaza 2
for (let i = 1; i <= 4; i++) {
  db.prepare("INSERT OR IGNORE INTO charging_spots (id, plaza_id, spot_number, max_duration_hours) VALUES (?, 2, ?, ?)")
    .run(6 + i, `Z-${i}`, 3);
}

console.log('Database seeded successfully!');
console.log('Admin account: admin@humancampus.nl / admin123');
process.exit(0);
