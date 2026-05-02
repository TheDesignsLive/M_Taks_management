// utils/notifyDesktop.js — Mobile utility
// ✅ When mobile changes a task, this pings the desktop server
// Desktop then emits socket event to all its connected clients
// This is a fire-and-forget call — never blocks the response

import fetch from 'node-fetch';

const DESKTOP_BASE_URL = 'https://tms.thedesigns.live';
const MOBILE_SECRET    = 'tms_mobile_bridge_2026';

export function notifyDesktop() {
    // ✅ Fire and forget — do NOT await this
    fetch(`${DESKTOP_BASE_URL}/api/notify-task-update`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-mobile-secret': MOBILE_SECRET,   // ✅ Bypass mobile redirect
        },
        body: JSON.stringify({ event: 'update_tasks' }),
    })
    .then(r => r.json())
    .then(d => { if (!d.success) console.warn('[notifyDesktop] failed:', d); })
    .catch(err => console.error('[notifyDesktop] error:', err.message));
}