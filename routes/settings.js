
import express from 'express';

const router = express.Router();

router.get('/session-info', (req, res) => {
  try {
    if (!req.session.role) {
      return res.json({ loggedIn: false });
    }

    let name = null;
    let role = req.session.role;

    if (req.session.role === 'admin') {
      name = req.session.adminName;
      role = 'admin';
    } else {
      name = req.session.userName;

      // ✅ MAIN FIX
      if (req.session.control_type === 'OWNER') {
        role = 'admin';   // 👈 treat OWNER as admin
      } else {
        role = 'user';
      }
    }

    return res.json({
      loggedIn: true,
      role: role,  // ✅ send updated role
      name: name,
      email: req.session.email,
      control_type: req.session.control_type
    });

  } catch (err) {
    console.error('Session info error:', err);
    return res.status(500).json({ loggedIn: false });
  }
});

export default router;





