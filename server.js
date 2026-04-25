import express from 'express';
import cors from 'cors';
import path from 'path'; // Ye line add karo
import adminRoutes from './routes/routesData.js';

const app = express();
app.use(cors());
app.use(express.json());

// 1. API Routes (Inhe pehle hi rehne do)
app.use('/api/admins', adminRoutes);

// 2. Frontend setup (Ye lines add karo)
// Hostinger ko bolo ki 'dist' folder mein static files hain
app.use(express.static('dist'));

// 3. React Routing (Ye sabse niche, app.listen se upar)
app.get('*', (req, res) => {
  // Bina __dirname ke seedha path resolve use karo
  res.sendFile(path.resolve('dist', 'index.html'));
});

const PORT = process.env.PORT || 5001; // Port 5001 hai toh wahi rehne do
app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server + Frontend running on port ${PORT}`);
});