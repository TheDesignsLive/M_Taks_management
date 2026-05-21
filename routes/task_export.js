// routes/task_export.js — Mobile backend
import express from 'express';
import con from '../config/db.js';

const router = express.Router();

// GET /api/task-export?section=COMPLETED&date=2025-05-15
router.get('/', async (req, res) => {
    if (!req.session.role) return res.status(401).json({ success: false });

    const { adminId, role, userId } = req.session;
    const { section, date } = req.query;

    if (!section) return res.status(400).json({ success: false, message: 'section required' });

    try {
        let query = `
            SELECT 
                t.id, t.title, t.description, t.priority, t.status, t.section,
                DATE_FORMAT(t.due_date, '%Y-%m-%d') AS due_date,
                DATE_FORMAT(t.created_at, '%Y-%m-%d') AS created_at,
                CASE 
                    WHEN t.who_assigned = 'admin' THEN CONCAT(a.name, ' (Admin)')
                    WHEN t.who_assigned = 'owner' THEN CONCAT(u2.name, ' (Admin)')
                    ELSE u2.name
                END AS assigned_by_name,
                CASE
                    WHEN t.who_assigned = 'admin' AND t.assigned_to = 0 THEN 1
                    WHEN t.who_assigned != 'admin' AND t.assigned_by = t.assigned_to THEN 1
                    ELSE 0
                END AS is_self
            FROM tasks t
            LEFT JOIN admins a ON t.assigned_by = a.id AND t.who_assigned = 'admin'
            LEFT JOIN users u2 ON t.assigned_by = u2.id AND t.who_assigned != 'admin'
            WHERE t.admin_id = ?
        `;
        const params = [adminId];

        // Role-based filter
        if (role === 'admin') {
            query += ` AND (t.assigned_to = 0)`;
        } else {
            query += ` AND t.assigned_to = ?`;
            params.push(userId);
        }

        // Section filter
        if (section === 'COMPLETED') {
            query += ` AND t.status = 'COMPLETED'`;
        } else {
            query += ` AND t.status != 'COMPLETED' AND t.section = ?`;
            params.push(section);
        }

        // Date filter
        if (date) {
            query += ` AND DATE_FORMAT(t.due_date, '%Y-%m-%d') = ?`;
            params.push(date);
        }

        query += ` ORDER BY t.due_date ASC, FIELD(t.priority,'HIGH','MEDIUM','LOW')`;

        const [tasks] = await con.query(query, params);
        res.json({ success: true, tasks });

    } catch (err) {
        console.error('[task_export] error:', err);
        res.status(500).json({ success: false });
    }
});

export default router;