import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { navLinks, pageData } from '../routes/routesData'; // Step 2 wali file se data mangwaya

// Ek simple component jo alag-alag pages ka content dikhayega
const PageLayout = ({ data }) => {
  return (
    <div style={{ padding: '20px', fontFamily: 'Arial' }}>
      <h1>{data.title}</h1>
      <p>{data.content}</p>
    </div>
  );
};

function App() {
  return (
    <Router>
      {/* Navigation Bar: Iska data navLinks se aa raha hai */}
      <nav style={{ 
        padding: '15px', 
        background: '#333', 
        display: 'flex', 
        gap: '20px' 
      }}>
        {navLinks.map((item) => (
          <Link 
            key={item.id} 
            to={item.path} 
            style={{ color: 'white', textDecoration: 'none', fontWeight: 'bold' }}
          >
            {item.title}
          </Link>
        ))}
      </nav>

      {/* Routes: Kaunsa rasta (path) khulne par kaunsa data dikhega */}
      <Routes>
        <Route path="/" element={<PageLayout data={pageData.home} />} />
        <Route path="/about" element={<PageLayout data={pageData.about} />} />
        <Route path="/services" element={<PageLayout data={pageData.services} />} />
      </Routes>
    </Router>
  );
}

export default App;