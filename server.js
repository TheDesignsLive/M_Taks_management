import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Pehle wale saare imports aur routes rehne dena...

// 1. Static files serve karo (React ka build folder)
app.use(express.static(path.join(__dirname, 'dist')));

// 2. Har request par React ki index.html bhejo (taaki page refresh pe error na aaye)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// Port wahi rehne do jo pehle tha
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server + Frontend running on port ${PORT}`);
});