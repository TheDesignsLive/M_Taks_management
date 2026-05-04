// server.js - mobile version
import express from 'express';
import { createServer } from 'http';           // ✅ ADD
import { Server } from 'socket.io';            // ✅ ADD
import cors from 'cors';
import session from 'express-session';
import MySQLStoreFactory from 'express-mysql-session';
import con from './config/db.js';
import authRoutes from './routes/auth.js';
import taskRoutes from './routes/tasks.js'; 
import notificationRoutes from './routes/notifications.js';
import Profile from './routes/profile.js';
import memberActions from './routes/memberActions.js';
import sentmail from './routes/sentMail.js';
import Settings from './routes/settings.js';
import assign_by_me from './routes/assign_by_me.js';
import view_member from './routes/view_member.js';
import teams from './routes/view_teams.js';
import roles from './routes/view_roles.js';
import Home from './routes/home.js';
import AllMemberTask from './routes/all_member_task.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

const app = express();
const httpServer = createServer(app);          // ✅ ADD

// ✅ ADD — Socket.IO setup
const io = new Server(httpServer, {
    cors: {
        origin: ["http://localhost:5173", "http://127.0.0.1:5173"],
        credentials: true
    }
});

// ✅ ADD — attach io to every request so req.io works in all routes
app.use((req, res, next) => {
    req.io = io;
    next();
});

const MySQLStore = MySQLStoreFactory(session);
const sessionStore = new MySQLStore({}, con);

app.use(cors({
    origin: ["http://localhost:5173", "http://127.0.0.1:5173"],
    credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(session({
    key: 'tms_session_cookie',
    secret: 'tms_secret_key_2026',
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: false, 
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000
    }
}));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/profile', Profile);
app.use('/api/notifications', memberActions);
app.use('/api/settings', Settings);
app.use('/api/sentmail', sentmail);

app.use('/api/assign_by_me', assign_by_me);
app.use('/api/view_member', view_member);
app.use('/api/teams', teams);
app.use('/api/roles', roles);
app.use('/api/home', Home);
app.use('/api/all-member-tasks', AllMemberTask);

app.use(express.static('dist'));

const SHARED_IMAGES_PATH = '/home/u213405511/nodejs/public/images';
app.use('/public/images', express.static(SHARED_IMAGES_PATH));
app.use('/public', express.static('public'));

app.get('/health', (req, res) => res.send("Backend is 100% OK"));
app.get('/', (req, res) => res.send("Server is running."));

// ✅ Desktop pings this when a task changes → broadcast to mobile clients
app.post('/api/notify-task-update', (req, res) => {
    const secret = req.headers['x-mobile-secret'];
    if (secret !== 'tms_mobile_bridge_2026') {
        return res.status(403).json({ success: false, message: 'Forbidden' });
    }
    const source = req.headers['x-source'];
    if (source !== 'desktop') {
        return res.status(400).json({ success: false, message: 'Bad source' });
    }
    io.emit('update_tasks');
    console.log('[Mobile] 🔔 task update broadcast triggered by desktop');
    return res.json({ success: true });
});

// ✅ Desktop pings this when profile changes → broadcast to mobile clients
app.post('/api/notify-profile-update', (req, res) => {
    const secret = req.headers['x-mobile-secret'];
    if (secret !== 'tms_mobile_bridge_2026') {
        return res.status(403).json({ success: false, message: 'Forbidden' });
    }
    const source = req.headers['x-source'];
    if (source !== 'desktop') {
        return res.status(400).json({ success: false, message: 'Bad source' });
    }
    io.emit('update_profile');
    console.log('[Mobile] 👤 profile update broadcast triggered by desktop');
    return res.json({ success: true });
});

// ✅ Desktop pings this when members change → broadcast to mobile clients
app.post('/api/notify-members-update', (req, res) => {
    const secret = req.headers['x-mobile-secret'];
    if (secret !== 'tms_mobile_bridge_2026') {
        return res.status(403).json({ success: false, message: 'Forbidden' });
    }
    const source = req.headers['x-source'];
    if (source !== 'desktop') {
        return res.status(400).json({ success: false, message: 'Bad source' });
    }
    io.emit('update_members');
    console.log('[Mobile] 👥 members update broadcast triggered by desktop');
    return res.json({ success: true });
});

// ✅ Desktop pings this when roles change → broadcast to mobile clients
app.post('/api/notify-roles-update', (req, res) => {
    const secret = req.headers['x-mobile-secret'];
    if (secret !== 'tms_mobile_bridge_2026') {
        return res.status(403).json({ success: false, message: 'Forbidden' });
    }
    const source = req.headers['x-source'];
    if (source !== 'desktop') {
        return res.status(400).json({ success: false, message: 'Bad source' });
    }
    io.emit('update_roles');
    console.log('[Mobile] 🛡️ roles update broadcast triggered by desktop');
    return res.json({ success: true });
});

// ✅ Desktop pings this when teams change → broadcast to mobile clients
app.post('/api/notify-teams-update', (req, res) => {
    const secret = req.headers['x-mobile-secret'];
    if (secret !== 'tms_mobile_bridge_2026') {
        return res.status(403).json({ success: false, message: 'Forbidden' });
    }
    const source = req.headers['x-source'];
    if (source !== 'desktop') {
        return res.status(400).json({ success: false, message: 'Bad source' });
    }
    io.emit('update_teams');
    console.log('[Mobile] 🏢 teams update broadcast triggered by desktop');
    return res.json({ success: true });
});

// ✅ Desktop pings when announcement added → broadcast to mobile
app.post('/api/notify-announcement-add', async (req, res) => {
    const secret = req.headers['x-mobile-secret'];
    if (secret !== 'tms_mobile_bridge_2026') return res.status(403).json({ success: false });
    const source = req.headers['x-source'];
    if (source !== 'desktop') return res.status(400).json({ success: false });

    try {
        const { id } = req.body;   // desktop now sends the real insertId too
        if (!id) return res.status(400).json({ success: false });

        const [rows] = await con.query(`
            SELECT a.*, IF(a.role_id=0,'All Members',t.name) AS target_team_name,
            IF(a.role_id=0,'All Members',t.name) AS target_role,
            CASE WHEN a.who_added='ADMIN' THEN CONCAT(adm.name,' (Admin)')
                 WHEN a.who_added='OWNER' THEN CONCAT(usr.name,' (Admin)')
                 ELSE usr.name END AS added_by_name
            FROM announcements a
            LEFT JOIN teams t ON a.role_id=t.id
            LEFT JOIN admins adm ON a.added_by=adm.id AND a.who_added='ADMIN'
            LEFT JOIN users usr ON a.added_by=usr.id AND (a.who_added='USER' OR a.who_added='OWNER')
            WHERE a.id=?`, [id]);

        if (rows.length > 0) io.emit('new_announcement', rows[0]);
        console.log('[Mobile] 📢 new_announcement broadcast triggered by desktop, id:', id);
        return res.json({ success: true });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ success: false });
    }
});

