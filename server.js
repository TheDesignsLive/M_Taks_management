import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import adminRoutes from './routes/routesData.js';

// Path setup for ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

app.use(cors());
app.use(express.json());

// 1. API Routes (Inhe hamesha static files se pehle rakhein)
app.use('/api/admins', adminRoutes);

// 2. Static files setup (React ka 'dist' folder)
// Hostinger ke structure ke liye hum path.resolve ka use karenge
const distPath = path.resolve(__dirname, 'dist');
app.use(express.static(distPath));

// 3. React Routing handle karne ke liye (Sabse last mein)
app.get('*', (req, res) => {
  const indexPath = path.join(distPath, 'index.html');
  
  res.sendFile(indexPath, (err) => {
    if (err) {
      console.error("❌ Dist path error:", indexPath);
      res.status(404).send("Error: 'dist' folder or index.html not found! Build your React app and check File Manager.");
    }
  });
});

// Port configuration for Hostinger
const PORT = process.env.PORT || 5000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📂 Serving static files from: ${distPath}`);
});