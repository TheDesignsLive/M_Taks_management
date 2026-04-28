// routes/settings.js  —  Express Router (ESM)
// Mount in server.js:  app.use('/api/settings', settingsRoutes);
//
//  POST   /api/settings/send-otp        → send OTP email via nodemailer
//  POST   /api/settings/change-password → update password in DB
//  POST   /api/settings/change-email    → update email in DB
//  POST   /api/settings/logout          → destroy session
//  DELETE /api/settings/delete-profile  → admin only — delete account + all data
//
//  ⚠️  Add to server.js (no other changes needed):
//      import settingsRoutes from './routes/settings.js';
//      app.use('/api/settings', settingsRoutes);

import express    from 'express';
import bcrypt     from 'bcryptjs';
import nodemailer from 'nodemailer';
import con        from '../config/db.js';   // same pool used everywhere

const router = express.Router();

// ─── Nodemailer transporter ───────────────────────────────────────────────────
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'social.designs.live@gmail.com',
    pass: 'ipka xjqi uach zrpc',   // Gmail App Password — keep as-is
  },
});

// ─── Auth guard ───────────────────────────────────────────────────────────────
function requireAuth(req, res, next) {
  if (!req.session?.role) {
    return res.status(401).json({ success: false, message: 'Not authenticated. Please log in.' });
  }
  next();
}

// ─── Which table + row id for the logged-in user ─────────────────────────────
// auth.js stores:
//   admin  → req.session.adminId, req.session.role = "admin"
//   user   → req.session.userId,  req.session.role = "user" | "owner"
function getUserContext(session) {
  const isAdmin = session.role === 'admin';
  return {
    table:   isAdmin ? 'admins' : 'users',
    id:      isAdmin ? session.adminId : session.userId,
    isAdmin,
  };
}

