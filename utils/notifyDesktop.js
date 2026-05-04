// utils/notifyDesktop.js — Mobile utility
const DESKTOP_BASE_URL = 'https://tms.thedesigns.live';
const MOBILE_SECRET    = 'tms_mobile_bridge_2026';

export function notifyDesktop(type = 'tasks', extraData = {}) {
    const endpoints = {
        tasks:   `${DESKTOP_BASE_URL}/api/notify-task-update`,
        profile: `${DESKTOP_BASE_URL}/api/notify-profile-update`,
        members: `${DESKTOP_BASE_URL}/api/notify-members-update`,
    roles:  `${DESKTOP_BASE_URL}/api/notify-roles-update`,
teams:             `${DESKTOP_BASE_URL}/api/notify-teams-update`,
        announcement_add:  `${DESKTOP_BASE_URL}/api/notify-announcement-add`,
        announcement_edit: `${DESKTOP_BASE_URL}/api/notify-announcement-edit`,
        announcement_delete: `${DESKTOP_BASE_URL}/api/notify-announcement-delete`,
    };
    const endpoint = endpoints[type] || endpoints.tasks;

    fetch(endpoint, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-mobile-secret': MOBILE_SECRET,
            'x-source': 'mobile',
        },
      body: JSON.stringify({ event: type, ...extraData }),
    })
    .then(r => r.json())
    .then(d => { if (!d.success) console.warn('[notifyDesktop] failed:', d); })
    .catch(err => console.error('[notifyDesktop] error:', err.message));
}