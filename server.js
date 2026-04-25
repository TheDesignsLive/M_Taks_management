import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import adminRoutes from './routes/routesData.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());

// API Routes
app.use('/api/admins', adminRoutes);

// Static files (React Build)
const distPath = path.resolve(__dirname, 'dist');
app.use(express.static(distPath));

// React routing
app.get('*', (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, "0.0.0.0", () => {
    console.log(`🚀 Server + Frontend Running on port ${PORT}`);
});