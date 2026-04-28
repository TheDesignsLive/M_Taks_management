import express from 'express';
const router = express.Router();
import con from '../config/db.js';
import multer from 'multer';
import path from 'path';
import bcrypt from 'bcryptjs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ================= MULTER (PROFILE PIC) ====================
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, path.join(__dirname, '../../public/images'));
    },
    filename: function (req, file, cb) {
        const uniqueName = Date.now() + path.extname(file.originalname);
        cb(null, uniqueName);
    }
});

const fileFilter = (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (extname && mimetype) return cb(null, true);
    cb(new Error('Only images are allowed'));
};

const upload = multer({ storage: storage, fileFilter: fileFilter });

// ================= CHECK EMAIL ====================
router.post("/check-email", async (req, res) => {
    const { email } = req.body;
    try {
        const [rows] = await con.query("SELECT id FROM admins WHERE email=?", [email]);
        return res.json({ exists: rows.length > 0 });
    } catch (err) {
        return res.status(500).json({ status: 'error', message: "Database error" });
    }
});

// ================= SIGNUP ====================
router.post("/signup", (req, res) => {
    upload.single("profile_pic")(req, res, async (err) => {
        if (err) return res.status(400).json({ status: 'error', message: err.message });

        const { name, company_name, email, phone, password } = req.body;
        if (!name || !email || !password) {
            return res.status(400).json({ status: 'error', message: "Please fill all required fields" });
        }

        let profilePic = req.file ? req.file.filename : null;

        try {
            const hashedPassword = await bcrypt.hash(password, 10);
            const sql = "INSERT INTO admins (name, company_name, email, phone, password, profile_pic) VALUES (?,?,?,?,?,?)";
            const [result] = await con.query(sql, [name, company_name, email, phone, hashedPassword, profilePic]);

            // Set Admin Sessions
            req.session.adminId = result.insertId;
            req.session.role = "admin";
            req.session.email = email;
            req.session.adminName = name;
            req.session.control_type = "ADMIN"; // Default for Admin

            return res.json({ status: 'success', message: 'Account created!', redirect: '/home' });
        } catch (err) {
            if (err.code === 'ER_DUP_ENTRY') {
                return res.status(400).json({ status: 'error', message: "Email already exists ❌" });
            }
            return res.status(500).json({ status: 'error', message: "Something went wrong ❌" });
        }
    });
});

// ================= LOGIN =====================
router.post("/login", async (req, res) => {
    const { email, password, login_type } = req.body;

    if (!email || !password || !login_type) {
        return res.status(400).json({ status: 'error', message: "Please fill all fields ❌" });
    }

    try {
        let query = login_type === "admin" 
            ? "SELECT * FROM admins WHERE email=?" 
            : "SELECT u.*, r.control_type FROM users u JOIN roles r ON u.role_id = r.id WHERE u.email=? AND u.status='ACTIVE'";

        const [rows] = await con.query(query, [email]);

        if (rows.length === 0) {
            return res.status(401).json({ status: 'error', message: `Invalid ${login_type} credentials or account inactive ❌` });
        }

        const match = await bcrypt.compare(password, rows[0].password);
        if (!match) {
            return res.status(401).json({ status: 'error', message: "Incorrect password or Email ❌" });
        }

        // ================= SAVE SESSIONS =================
        if (login_type === "admin") {
            req.session.adminId = rows[0].id;
            req.session.role = "admin";
            req.session.adminName = rows[0].name;
            req.session.control_type = "ADMIN";
        } else {
            req.session.userId = rows[0].id;
            req.session.adminId = rows[0].admin_id;
            req.session.role_id = rows[0].role_id;
            req.session.userName = rows[0].name;
            req.session.control_type = rows[0].control_type; // ADMIN, PARTIAL, OWNER, etc.
            
            // Set role string based on control_type or defaults
            if (rows[0].control_type === 'OWNER') {
                req.session.role = "owner";
            } else {
                req.session.role = "user";
            }
        }
        req.session.email = rows[0].email;
        // ================================================

        return res.json({ status: 'success', message: 'Login successful!', redirect: '/home' });

    } catch (err) {
        console.error(err);
        return res.status(500).json({ status: 'error', message: "Database error ❌" });
    }
});

// ================= SESSION CHECK ====================
router.get("/session", (req, res) => {
    if (req.session.adminId || req.session.userId) {
        return res.json({ 
            loggedIn: true, 
            role: req.session.role,
            control_type: req.session.control_type,
            redirect: '/home' 
        });
    }
    res.json({ loggedIn: false });
});


// ================= LOGOUT =====================
router.post("/logout", (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).json({ status: 'error', message: "Could not log out" });
        }
        res.clearCookie('connect.sid'); // Session cookie delete karein
        return res.json({ status: 'success', message: "Logged out successfully" });
    });
});

export default router;