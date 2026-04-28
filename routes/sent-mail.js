// sendMail.js  —  React/Frontend mail utility (ESM)
// ─────────────────────────────────────────────────────────────────────────────
// This is the FRONTEND version of the mail sender.
// All it does is call your backend  POST /api/settings/send-otp
// (or the public variant) with { contact, otp, sent_for }.
//
// Usage:
//   import { sendOtp, generateOtp, SENT_FOR } from './sendMail';
//
//   const otp = generateOtp();
//   const result = await sendOtp({ contact: 'user@example.com', otp, sent_for: SENT_FOR.CHANGE_PASSWORD });
//   if (result.success) { ... }
//
// ─────────────────────────────────────────────────────────────────────────────

// ─── Base URL (auto-switch dev / prod) ───────────────────────────────────────
const BASE_URL =
  typeof window !== 'undefined' &&
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
    ? 'http://localhost:5000'
    : '';   // same origin in production

// ─── sent_for constants ───────────────────────────────────────────────────────
export const SENT_FOR = {
  CHANGE_PASSWORD: 'change_password',
  CHANGE_EMAIL:    'change_email',
  DELETE_PROFILE:  'delete_profile',
  SIGNUP:          'signup',
  FORGET_PASSWORD: 'forget_password',
  TWO_FA:          '2fa',
};

// ─── Generate a 6-digit OTP ──────────────────────────────────────────────────
export function generateOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// ─── Send OTP (authenticated routes — requires session cookie) ───────────────
// Use for: change_password, change_email, delete_profile
export async function sendOtp({ contact, otp, sent_for }) {
  try {
    const res = await fetch(`${BASE_URL}/api/settings/send-otp`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contact, otp, sent_for }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      return { success: false, message: data.message || `Server error (${res.status})` };
    }

    const data = await res.json();
    return { success: data.success, message: data.message || '', status: data.status };
  } catch (err) {
    console.error('[sendMail] sendOtp error:', err);
    return { success: false, message: 'Network error. Check your connection and try again.' };
  }
}

// ─── Send OTP (public routes — no session required) ──────────────────────────
// Use for: signup, forget_password
export async function sendOtpPublic({ contact, otp, sent_for }) {
  try {
    const res = await fetch(`${BASE_URL}/api/settings/send-otp-public`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contact, otp, sent_for }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      return { success: false, message: data.message || `Server error (${res.status})` };
    }

    const data = await res.json();
    return { success: data.success, message: data.message || '', status: data.status };
  } catch (err) {
    console.error('[sendMail] sendOtpPublic error:', err);
    return { success: false, message: 'Network error. Check your connection and try again.' };
  }
}

// ─── Verify OTP (client-side, no server round-trip) ──────────────────────────
// The OTP is generated on the client and kept in local state.
// This helper just compares without exposing the value unnecessarily.
export function verifyOtp(input, expected) {
  if (!input || !expected) return false;
  return input.trim() === expected.trim();
}

// ─── Password validator ───────────────────────────────────────────────────────
// Min 8 chars, 1 uppercase, 1 lowercase, 1 digit
export function isValidPassword(password) {
  return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/.test(password);
}

// ─── Email validator ─────────────────────────────────────────────────────────
export function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// ─────────────────────────────────────────────────────────────────────────────
//  USAGE EXAMPLES (for reference — not executed)
// ─────────────────────────────────────────────────────────────────────────────
//
//  ── Change password flow ──────────────────────────────────────────────────
//  const otp = generateOtp();
//  const result = await sendOtp({
//    contact: 'user@example.com',
//    otp,
//    sent_for: SENT_FOR.CHANGE_PASSWORD,
//  });
//  if (result.success) {
//    // store otp in component state, show OTP input
//  }
//
//  ── Signup flow (no session yet) ─────────────────────────────────────────
//  const otp = generateOtp();
//  const result = await sendOtpPublic({
//    contact: 'newuser@example.com',
//    otp,
//    sent_for: SENT_FOR.SIGNUP,
//  });
//
//  ── Forgot password (public) ──────────────────────────────────────────────
//  const otp = generateOtp();
//  const result = await sendOtpPublic({
//    contact: email,
//    sent_for: SENT_FOR.FORGET_PASSWORD,
//    otp,
//  });
//
//  ── Verify input ─────────────────────────────────────────────────────────
//  if (!verifyOtp(userTypedOtp, storedOtp)) {
//    setError('Invalid OTP. Please try again.');
//    return;
//  }
//
// ─────────────────────────────────────────────────────────────────────────────