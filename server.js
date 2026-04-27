import express from 'express';
import cors from 'cors';
import session from 'express-session';
import authRoutes from './routes/auth.js'; 

const app = express();

// ✅ FIX: CORS must allow specific origin and credentials for sessions to work
app.use(cors({
    origin: ["http://localhost:5173", "http://127.0.0.1:5173"],
    credentials: true
})); 

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session Setup
app.use(session({
    secret: 'tms_secret_key_2026',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: false, // Set to true only if using HTTPS
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000 
    }
}));

// Routes
app.use('/api/auth', authRoutes); 

app.use(express.static('dist'));
app.use('/public', express.static('public'));

app.get('/health', (req, res) => {
    res.send("Backend is 100% OK");
});

app.get('/', (req, res) => {
    res.send("Server is running.");
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, "0.0.0.0", () => {
    console.log(`🚀 Server running on port ${PORT}`);
});