// routes/settings.js  —  Express Router (ESM)


import express from 'express';
import bcrypt  from 'bcryptjs';
import con     from '../config/db.js';

const router = express.Router();

// ─── Auth guard ───────────────────────────────────────────────────────────────
function requireAuth(req, res, next) {
  if (!req.session?.role) {
    return res.status(401).json({ success: false, message: 'Not authenticated.' });
  }
  next();
}

// ─── Helper: which table + id for current user ────────────────────────────────
function getUserContext(session) {
  const isAdmin = session.role === 'admin';
  return {
    table: isAdmin ? 'admins' : 'users',
    id:    isAdmin ? session.adminId : session.userId,
    isAdmin,
  };
}

// ════════════════════════════════════════════════════════════════════════
//  POST /api/settings/send-otp
//  Body: { contact, otp, sent_for }
//  Delegates to the main OTP sender endpoint so email logic stays in one place.
// ════════════════════════════════════════════════════════════════════════
router.post('/send-otp', requireAuth, async (req, res) => {
  const { contact, otp, sent_for } = req.body;
  if (!contact || !otp) {
    return res.status(400).json({ success: false, message: 'contact and otp are required.' });
  }

  try {
    // Proxy to the desktop forgot-password send-otp route which handles email sending
    const port     = process.env.PORT || 3000;
    const response = await fetch(`http://localhost:${port}/forgot-password/send-otp`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ contact, otp, sent_for }),
    });
    const data = await response.json();
    return res.json(data);
  } catch (err) {
    console.error('[Settings] send-otp proxy error:', err.message);
    return res.status(500).json({ success: false, status: 'error', message: 'Failed to send OTP.' });
  }
});

// ════════════════════════════════════════════════════════════════════════
//  POST /api/settings/change-password
//  Body: { new_password }
// ════════════════════════════════════════════════════════════════════════
router.post('/change-password', requireAuth, async (req, res) => {
  const { new_password } = req.body;

  if (!new_password) {
    return res.status(400).json({ success: false, message: 'new_password is required.' });
  }

  // Validate strength
  const passRx = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
  if (!passRx.test(new_password)) {
    return res.status(400).json({
      success: false,
      message: 'Password must be at least 8 characters with 1 uppercase, 1 lowercase, and 1 number.',
    });
  }

  try {
    const { table, id } = getUserContext(req.session);
    const hashed        = await bcrypt.hash(new_password, 10);
    await con.query(`UPDATE ${table} SET password = ? WHERE id = ?`, [hashed, id]);
    return res.json({ success: true, message: 'Password updated successfully.' });
  } catch (err) {
    console.error('[Settings] change-password error:', err);
    return res.status(500).json({ success: false, message: 'Server error updating password.' });
  }
});

// ════════════════════════════════════════════════════════════════════════
//  POST /api/settings/change-email
//  Body: { new_email }
// ════════════════════════════════════════════════════════════════════════
router.post('/change-email', requireAuth, async (req, res) => {
  const { new_email } = req.body;

  if (!new_email) {
    return res.status(400).json({ success: false, message: 'new_email is required.' });
  }

  // Basic email format check
  const emailRx = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRx.test(new_email)) {
    return res.status(400).json({ success: false, message: 'Enter a valid email address.' });
  }

  try {
    // Check if email already taken by admins or users
    const [adminCheck] = await con.query('SELECT id FROM admins WHERE email = ?', [new_email]);
    const [userCheck]  = await con.query('SELECT id FROM users  WHERE email = ?', [new_email]);

    if (adminCheck.length > 0 || userCheck.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'This email address is already registered to another account.',
      });
    }

    const { table, id } = getUserContext(req.session);
    await con.query(`UPDATE ${table} SET email = ? WHERE id = ?`, [new_email, id]);
    req.session.email = new_email;

    return res.json({
      success:  true,
      message:  'Email updated successfully.',
      newEmail: new_email,
    });
  } catch (err) {
    console.error('[Settings] change-email error:', err);
    return res.status(500).json({ success: false, message: 'Failed to change email. Please try again.' });
  }
});

// ════════════════════════════════════════════════════════════════════════
//  POST /api/settings/logout
// ════════════════════════════════════════════════════════════════════════
router.post('/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) {
      console.error('[Settings] logout error:', err);
      return res.status(500).json({ success: false, message: 'Logout failed.' });
    }
    res.clearCookie('tms_session_cookie');
    return res.json({ success: true, message: 'Logged out successfully.' });
  });
});

// ════════════════════════════════════════════════════════════════════════
//  DELETE /api/settings/delete-profile
//  Admin only — deletes the admin row + all their users
// ════════════════════════════════════════════════════════════════════════
router.delete('/delete-profile', requireAuth, async (req, res) => {
  if (req.session.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Only admins can delete their profile. Contact your admin.',
    });
  }

  const adminId = req.session.adminId;

  try {
    // Delete in safe order (users → tasks → admins) to respect FK constraints
    // Adjust table names / cascade order to match your schema
    await con.query('DELETE FROM tasks WHERE admin_id = ?',  [adminId]);
    await con.query('DELETE FROM users WHERE admin_id = ?',  [adminId]);
    await con.query('DELETE FROM admins WHERE id = ?',       [adminId]);

    req.session.destroy(err => {
      if (err) console.error('[Settings] session destroy after delete:', err);
    });

    return res.json({
      success: true,
      message: 'Your profile and all associated data have been permanently deleted.',
    });
  } catch (err) {
    console.error('[Settings] delete-profile error:', err);
    return res.status(500).json({ success: false, message: 'Failed to delete profile. Please try again.' });
  }
});

export default router;