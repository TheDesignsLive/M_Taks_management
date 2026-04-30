// home.js
import express from 'express';
import con from '../config/db.js';

const router = express.Router();

// Get All Data (Tasks, Members, Teams)
router.get('/api/data', async (req, res) => {
    if (!req.session.role) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const { adminId, userId, role } = req.session;
    
    try {
        // 1. Fetch Members
        const memberQuery = role === 'admin' 
            ? "SELECT id, name FROM users WHERE admin_id=? AND status='ACTIVE'"
            : "SELECT id, name FROM users WHERE admin_id=? AND status='ACTIVE' AND id!=?";
        const memberParams = role === 'admin' ? [adminId] : [adminId, userId];
        const [members] = await con.query(memberQuery, memberParams);

        // 2. Fetch Teams
        const [teams] = await con.query("SELECT id, name FROM teams WHERE admin_id=?", [adminId]);

        // 3. Fetch Tasks (Logic from your old app)
        let tasks = [];
        if (role === "admin") {
            const [t1] = await con.query(
                "SELECT id, title, description, priority, due_date, status, section, assigned_by, assigned_to, who_assigned FROM tasks WHERE admin_id=? AND assigned_to=0 AND who_assigned='admin' ORDER BY due_date ASC",
                [adminId]
            );
            const [t2] = await con.query(
                `SELECT t.*, u.name AS assigned_by_name FROM tasks t 
                 JOIN users u ON t.assigned_by = u.id 
                 WHERE t.admin_id=? AND t.assigned_to=0 AND (t.who_assigned='user' OR t.who_assigned='owner')`,
                [adminId]
            );
            tasks = [...t1, ...t2];
        } else {
            const [t1] = await con.query(
                "SELECT t.*, a.name AS assigned_by_name FROM tasks t JOIN admins a ON t.assigned_by = a.id WHERE t.admin_id=? AND t.assigned_to=? ORDER BY due_date ASC",
                [adminId, userId]
            );
            const [t2] = await con.query(
                "SELECT * FROM tasks WHERE admin_id=? AND assigned_to=? AND (who_assigned='user' OR who_assigned='owner') AND assigned_by=? ORDER BY due_date ASC",
                [adminId, userId, userId]
            );
            const [t3] = await con.query(
                "SELECT t.*, u.name AS assigned_by_name FROM tasks t JOIN users u ON t.assigned_by = u.id WHERE t.admin_id=? AND t.assigned_to=? AND (t.who_assigned='user' OR t.who_assigned='owner') AND t.assigned_by != ?",
                [adminId, userId, userId]
            );
            tasks = [...t1, ...t2, ...t3];
        }

        res.json({ 
            success: true, 
            tasks, 
            members, 
            teams, 
            user: { userId, role, adminId } 
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: "Database Error" });
    }
});

export default router;