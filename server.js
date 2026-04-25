import express from 'express';
import cors from 'cors';
import path from 'path';
import adminRoutes from './routes/routesData.js';

const app = express();
app.use(cors());
app.use(express.json());

// 1. API Routes
app.use('/api/admins', adminRoutes);

// 2. Static files serve karo (Ekdum direct rasta)
app.use(express.static('dist'));

// 3. React Routing
app.get('*', (req, res) => {
    // Agar rasta nahi mil raha toh error handle karega
    res.sendFile(path.resolve('dist', 'index.html'), (err) => {
        if (err) {
            res.status(500).send("Backend is Running, but Frontend 'dist' folder is missing. Run npm run build.");
        }
    });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, "0.0.0.0", () => {
    console.log(`🚀 Server Running on Port ${PORT}`);
});