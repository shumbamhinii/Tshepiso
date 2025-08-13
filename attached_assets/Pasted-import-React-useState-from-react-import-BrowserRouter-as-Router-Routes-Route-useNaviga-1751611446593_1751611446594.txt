import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate } from 'react-router-dom';
import PricingPage from './PricingPage';
import QoutationsPage from './QoutationsPage';

function HomePage() {
  const [isHoverStart, setIsHoverStart] = useState(false);
  const [isHoverLearn, setIsHoverLearn] = useState(false); // This state needs to be used for the Quotations button
  const navigate = useNavigate();

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>Tshepiso Branding</h1>
      <div style={styles.buttonContainer}>
        <button
          style={{
            ...styles.button,
            ...(isHoverStart ? styles.buttonOutlineHover : {}),
          }}
          onClick={() => navigate('/pricing')}
          onMouseEnter={() => setIsHoverStart(true)}
          onMouseLeave={() => setIsHoverStart(false)}
          aria-label="Go to Pricing Page"
        >
          Pricing
        </button>
        <button
          style={{
            ...styles.buttonOutline,
            // Apply the hover style based on 'isHoverLearn'
            ...(isHoverLearn ? styles.buttonHover : {}),
          }}
          onClick={() => navigate('/qoutes')}
          // Set 'isHoverLearn' on mouse enter for the Quotations button
          onMouseEnter={() => setIsHoverLearn(true)}
          // Reset 'isHoverLearn' on mouse leave for the Quotations button
          onMouseLeave={() => setIsHoverLearn(false)}
          aria-label="Go to Quotations Page"
        >
          Quotations
        </button>
      </div>
    </div>
  );
}

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/pricing" element={<PricingPage />} />
        <Route path="/qoutes" element={<QoutationsPage/>} />
      </Routes>
    </Router>
  );
}

const styles = {
  container: {
    height: '100vh',
    width: '100vw',
    background: '#fff', // switched to white background for consistency with pricing page
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '1rem',
  },
  title: {
    fontSize: '3rem',
    color: '#c88a31',
    marginBottom: '3rem',
    fontWeight: '900',
    letterSpacing: '0.1rem',
    fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
    textShadow: '0 2px 6px rgba(200, 138, 49, 0.5)',
  },
  buttonContainer: {
    display: 'flex',
    gap: '2rem',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  button: {
    width: '400px',
    height: '240px',
    background: '#1a1919',
    color: '#c88a31',
    border: 'none',
    borderRadius: '16px',
    cursor: 'pointer',
    fontWeight: 'bold',
    fontSize: '1.8rem',
    boxShadow: '0 8px 20px rgba(200, 138, 49, 0.3)',
    transition: 'transform 0.3s ease, box-shadow 0.3s ease',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    userSelect: 'none',
    textShadow: '0 1px 2px rgba(0,0,0,0.5)',
  },
  buttonHover: {
    transform: 'scale(1.1)',
    boxShadow: '0 15px 30px rgba(200, 138, 49, 0.6)',
  },
  buttonOutline: {
    width: '400px',
    height: '240px',
    background: 'transparent',
    color: '#c88a31',
    border: '3px solid #c88a31',
    borderRadius: '16px',
    cursor: 'pointer',
    fontWeight: 'bold',
    fontSize: '1.8rem',
    boxShadow: '0 8px 20px rgba(200, 138, 49, 0.3)',
    transition: 'transform 0.3s ease, box-shadow 0.3s ease',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    userSelect: 'none',
    textShadow: '0 1px 2px rgba(0,0,0,0.5)',
  },
  buttonOutlineHover: {
    transform: 'scale(1.1)',
    boxShadow: '0 15px 30px rgba(200, 138, 49, 0.6)',
    backgroundColor: 'rgba(200, 138, 49, 0.1)',
  },
};

export default App;