// ─── Build email options per action ──────────────────────────────────────────
function buildMailOptions(contact, otp, sent_for) {
  const from = 'social.designs.live@gmail.com';
  const year = new Date().getFullYear();
  const footer = `<hr style="border:none;border-top:1px solid #eee;margin-top:20px;"><p style="font-size:12px;color:#aaa;text-align:center;">© ${year} TMS Workspace. All rights reserved.</p>`;
  const otpBox = (color = '#095959', bg = '#f4fdfd') => `
    <div style="background-color:${bg};border:2px dashed ${color};padding:20px;text-align:center;margin:20px 0;">
      <span style="font-size:32px;font-weight:bold;letter-spacing:5px;color:${color};">${otp}</span>
    </div>`;
  const wrap = (body) =>
    `<div style="font-family:'Segoe UI',Arial,sans-serif;max-width:500px;margin:0 auto;border:1px solid #eee;padding:20px;border-radius:10px;">${body}${footer}</div>`;

  // ── change_password ──────────────────────────────────────────────────────────
  if (sent_for === 'change_password') {
    return {
      from, to: contact,
      subject: 'Security Alert: OTP to Change Password',
      text: `Your OTP for changing your password is ${otp}. If you didn't request this, please secure your account.`,
      html: wrap(`
        <h2 style="color:#095959;text-align:center;">Password Change Verification</h2>
        <p style="font-size:15px;color:#555;text-align:center;font-style:italic;margin-bottom:25px;">"Verifying your identity to keep your account credentials safe."</p>
        <p style="font-size:16px;color:#333;">To finalize your new password, please enter the following One-Time Password (OTP):</p>
        ${otpBox('#095959', '#fef9f9')}
        <p style="font-size:13px;color:#777;text-align:center;">
          This code is valid for 10 minutes.<br>
          If you did not authorize this change, please ignore this email and contact support immediately.
        </p>`),
    };
  }

  // ── change_email ─────────────────────────────────────────────────────────────
  if (sent_for === 'change_email') {
    return {
      from, to: contact,
      subject: 'Your OTP for Email Change',
      text: `Your OTP for Email Change is ${otp}. If you didn't request this, please ignore this email.`,
      html: wrap(`
        <h2 style="color:#095959;text-align:center;">Email Address Update</h2>
        <p style="font-size:15px;color:#555;text-align:center;font-style:italic;margin-bottom:25px;">"Keeping your contact information secure and up to date."</p>
        <p style="font-size:16px;color:#333;">You have requested to change or verify the email address associated with your account. Please use the following OTP to confirm:</p>
        ${otpBox()}
        <p style="font-size:13px;color:#777;text-align:center;">
          This code is valid for 10 minutes.<br>
          If you didn't request an email change, please ignore this message. Your current email remains active.
        </p>`),
    };
  }

  // ── delete_profile ───────────────────────────────────────────────────────────
  if (sent_for === 'delete_profile') {
    return {
      from, to: contact,
      subject: 'CRITICAL: OTP to Delete Your Profile',
      text: `Your OTP for deleting your profile is ${otp}. This action is permanent.`,
      html: `<div style="font-family:'Segoe UI',Arial,sans-serif;max-width:500px;margin:0 auto;border:1px solid #eee;padding:20px;border-radius:10px;border-top:5px solid #d9534f;">
        <h2 style="color:#d9534f;text-align:center;">Account Deletion Request</h2>
        <p style="font-size:16px;color:#333;">You have requested to <strong>permanently delete</strong> your profile and all associated data. This action cannot be undone.</p>
        ${otpBox('#d9534f', '#fff5f5')}
        <p style="font-size:13px;color:#777;text-align:center;">
          If you did not request this, your account may be compromised. Please change your password immediately.
        </p>
        ${footer}</div>`,
    };
  }

  // ── signup ───────────────────────────────────────────────────────────────────
  if (sent_for === 'signup') {
    return {
      from, to: contact,
      subject: 'Verify your account – Welcome to TMS Workspace!',
      text: `Welcome! Your verification code is: ${otp}. Streamline your workflow and master your productivity.`,
      html: wrap(`
        <h2 style="color:#095959;text-align:center;">Welcome to the Team!</h2>
        <p style="font-size:15px;color:#555;text-align:center;font-style:italic;margin-bottom:25px;">"Streamline your workflow, hit your deadlines, and master your productivity."</p>
        <p style="font-size:16px;color:#333;">We're excited to have you on board. To complete your signup, please use the following OTP:</p>
        ${otpBox()}
        <p style="font-size:13px;color:#777;text-align:center;">
          This code is valid for 10 minutes.<br>
          If you didn't request this, please ignore this email.
        </p>`),
    };
  }

  // ── forget_password ──────────────────────────────────────────────────────────
  if (sent_for === 'forget_password') {
    return {
      from, to: contact,
      subject: 'Your OTP for Password Reset',
      text: `Your OTP for Password Reset is ${otp}. If you didn't request this, please ignore this email.`,
      html: wrap(`
        <h2 style="color:#095959;text-align:center;">Password Reset Request</h2>
        <p style="font-size:15px;color:#555;text-align:center;font-style:italic;margin-bottom:25px;">"Secure access to streamline your workflow and master your productivity."</p>
        <p style="font-size:16px;color:#333;">We received a request to reset the password for your account. To proceed, please use the following OTP:</p>
        ${otpBox()}
        <p style="font-size:13px;color:#777;text-align:center;">
          This code is valid for 10 minutes.<br>
          If you didn't request a password reset, please ignore this email. Your account is safe.
        </p>`),
    };
  }

  // ── 2fa / generic fallback ───────────────────────────────────────────────────
  if (sent_for === '2fa') {
    return {
      from, to: contact,
      subject: 'Your Two-Factor Authentication Code',
      text: `Your 2FA code is ${otp}. Valid for 10 minutes.`,
      html: wrap(`
        <h2 style="color:#095959;text-align:center;">Two-Factor Authentication</h2>
        <p style="font-size:16px;color:#333;">Use this code to complete your login:</p>
        ${otpBox()}
        <p style="font-size:13px;color:#777;text-align:center;">Valid for 10 minutes. Do not share this code.</p>`),
    };
  }

  // ── generic fallback ─────────────────────────────────────────────────────────
  return {
    from, to: contact,
    subject: 'Your OTP Code – TMS Workspace',
    text: `Your OTP is ${otp}. Valid for 10 minutes.`,
    html: wrap(`
      <h2 style="color:#095959;text-align:center;">Verification Code</h2>
      ${otpBox()}
      <p style="font-size:13px;color:#777;text-align:center;">This code is valid for 10 minutes.</p>`),
  };
}

// ════════════════════════════════════════════════════════════════════════════
//  POST /api/settings/send-otp
//  Body: { contact, otp, sent_for }
//  sent_for values: "change_password" | "change_email" | "delete_profile"
//                   "signup" | "forget_password" | "2fa"
// ════════════════════════════════════════════════════════════════════════════
router.post('/send-otp', requireAuth, async (req, res) => {
  const { contact, otp, sent_for } = req.body;

  if (!contact || !otp || !sent_for) {
    return res.status(400).json({
      success: false,
      message: 'contact, otp and sent_for are required.',
    });
  }

  try {
    await transporter.sendMail(buildMailOptions(contact, otp, sent_for));
    console.log(`[Settings OTP] Sent "${sent_for}" OTP → ${contact}`);
    return res.json({ success: true, status: 'sent' });
  } catch (err) {
    console.error('[Settings OTP] Mail error:', err.message);
    return res.status(500).json({
      success: false,
      status: 'error',
      message: 'Failed to send OTP. Please try again.',
    });
  }
});

