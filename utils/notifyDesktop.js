// utils/notifyDesktop.js — Mobile utility
// Node v24+ has fetch built-in — no import needed

const DESKTOP_BASE_URL = 'https://tms.thedesigns.live';
const MOBILE_SECRET    = 'tms_mobile_bridge_2026';

export function notifyDesktop() {
    fetch(`${DESKTOP_BASE_URL}/api/notify-task-update`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-mobile-secret': MOBILE_SECRET,
            'x-source': 'mobile',           // ✅ NEW: identify who sent this
        },
        body: JSON.stringify({ event: 'update_tasks' }),
    })
    .then(r => r.json())
    .then(d => { if (!d.success) console.warn('[notifyDesktop] failed:', d); })
    .catch(err => console.error('[notifyDesktop] error:', err.message));
}