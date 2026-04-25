// ... (imports)

const app = express();
app.use(cors());
app.use(express.json());

// 1. Pehle API Routes aane chahiye
app.use('/api/admins', adminRoutes);

// 2. Phir Static files (React ka build)
app.use(express.static(path.join(__dirname, 'dist')));

// 3. SABSE LAST mein ye '*' wala route hona chahiye
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});