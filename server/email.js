const nodemailer = require('nodemailer');

let transporter;

function getTransporter() {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_PORT === '465',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });
  }
  return transporter;
}

async function sendEmail(to, subject, html) {
  try {
    const info = await getTransporter().sendMail({
      from: `"Human Campus Parkeren" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
      to,
      subject,
      html
    });
    console.log(`Email sent to ${to}: ${info.messageId}`);
    return true;
  } catch (error) {
    console.error(`Failed to send email to ${to}:`, error.message);
    return false;
  }
}

async function sendReminderEmail(email, firstName, plazaName, spotNumber, startTime, confirmToken) {
  const appUrl = process.env.APP_URL || 'http://localhost:3000';
  const confirmUrl = `${appUrl}/confirm/${confirmToken}`;
  const startFormatted = new Date(startTime).toLocaleString('nl-NL', { dateStyle: 'full', timeStyle: 'short' });

  return sendEmail(email, `Herinnering: Laadplek ${spotNumber} op ${plazaName}`, `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #2563eb;">Herinnering - Human Campus Parkeren</h2>
      <p>Hallo ${firstName},</p>
      <p>Je hebt een laadplek gereserveerd:</p>
      <table style="border-collapse: collapse; margin: 16px 0;">
        <tr><td style="padding: 8px; font-weight: bold;">Laadplein:</td><td style="padding: 8px;">${plazaName}</td></tr>
        <tr><td style="padding: 8px; font-weight: bold;">Plek:</td><td style="padding: 8px;">${spotNumber}</td></tr>
        <tr><td style="padding: 8px; font-weight: bold;">Starttijd:</td><td style="padding: 8px;">${startFormatted}</td></tr>
      </table>
      <p><strong>Bevestig je reservering door op onderstaande knop te klikken:</strong></p>
      <a href="${confirmUrl}" style="display: inline-block; background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 16px 0;">
        Bevestig Reservering
      </a>
      <p style="color: #666; font-size: 14px;">Als je niet bevestigt, wordt je reservering na 30 minuten vrijgegeven.</p>
    </div>
  `);
}

async function sendFinalReminderEmail(email, firstName, plazaName, spotNumber, confirmToken) {
  const appUrl = process.env.APP_URL || 'http://localhost:3000';
  const confirmUrl = `${appUrl}/confirm/${confirmToken}`;

  return sendEmail(email, `LAATSTE HERINNERING: Laadplek ${spotNumber} op ${plazaName}`, `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #dc2626;">Laatste Herinnering - Human Campus Parkeren</h2>
      <p>Hallo ${firstName},</p>
      <p><strong>Je laadtijd is nu begonnen!</strong> Je hebt nog <strong>30 minuten</strong> om je reservering te bevestigen.</p>
      <p>Als je niet bevestigt, wordt je plek vrijgegeven.</p>
      <a href="${confirmUrl}" style="display: inline-block; background: #dc2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 16px 0;">
        Nu Bevestigen
      </a>
    </div>
  `);
}

async function sendEndReminderEmail(email, firstName, plazaName, spotNumber, endTime) {
  const endFormatted = new Date(endTime).toLocaleString('nl-NL', { dateStyle: 'full', timeStyle: 'short' });

  return sendEmail(email, `Laadtijd bijna verlopen: ${spotNumber} op ${plazaName}`, `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #f59e0b;">Laadtijd bijna verlopen - Human Campus Parkeren</h2>
      <p>Hallo ${firstName},</p>
      <p>Je laadtijd op <strong>${plazaName}</strong>, plek <strong>${spotNumber}</strong> verloopt om <strong>${endFormatted}</strong>.</p>
      <p>Zorg ervoor dat je je auto op tijd verplaatst zodat de volgende gebruiker de laadplek kan gebruiken.</p>
    </div>
  `);
}

async function sendWaitlistNotification(email, firstName, plazaName, date, token) {
  const appUrl = process.env.APP_URL || 'http://localhost:3000';
  const claimUrl = `${appUrl}/waitlist/claim/${token}`;
  const dateFormatted = new Date(date).toLocaleDateString('nl-NL', { dateStyle: 'full' });

  return sendEmail(email, `Laadplek vrijgekomen op ${plazaName}!`, `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #16a34a;">Goed nieuws! - Human Campus Parkeren</h2>
      <p>Hallo ${firstName},</p>
      <p>Er is een laadplek vrijgekomen op <strong>${plazaName}</strong> op <strong>${dateFormatted}</strong>!</p>
      <p>Jij bent de eerste in de wachtrij. Claim nu je plek:</p>
      <a href="${claimUrl}" style="display: inline-block; background: #16a34a; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 16px 0;">
        Claim Mijn Plek
      </a>
      <p style="color: #666; font-size: 14px;">Wees er snel bij, de plek wordt anders aangeboden aan de volgende in de wachtrij.</p>
    </div>
  `);
}

module.exports = {
  sendEmail,
  sendReminderEmail,
  sendFinalReminderEmail,
  sendEndReminderEmail,
  sendWaitlistNotification
};
