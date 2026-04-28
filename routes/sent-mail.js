// routes/settings.js  —  Express Router (ESM)
//
//  Mount in server.js:  app.use('/api/settings', settingsRoutes);
//
//  Endpoints:
//   POST   /api/settings/send-otp
//   POST   /api/settings/change-password
//   POST   /api/settings/change-email
//   POST   /api/settings/logout
//   DELETE /api/settings/delete-profile

import express    from 'express';
import bcrypt     from 'bcryptjs';
import nodemailer from 'nodemailer';
import con        from '../config/db.js';

const router = express.Router();

// ─── Nodemailer transporter ───────────────────────────────────────────────────
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'social.designs.live@gmail.com',
    pass: 'ipka xjqi uach zrpc',   // App Password
  },
});

// ─── OTP Email Builder ────────────────────────────────────────────────────────
function buildMailOptions(contact, otp, sent_for) {
  const base = { from: 'social.designs.live@gmail.com', to: contact };

  if (sent_for === 'forget_password') {
    return {
      ...base,
      subject: 'Your OTP for Password Reset',
      text:    `Your OTP for Password Reset is ${otp}. If you didn't request this, please ignore this email.`,
      html: `
        <div style="font-family:'Segoe UI',Arial,sans-serif;max-width:500px;margin:0 auto;border:1px solid #eee;padding:20px;border-radius:10px;">
          <h2 style="color:#095959;text-align:center;">Password Reset Request</h2>
          <p style="font-size:15px;color:#555;text-align:center;font-style:italic;margin-bottom:25px;">
            "Secure access to streamline your workflow and master your productivity."
          </p>
          <p style="font-size:16px;color:#333;">We received a request to reset the password for your account. Please use the following One-Time Password (OTP):</p>
          <div style="background-color:#f4fdfd;border:2px dashed #095959;padding:20px;text-align:center;margin:20px 0;">
            <span style="font-size:32px;font-weight:bold;letter-spacing:5px;color:#095959;">${otp}</span>
          </div>
          <p style="font-size:13px;color:#777;text-align:center;">
            This code is valid for 10 minutes.<br>
            If you didn't request a password reset, please ignore this email. Your account is safe.
          </p>
          <hr style="border:none;border-top:1px solid #eee;margin-top:20px;">
          <p style="font-size:12px;color:#aaa;text-align:center;">© 2026 TMS Workspace. All rights reserved.</p>
        </div>`,
    };
  }

  if (sent_for === 'signup') {
    return {
      ...base,
      subject: 'Verify your account – Welcome to TMS Workspace!',
      text:    `Welcome! Your verification code is: ${otp}.`,
      html: `
        <div style="font-family:'Segoe UI',Arial,sans-serif;max-width:500px;margin:0 auto;border:1px solid #eee;padding:20px;border-radius:10px;">
          <h2 style="color:#095959;text-align:center;">Welcome to the Team!</h2>
          <p style="font-size:15px;color:#555;text-align:center;font-style:italic;margin-bottom:25px;">
            "Streamline your workflow, hit your deadlines, and master your productivity."
          </p>
          <p style="font-size:16px;color:#333;">We're excited to have you on board. To complete your signup, please use the following One-Time Password (OTP):</p>
          <div style="background-color:#f4fdfd;border:2px dashed #095959;padding:20px;text-align:center;margin:20px 0;">
            <span style="font-size:32px;font-weight:bold;letter-spacing:5px;color:#095959;">${otp}</span>
          </div>
          <p style="font-size:13px;color:#777;text-align:center;">
            This code is valid for 10 minutes.<br>
            If you didn't request this, please ignore this email.
          </p>
          <hr style="border:none;border-top:1px solid #eee;margin-top:20px;">
          <p style="font-size:12px;color:#aaa;text-align:center;">© 2026 TMS Workspace. All rights reserved.</p>
        </div>`,
    };
  }

  if (sent_for === 'change_email') {
    return {
      ...base,
      subject: 'Your OTP for Email Change',
      text:    `Your OTP for Email Change is ${otp}. If you didn't request this, please ignore this email.`,
      html: `
        <div style="font-family:'Segoe UI',Arial,sans-serif;max-width:500px;margin:0 auto;border:1px solid #eee;padding:20px;border-radius:10px;">
          <h2 style="color:#095959;text-align:center;">Email Address Update</h2>
          <p style="font-size:15px;color:#555;text-align:center;font-style:italic;margin-bottom:25px;">
            "Keeping your contact information secure and up to date."
          </p>
          <p style="font-size:16px;color:#333;">You have requested to change or verify the email address associated with your account. Please use the following OTP to confirm:</p>
          <div style="background-color:#f4fdfd;border:2px dashed #095959;padding:20px;text-align:center;margin:20px 0;">
            <span style="font-size:32px;font-weight:bold;letter-spacing:5px;color:#095959;">${otp}</span>
          </div>
          <p style="font-size:13px;color:#777;text-align:center;">
            This code is valid for 10 minutes.<br>
            If you didn't request an email change, please ignore this message. Your current email remains active.
          </p>
          <hr style="border:none;border-top:1px solid #eee;margin-top:20px;">
          <p style="font-size:12px;color:#aaa;text-align:center;">© 2026 TMS Workspace. All rights reserved.</p>
        </div>`,
    };
  }

  if (sent_for === 'change_password') {
    return {
      ...base,
      subject: 'Security Alert: OTP to Change Password',
      text:    `Your OTP for changing your password is ${otp}. If you didn't request this, please secure your account.`,
      html: `
        <div style="font-family:'Segoe UI',Arial,sans-serif;max-width:500px;margin:0 auto;border:1px solid #eee;padding:20px;border-radius:10px;">
          <h2 style="color:#095959;text-align:center;">Password Change Verification</h2>
          <p style="font-size:15px;color:#555;text-align:center;font-style:italic;margin-bottom:25px;">
            "Verifying your identity to keep your account credentials safe."
          </p>
          <p style="font-size:16px;color:#333;">To finalize your new password, please enter the following One-Time Password (OTP):</p>
          <div style="background-color:#fef9f9;border:2px dashed #095959;padding:20px;text-align:center;margin:20px 0;">
            <span style="font-size:32px;font-weight:bold;letter-spacing:5px;color:#095959;">${otp}</span>
          </div>
          <p style="font-size:13px;color:#777;text-align:center;">
            If you did not authorize this change, please ignore this email and contact support immediately.
          </p>
          <hr style="border:none;border-top:1px solid #eee;margin-top:20px;">
          <p style="font-size:12px;color:#aaa;text-align:center;">© 2026 TMS Workspace. All rights reserved.</p>
        </div>`,
    };
  }

  if (sent_for === 'delete_profile') {
    return {
      ...base,
      subject: 'CRITICAL: OTP to Delete Your Profile',
      text:    `Your OTP for deleting your profile is ${otp}. This action is permanent.`,
      html: `
        <div style="font-family:'Segoe UI',Arial,sans-serif;max-width:500px;margin:0 auto;border:1px solid #eee;padding:20px;border-radius:10px;border-top:5px solid #d9534f;">
          <h2 style="color:#d9534f;text-align:center;">Account Deletion Request</h2>
          <p style="font-size:16px;color:#333;">You have requested to <strong>permanently delete</strong> your profile and all associated data. This action cannot be undone.</p>
          <div style="background-color:#fff5f5;border:2px dashed #d9534f;padding:20px;text-align:center;margin:20px 0;">
            <span style="font-size:32px;font-weight:bold;letter-spacing:5px;color:#d9534f;">${otp}</span>
          </div>
          <p style="font-size:13px;color:#777;text-align:center;">
            If you did not request this, your account may be compromised. Please change your password immediately.
          </p>
          <hr style="border:none;border-top:1px solid #eee;margin-top:20px;">
          <p style="font-size:12px;color:#aaa;text-align:center;">© 2026 TMS Workspace. All rights reserved.</p>
        </div>`,
    };
  }

  // Fallback — unknown sent_for
  return null;
}

