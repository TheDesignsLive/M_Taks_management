import express from 'express';
import cors from 'cors';
import adminRoutes from './routes/routesData.js'; // Extension .js zaroori hai

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/admins', adminRoutes);

const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});