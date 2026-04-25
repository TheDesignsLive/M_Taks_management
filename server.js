import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import adminRoutes from './routes/routesData.js'; // Extension check kar lena sahi ho

// ⚠️ Path setup (Hostinger ke liye zaroori)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

app.use(cors());
app.use(express.json());

// 1. API Routes (Pehle)
app.use('/api/admins', adminRoutes);

// 2. Static files serve karo (React ka 'dist' folder)
const distPath = path.join(__dirname, 'dist');
app.use(express.static(distPath));

// 3. Sabse Last mein - React routing handle karne ke liye
app.get('*', (req, res) => {
  res.sendFile(path.join(distPath, 'index.html'), (err) => {
    if (err) {
      // Agar 'dist' folder nahi mila toh ye error dikhega
      res.status(404).send("Error: 'dist' folder or index.html not found! Make sure you build your React app.");
    }
  });
});

// Port setting
const PORT = process.env.PORT || 5000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server running on port ${PORT}`);
});