// ─── Auth guard ───────────────────────────────────────────────────────────────
function requireAuth(req, res, next) {
  if (!req.session?.role) {
    return res.status(401).json({ success: false, message: 'Not authenticated.' });
  }
  next();
}

// ─── Helper: table + id for current user ─────────────────────────────────────
function getUserContext(session) {
  const isAdmin = session.role === 'admin';
  return {
    table:   isAdmin ? 'admins' : 'users',
    id:      isAdmin ? session.adminId : session.userId,
    isAdmin,
  };
}

// ════════════════════════════════════════════════════════════════════════
//  POST /api/settings/send-otp
//  Body: { contact, otp, sent_for }
//
//  sent_for values accepted:
//    "forget_password" | "signup" | "change_email" | "change_password" | "delete_profile"
// ════════════════════════════════════════════════════════════════════════
router.post('/send-otp', requireAuth, async (req, res) => {
  const { contact, otp, sent_for } = req.body;

  if (!contact || !otp || !sent_for) {
    return res.status(400).json({ success: false, status: 'error', message: 'contact, otp and sent_for are required.' });
  }

  const mailOptions = buildMailOptions(contact, otp, sent_for);

  if (!mailOptions) {
    return res.status(400).json({ success: false, status: 'error', message: `Unknown sent_for value: "${sent_for}".` });
  }

  try {
    await transporter.sendMail(mailOptions);
    console.log(`[Settings OTP] Sent "${sent_for}" OTP to ${contact}`);
    return res.json({ success: true, status: 'sent' });
  } catch (err) {
    console.error('[Settings OTP] Mail error:', err.message);
    return res.status(500).json({ success: false, status: 'error', message: 'Failed to send OTP. Please try again.' });
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

  const emailRx = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRx.test(new_email)) {
    return res.status(400).json({ success: false, message: 'Enter a valid email address.' });
  }

  try {
    // Check if email already taken
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

    return res.json({ success: true, message: 'Email updated successfully.', newEmail: new_email });
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
//  Admin only — deletes the admin row + all their users + tasks
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
    // Delete in safe order to respect FK constraints
    await con.query('DELETE FROM tasks  WHERE admin_id = ?', [adminId]);
    await con.query('DELETE FROM users  WHERE admin_id = ?', [adminId]);
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