// ════════════════════════════════════════════════════════════════════════════
//  POST /api/settings/change-password
//  Body: { new_password }
// ════════════════════════════════════════════════════════════════════════════
router.post('/change-password', requireAuth, async (req, res) => {
  const { new_password } = req.body;

  if (!new_password) {
    return res.status(400).json({ success: false, message: 'new_password is required.' });
  }

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

// ════════════════════════════════════════════════════════════════════════════
//  POST /api/settings/change-email
//  Body: { new_email }
// ════════════════════════════════════════════════════════════════════════════
router.post('/change-email', requireAuth, async (req, res) => {
  const { new_email } = req.body;

  if (!new_email) {
    return res.status(400).json({ success: false, message: 'new_email is required.' });
  }

  const emailRx = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRx.test(new_email)) {
    return res.status(400).json({ success: false, message: 'Enter a valid email address.' });
  }

  try {
    // Ensure email not already taken
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
    req.session.email = new_email;   // keep session in sync

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

// ════════════════════════════════════════════════════════════════════════════
//  POST /api/settings/logout
// ════════════════════════════════════════════════════════════════════════════
router.post('/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) {
      console.error('[Settings] logout error:', err);
      return res.status(500).json({ success: false, message: 'Logout failed.' });
    }
    res.clearCookie('connect.sid');  // matches express-session default cookie name
    return res.json({ success: true, message: 'Logged out successfully.' });
  });
});

// ════════════════════════════════════════════════════════════════════════════
//  DELETE /api/settings/delete-profile
//  Admin only — deletes admin row + all users + all tasks
// ════════════════════════════════════════════════════════════════════════════
router.delete('/delete-profile', requireAuth, async (req, res) => {
  if (req.session.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Only admins can delete their profile. Contact your admin.',
    });
  }

  const adminId = req.session.adminId;

  try {
    // Delete in FK-safe order
    await con.query('DELETE FROM tasks  WHERE admin_id = ?', [adminId]);
    await con.query('DELETE FROM users  WHERE admin_id = ?', [adminId]);
    await con.query('DELETE FROM admins WHERE id = ?',       [adminId]);

    req.session.destroy(err => {
      if (err) console.error('[Settings] session destroy after delete:', err);
    });
    res.clearCookie('connect.sid');

    return res.json({
      success: true,
      message: 'Your profile and all associated data have been permanently deleted.',
    });
  } catch (err) {
    console.error('[Settings] delete-profile error:', err);
    return res.status(500).json({ success: false, message: 'Failed to delete profile. Please try again.' });
  }
});

// ════════════════════════════════════════════════════════════════════════════
//  FUTURE-READY ROUTES  (stubs — wire up as needed)
// ════════════════════════════════════════════════════════════════════════════

// GET /api/settings/me  — return current user info from DB
router.get('/me', requireAuth, async (req, res) => {
  try {
    const { table, id } = getUserContext(req.session);
    const [rows] = await con.query(
      `SELECT id, name, email, ${table === 'admins' ? 'company_name, phone, profile_pic' : 'role_id, status, admin_id'} FROM ${table} WHERE id = ?`,
      [id]
    );
    if (rows.length === 0) return res.status(404).json({ success: false, message: 'User not found.' });
    return res.json({ success: true, user: rows[0] });
  } catch (err) {
    console.error('[Settings] /me error:', err);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// POST /api/settings/update-profile  — update name / phone / company
router.post('/update-profile', requireAuth, async (req, res) => {
  const { name, phone, company_name } = req.body;
  try {
    const { table, id, isAdmin } = getUserContext(req.session);
    if (isAdmin) {
      await con.query(
        'UPDATE admins SET name = ?, phone = ?, company_name = ? WHERE id = ?',
        [name, phone, company_name, id]
      );
      req.session.adminName = name;
    } else {
      await con.query('UPDATE users SET name = ? WHERE id = ?', [name, id]);
      req.session.userName = name;
    }
    return res.json({ success: true, message: 'Profile updated.' });
  } catch (err) {
    console.error('[Settings] update-profile error:', err);
    return res.status(500).json({ success: false, message: 'Update failed.' });
  }
});

// POST /api/settings/send-otp-public  — no auth required (for signup / forgot-password flows)
// Body: { contact, otp, sent_for }
router.post('/send-otp-public', async (req, res) => {
  const { contact, otp, sent_for } = req.body;
  if (!contact || !otp || !sent_for) {
    return res.status(400).json({ success: false, message: 'contact, otp and sent_for are required.' });
  }
  try {
    await transporter.sendMail(buildMailOptions(contact, otp, sent_for));
    return res.json({ success: true, status: 'sent' });
  } catch (err) {
    console.error('[OTP public] Mail error:', err.message);
    return res.status(500).json({ success: false, message: 'Failed to send OTP.' });
  }
});

export default router;