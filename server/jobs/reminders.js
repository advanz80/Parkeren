const cron = require('node-cron');
const { db } = require('../database');
const { sendReminderEmail, sendFinalReminderEmail, sendEndReminderEmail } = require('../email');

function startReminderJobs() {
  // Run every 5 minutes
  cron.schedule('*/5 * * * *', () => {
    processPreReminders();
    processFinalReminders();
    processExpiredReservations();
    processEndReminders();
    processCompletedReservations();
  });

  console.log('Reminder cron jobs started.');
}

// 30 min before start: send first reminder
function processPreReminders() {
  const now = new Date();
  const thirtyMinLater = new Date(now.getTime() + 30 * 60 * 1000);

  const reservations = db.prepare(`
    SELECT r.*, u.email, u.first_name, cs.spot_number, cp.name as plaza_name
    FROM reservations r
    JOIN users u ON r.user_id = u.id
    JOIN charging_spots cs ON r.spot_id = cs.id
    JOIN charging_plazas cp ON cs.plaza_id = cp.id
    WHERE r.status = 'pending'
      AND r.reminder_sent = 0
      AND r.confirmed = 0
      AND r.start_time <= ?
      AND r.start_time > ?
  `).all(thirtyMinLater.toISOString(), now.toISOString());

  for (const r of reservations) {
    sendReminderEmail(r.email, r.first_name, r.plaza_name, r.spot_number, r.start_time, r.confirmation_token);
    db.prepare('UPDATE reservations SET reminder_sent = 1 WHERE id = ?').run(r.id);
    console.log(`Pre-reminder sent for reservation ${r.id}`);
  }
}

// At start time: send final reminder if not confirmed
function processFinalReminders() {
  const now = new Date();

  const reservations = db.prepare(`
    SELECT r.*, u.email, u.first_name, cs.spot_number, cp.name as plaza_name
    FROM reservations r
    JOIN users u ON r.user_id = u.id
    JOIN charging_spots cs ON r.spot_id = cs.id
    JOIN charging_plazas cp ON cs.plaza_id = cp.id
    WHERE r.status = 'pending'
      AND r.final_reminder_sent = 0
      AND r.confirmed = 0
      AND r.start_time <= ?
  `).all(now.toISOString());

  for (const r of reservations) {
    sendFinalReminderEmail(r.email, r.first_name, r.plaza_name, r.spot_number, r.confirmation_token);
    db.prepare("UPDATE reservations SET final_reminder_sent = 1, status = 'active' WHERE id = ?").run(r.id);
    console.log(`Final reminder sent for reservation ${r.id}`);
  }
}

// 30 min after start: expire unconfirmed reservations
function processExpiredReservations() {
  const now = new Date();
  const thirtyMinAgo = new Date(now.getTime() - 30 * 60 * 1000);

  const reservations = db.prepare(`
    SELECT r.*, cs.plaza_id
    FROM reservations r
    JOIN charging_spots cs ON r.spot_id = cs.id
    WHERE r.status = 'active'
      AND r.confirmed = 0
      AND r.start_time <= ?
  `).all(thirtyMinAgo.toISOString());

  for (const r of reservations) {
    db.prepare("UPDATE reservations SET status = 'expired' WHERE id = ?").run(r.id);
    console.log(`Reservation ${r.id} expired (not confirmed)`);

    // Notify waitlist
    const date = r.start_time.split('T')[0];
    const { notifyWaitlist } = require('../routes/reservations');
    notifyWaitlist(r.plaza_id, date);
  }
}

// 30 min before end: send end reminder
function processEndReminders() {
  const now = new Date();
  const thirtyMinLater = new Date(now.getTime() + 30 * 60 * 1000);

  const reservations = db.prepare(`
    SELECT r.*, u.email, u.first_name, cs.spot_number, cp.name as plaza_name
    FROM reservations r
    JOIN users u ON r.user_id = u.id
    JOIN charging_spots cs ON r.spot_id = cs.id
    JOIN charging_plazas cp ON cs.plaza_id = cp.id
    WHERE r.status = 'confirmed'
      AND r.end_reminder_sent = 0
      AND r.end_time <= ?
      AND r.end_time > ?
  `).all(thirtyMinLater.toISOString(), now.toISOString());

  for (const r of reservations) {
    sendEndReminderEmail(r.email, r.first_name, r.plaza_name, r.spot_number, r.end_time);
    db.prepare('UPDATE reservations SET end_reminder_sent = 1 WHERE id = ?').run(r.id);
    console.log(`End reminder sent for reservation ${r.id}`);
  }
}

// Mark completed reservations
function processCompletedReservations() {
  const now = new Date();

  db.prepare(`
    UPDATE reservations SET status = 'completed'
    WHERE status IN ('confirmed', 'active')
      AND end_time <= ?
  `).run(now.toISOString());
}

module.exports = { startReminderJobs };
