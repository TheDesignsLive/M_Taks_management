// routes/sent-mail.js
// Mounted at /api/sent-mail in server.js
//
// This file handles OTP emails for AUTH flows only:
//   POST /api/sent-mail/send-otp  →  sent_for: "forget_password" | "signup"
//
// Settings flows (change_password, change_email, delete_profile)
// are handled directly in routes/settings.js — NOT here.

import express    from 'express';
import nodemailer from 'nodemailer';

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

  // Unknown sent_for — return null so caller can handle
  return null;
}

// ════════════════════════════════════════════════════════════════════════
//  POST /api/sent-mail/send-otp
//  Body: { contact, otp, sent_for }
//  No auth required — used on login/signup screens before session exists
// ════════════════════════════════════════════════════════════════════════
router.post('/send-otp', async (req, res) => {
  const { contact, otp, sent_for } = req.body;

  if (!contact || !otp || !sent_for) {
    return res.status(400).json({
      success: false,
      status:  'error',
      message: 'contact, otp and sent_for are required.',
    });
  }

  const mailOptions = buildMailOptions(contact, otp, sent_for);

  if (!mailOptions) {
    return res.status(400).json({
      success: false,
      status:  'error',
      message: `Unknown sent_for value: "${sent_for}". Accepted: forget_password, signup.`,
    });
  }

  try {
    await transporter.sendMail(mailOptions);
    console.log(`[Sent-Mail] Sent "${sent_for}" OTP to ${contact}`);
    return res.json({ success: true, status: 'sent' });
  } catch (err) {
    console.error('[Sent-Mail] Mail error:', err.message);
    return res.status(500).json({
      success: false,
      status:  'error',
      message: 'Failed to send OTP. Please try again.',
    });
  }
});

export default router;