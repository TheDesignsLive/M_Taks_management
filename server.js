// server.js- mobile version
import express from 'express';
import cors from 'cors';
import session from 'express-session';
import MySQLStoreFactory from 'express-mysql-session';
import con from './config/db.js'; // Tera DB connection yahan 
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
import path from 'path';                          // ✅ NEW: needed for shared path
import { fileURLToPath } from 'url';              // ✅ NEW: needed for __dirname in ESM
import { createServer } from 'http';           // ✅ NEW
import { Server as SocketIO } from 'socket.io'; // ✅ NEW
import { notifyDesktop } from './utils/notifyDesktop.js'; // ✅ NEW: import the desktop notifier




// ✅ NEW: __dirname fix for ESM modules
const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

const app = express();


// ✅ NEW: Create HTTP server so Socket.IO can attach to it
const httpServer = createServer(app);

// ✅ NEW: Initialize Socket.IO on mobile server
const io = new SocketIO(httpServer, {
    cors: {
        origin: ["http://localhost:5173", "http://127.0.0.1:5173", "https://m-tms.thedesigns.live"],
        credentials: true,
    }
});

const MySQLStore = MySQLStoreFactory(session);
const sessionStore = new MySQLStore({}, con);

// ✅ CORS — allow frontend origin with credentials
app.use(cors({
    origin: ["http://localhost:5173", "http://127.0.0.1:5173"],
    credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session Setup
// Updated Session Setup (Ab sessions DB mein save honge)
app.use(session({
    key: 'tms_session_cookie',
    secret: 'tms_secret_key_2026',
    store: sessionStore, // 🔥 Ye line RAM crash ko rokti hai
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: false, 
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000
    }
}));


// ✅ NEW: Make io available in all route handlers via req.io
app.use((req, res, next) => {
    req.io = io;
    next();
});


// Routes
app.use('/api/auth', authRoutes);
app.use('/api/tasks', taskRoutes); // ✅ ADD THIS — all task APIs at /api/tasks/*
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
// app.use('/api/sent-mail', sent_mail);
app.use(express.static('dist'));




// ✅ NEW: Serve images from DESKTOP app's shared images folder
// Both apps now read/write from the SAME folder on Hostinger
const SHARED_IMAGES_PATH = '/home/u213405511/nodejs/public/images';
app.use('/public/images', express.static(SHARED_IMAGES_PATH));


app.use('/public', express.static('public'));

// ✅ NEW: Desktop pings this when a desktop task changes
// Mobile then broadcasts to all mobile clients
// NEW — paste this in mobile server.js
app.post('/api/notify-task-update', (req, res) => {
    const secret = req.headers['x-mobile-secret'];
    if (secret !== 'tms_mobile_bridge_2026') {
        return res.status(403).json({ success: false, message: 'Forbidden' });
    }
    // ✅ Only emit if ping came from desktop — prevents infinite loop
    const source = req.headers['x-source'];
    if (source !== 'desktop') {
        return res.status(400).json({ success: false, message: 'Bad source' });
    }
    io.emit('update_tasks');
    console.log('[Mobile] 🔔 task update broadcast triggered by desktop');
    return res.json({ success: true });
});

app.get('/health', (req, res) => {
    res.send("Backend is 100% OK");
});

app.get('/', (req, res) => {
    res.send("Server is running.");
});

// ✅ NEW: Use httpServer instead of app to listen (required for Socket.IO)
const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`🚀 Server running on port ${PORT}`);
});
