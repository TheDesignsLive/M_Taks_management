// utils/notifyDesktop.js — Mobile utility
const DESKTOP_BASE_URL = 'https://tms.thedesigns.live';
const MOBILE_SECRET    = 'tms_mobile_bridge_2026';

export function notifyDesktop(type = 'tasks') {
    const endpoint = type === 'profile'
        ? `${DESKTOP_BASE_URL}/api/notify-profile-update`
        : `${DESKTOP_BASE_URL}/api/notify-task-update`;

    fetch(endpoint, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-mobile-secret': MOBILE_SECRET,
            'x-source': 'mobile',
        },
        body: JSON.stringify({ event: type }),
    })
    .then(r => r.json())
    .then(d => { if (!d.success) console.warn('[notifyDesktop] failed:', d); })
    .catch(err => console.error('[notifyDesktop] error:', err.message));
}