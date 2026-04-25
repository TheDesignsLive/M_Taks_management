import express from 'express';
import cors from 'cors';
import adminRoutes from './routes/routesData.js';

const app = express();
app.use(cors());
app.use(express.json());

// 1. Backend Routes
app.use('/api/admins', adminRoutes);

// 2. Frontend Serve (Jugad)
// Express ko bolo ki current folder ke 'dist' folder ko use kare
app.use(express.static('dist'));

// 3. Simple Test Route (Check karne ke liye ki backend zinda hai)
app.get('/health', (req, res) => {
  res.send("Backend is 100% OK");
});

// 4. Default Route
app.get('/', (req, res) => {
  // Bina path module ke seedha string bhejo
  res.send("Server is running. If you see this, Frontend dist folder connection is the issue.");
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server running on port ${PORT}`);
});