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

const app = express();

const server = createServer(app);              // ✅ ADD
const io = new Server(server, {               // ✅ ADD
  cors: {
    origin: ["http://localhost:5173", "http://127.0.0.1:5173", "https://m-tms.thedesigns.live"],
    credentials: true
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


// ✅ ADD — attach io to every request (same as desktop does)
app.use((req, res, next) => {
    req.io = io;
    next();
});

// ✅ ADD — secret key to verify cross-server calls
const NOTIFY_SECRET = 'tms_cross_notify_secret_2026';

// ✅ ADD — desktop calls this when it changes a task
app.post('/internal/notify-tasks', (req, res) => {
    if (req.headers['x-notify-secret'] !== NOTIFY_SECRET) {
        return res.status(403).json({ error: 'Forbidden' });
    }
    io.emit('update_tasks');
    res.json({ success: true });
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
app.use('/public', express.static('public'));

app.get('/health', (req, res) => {
    res.send("Backend is 100% OK");
});

app.get('/', (req, res) => {
    res.send("Server is running.");
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, "0.0.0.0", () => {          // ✅ server.listen not app.listen
    console.log(`🚀 Server running on port ${PORT}`);
});

export { io, NOTIFY_SECRET };  