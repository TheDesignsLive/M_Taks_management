// routes/view_roles.js
import express from 'express';
import con from '../config/db.js';

const router = express.Router();

// ─── AUTH MIDDLEWARE ──────────────────────────────────────────────────────────
function requireAuth(req, res, next) {
    if (!req.session?.role) {
        return res.status(401).json({ success: false, message: 'Not authenticated. Please log in.' });
    }
    next();
}

// ─── HELPER: get adminId based on session ────────────────────────────────────
async function getAdminId(session) {
    if (session.role === 'admin') return session.adminId;
    const [rows] = await con.query('SELECT admin_id FROM users WHERE id=?', [session.userId]);
    return rows.length ? rows[0].admin_id : null;
}

// ════════════════════════════════════════════════════════════
// GET /api/roles  — fetch all roles + teams
// ════════════════════════════════════════════════════════════
router.get('/', requireAuth, async (req, res) => {
    try {
        const adminId = await getAdminId(req.session);
        if (!adminId) return res.status(403).json({ success: false, message: 'Admin not found.' });

        // Fetch teams
        const [teamRows] = await con.query(
            'SELECT id, name FROM teams WHERE admin_id=? ORDER BY name ASC',
            [adminId]
        );

        // Fetch roles with team name, ordered alphabetically by team then role
        const [roleRows] = await con.query(
            `SELECT r.*, t.name as team_name
             FROM roles r
             LEFT JOIN teams t ON r.team_id = t.id
             WHERE r.admin_id=?
             ORDER BY COALESCE(t.name, 'zzz') ASC, r.id ASC`,
            [adminId]
        );

        return res.json({
            success: true,
            roles: roleRows,
            teams: teamRows,
            sessionRole: req.session.role,
        });

    } catch (err) {
        console.error('[roles GET]', err);
        return res.status(500).json({ success: false, message: 'Error fetching roles.' });
    }
});

// ════════════════════════════════════════════════════════════
// POST /api/roles/add  — create a new role
// ════════════════════════════════════════════════════════════
router.post('/add', requireAuth, async (req, res) => {
    try {
        const adminId = await getAdminId(req.session);
        if (!adminId) return res.status(403).json({ success: false, message: 'Admin not found.' });

        let { role_name, control_type, team_id } = req.body;

        if (!role_name || !role_name.trim()) {
            return res.status(400).json({ success: false, message: 'Role name is required.' });
        }
        if (!control_type) {
            return res.status(400).json({ success: false, message: 'Control type is required.' });
        }

        team_id = team_id || null;

        await con.execute(
            `INSERT INTO roles (admin_id, role_name, control_type, team_id) VALUES (?, ?, ?, ?)`,
            [adminId, role_name.trim(), control_type, team_id]
        );

        if (req.io) req.io.emit('update_roles');

        return res.json({ success: true, message: 'Role successfully created.' });

    } catch (err) {
        console.error('[roles ADD]', err);
        return res.status(500).json({ success: false, message: 'Error creating role.' });
    }
});

// ════════════════════════════════════════════════════════════
// POST /api/roles/edit/:id  — update a role
// ════════════════════════════════════════════════════════════
router.post('/edit/:id', requireAuth, async (req, res) => {
    try {
        const adminId = await getAdminId(req.session);
        if (!adminId) return res.status(403).json({ success: false, message: 'Admin not found.' });

        const { id } = req.params;
        let { role_name, control_type, team_id } = req.body;

        if (!role_name || !role_name.trim()) {
            return res.status(400).json({ success: false, message: 'Role name is required.' });
        }
        if (!control_type) {
            return res.status(400).json({ success: false, message: 'Control type is required.' });
        }

        team_id = team_id || null;

        // Verify ownership
        const [existing] = await con.query('SELECT id FROM roles WHERE id=? AND admin_id=?', [id, adminId]);
        if (!existing.length) {
            return res.status(404).json({ success: false, message: 'Role not found.' });
        }

        await con.query(
            `UPDATE roles SET role_name=?, control_type=?, team_id=? WHERE id=?`,
            [role_name.trim(), control_type, team_id, id]
        );

        if (req.io) req.io.emit('update_roles');

        return res.json({ success: true, message: 'Role successfully updated.' });

    } catch (err) {
        console.error('[roles EDIT]', err);
        return res.status(500).json({ success: false, message: 'Error updating role.' });
    }
});

// ════════════════════════════════════════════════════════════
// GET /api/roles/delete/:id  — delete a role
// ════════════════════════════════════════════════════════════
router.get('/delete/:id', requireAuth, async (req, res) => {
    try {
        const adminId = await getAdminId(req.session);
        if (!adminId) return res.status(403).json({ success: false, message: 'Admin not found.' });

        const { id } = req.params;

        // Verify ownership
        const [existing] = await con.query('SELECT id FROM roles WHERE id=? AND admin_id=?', [id, adminId]);
        if (!existing.length) {
            return res.status(404).json({ success: false, message: 'Role not found.' });
        }

        // Check if role is assigned to any user
        const [used] = await con.execute(
            'SELECT id FROM users WHERE role_id=? LIMIT 1',
            [id]
        );
        if (used.length > 0) {
            return res.json({ success: false, message: 'Cannot delete: This role is currently assigned to users.' });
        }

        await con.execute('DELETE FROM roles WHERE id=?', [id]);

        if (req.io) req.io.emit('update_roles');

        return res.json({ success: true, message: 'Role successfully deleted.' });

    } catch (err) {
        console.error('[roles DELETE]', err);
        return res.status(500).json({ success: false, message: 'Error deleting role.' });
    }
});

export default router;