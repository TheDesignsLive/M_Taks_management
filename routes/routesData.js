import express from 'express';
import db from '../config/db.js'; // Extension .js zaroori hai

const router = express.Router();

router.get('/all', async (req, res) => {
  try {
    const [rows] = await db.query("SELECT * FROM admins");
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;