// ✅ Desktop pings when announcement edited → broadcast to mobile
app.post('/api/notify-announcement-edit', async (req, res) => {
    const secret = req.headers['x-mobile-secret'];
    if (secret !== 'tms_mobile_bridge_2026') return res.status(403).json({ success: false });
    const source = req.headers['x-source'];
    if (source !== 'desktop') return res.status(400).json({ success: false });

    try {
        const { id } = req.body;
        if (!id) return res.status(400).json({ success: false });

        const [rows] = await con.query(`
            SELECT a.*, IF(a.role_id=0,'All Members',t.name) AS target_team_name,
            IF(a.role_id=0,'All Members',t.name) AS target_role,
            CASE WHEN a.who_added='ADMIN' THEN CONCAT(adm.name,' (Admin)')
                 WHEN a.who_added='OWNER' THEN CONCAT(usr.name,' (Admin)')
                 ELSE usr.name END AS added_by_name
            FROM announcements a
            LEFT JOIN teams t ON a.role_id=t.id
            LEFT JOIN admins adm ON a.added_by=adm.id AND a.who_added='ADMIN'
            LEFT JOIN users usr ON a.added_by=usr.id AND (a.who_added='USER' OR a.who_added='OWNER')
            WHERE a.id=?`, [id]);

        if (rows.length > 0) io.emit('edit_announcement', rows[0]);
        console.log('[Mobile] ✏️ edit_announcement broadcast triggered by desktop, id:', id);
        return res.json({ success: true });
    } catch (err) {
        return res.status(500).json({ success: false });
    }
});

// ✅ Desktop pings when announcement deleted → broadcast to mobile
app.post('/api/notify-announcement-delete', (req, res) => {
    const secret = req.headers['x-mobile-secret'];
    if (secret !== 'tms_mobile_bridge_2026') return res.status(403).json({ success: false });
    const source = req.headers['x-source'];
    if (source !== 'desktop') return res.status(400).json({ success: false });
    const { id } = req.body;
    if (!id) return res.status(400).json({ success: false });
    io.emit('delete_announcement', id);
    console.log('[Mobile] 🗑️ delete_announcement broadcast, id:', id);
    return res.json({ success: true });
});




// ✅ CHANGE app.listen → httpServer.listen
const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`🚀 Server running on port ${PORT}`);
});