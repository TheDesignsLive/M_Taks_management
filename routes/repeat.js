//repeat.js
import express from 'express';
import db from '../config/db.js';

const router = express.Router();

// Set repeat type on a task
router.post('/set-repeat', async (req, res) => {
    if (!req.session.role) return res.status(401).json({ success: false });
    try {
        const { task_id, repeat_type } = req.body; // 'none','daily','weekly','monthly'
        
        // Update the task itself
        await db.execute(
            'UPDATE tasks SET repeat_type=? WHERE id=?',
            [repeat_type, task_id]
        );

        if (repeat_type === 'none') {
            // Remove template if turning off
            await db.execute('DELETE FROM task_templates WHERE id=?', [task_id]);
            return res.json({ success: true });
        }

        // Get task details to build the template
        const [rows] = await db.execute(
            'SELECT * FROM tasks WHERE id=?', [task_id]
        );
        if (rows.length === 0) return res.json({ success: false });
        const task = rows[0];

        // Upsert template (delete old + insert new)
        await db.execute('DELETE FROM task_templates WHERE id=?', [task_id]);
        await db.execute(
            `INSERT INTO task_templates 
             (id, admin_id, title, description, priority, assigned_to, assigned_by, who_assigned, section, repeat_type, original_date, last_spawned)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                task_id,
                task.admin_id,
                task.title,
                task.description,
                task.priority,
                task.assigned_to,
                task.assigned_by,
                task.who_assigned,
                task.section,
                repeat_type,
                task.due_date ? (typeof task.due_date === 'string' ? task.due_date.split('T')[0] : task.due_date.toISOString().split('T')[0]) : new Date().toISOString().split('T')[0],
                null
            ]
        );

        return res.json({ success: true });
    } catch (err) {
        console.error('set-repeat error:', err);
        return res.status(500).json({ success: false });
    }
});

export default router;