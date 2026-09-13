/**
 * Optional email notifications. If SMTP_HOST / SMTP_USER / SMTP_PASS /
 * NOTIFY_EMAIL are not all set, this silently does nothing -- the site
 * works fine without email, enquiries still land in the admin panel.
 */

const nodemailer = require('nodemailer');

function isConfigured() {
  return Boolean(
    process.env.SMTP_HOST &&
    process.env.SMTP_USER &&
    process.env.SMTP_PASS &&
    process.env.NOTIFY_EMAIL
  );
}

let transporter = null;
function getTransporter() {
  if (!isConfigured()) return null;
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: Number(process.env.SMTP_PORT) === 465,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
    });
  }
  return transporter;
}

async function notifyNewEnquiry(entry) {
  const t = getTransporter();
  if (!t) return { sent: false, reason: 'SMTP not configured' };

  try {
    await t.sendMail({
      from: `"Meera Smriti Website" <${process.env.SMTP_USER}>`,
      to: process.env.NOTIFY_EMAIL,
      subject: `New admission enquiry: ${entry.childName}`,
      text: [
        `Parent: ${entry.parentName}`,
        `Child: ${entry.childName}`,
        `Phone: ${entry.phone}`,
        `Message: ${entry.message || '(none)'}`,
        `Photo attached: ${entry.photoUrl ? 'yes' : 'no'}`,
        `Submitted: ${entry.submittedAt}`
      ].join('\n')
    });
    return { sent: true };
  } catch (err) {
    console.error('[mailer] Failed to send enquiry notification:', err.message);
    return { sent: false, reason: err.message };
  }
}

module.exports = { isConfigured, notifyNewEnquiry };
