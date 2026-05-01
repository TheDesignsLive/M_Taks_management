const DESKTOP_URL = 'https://tms.thedesigns.live'; // ← your desktop URL
const NOTIFY_SECRET = 'tms_cross_notify_secret_2026';

export async function notifyDesktop() {
    try {
        await fetch(`${DESKTOP_URL}/internal/notify-tasks`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-notify-secret': NOTIFY_SECRET
            }
        });
    } catch (e) {
        console.log('Desktop notify skipped:', e.message);
    }
}