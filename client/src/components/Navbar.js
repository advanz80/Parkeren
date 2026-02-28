import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  function handleLogout() {
    logout();
    navigate('/login');
  }

  if (!user) return null;

  return (
    <nav className="navbar">
      <div className="navbar-inner">
        <Link to="/" className="navbar-brand">
          <span className="navbar-icon">⚡</span>
          HC Parkeren
        </Link>

        <button className="menu-toggle" onClick={() => setMenuOpen(!menuOpen)} aria-label="Menu">
          <span></span><span></span><span></span>
        </button>

        <div className={`navbar-links ${menuOpen ? 'open' : ''}`}>
          <Link to="/" onClick={() => setMenuOpen(false)}>Dashboard</Link>
          <Link to="/reserveren" onClick={() => setMenuOpen(false)}>Reserveren</Link>
          <Link to="/mijn-reserveringen" onClick={() => setMenuOpen(false)}>Mijn Reserveringen</Link>
          <Link to="/wachtlijst" onClick={() => setMenuOpen(false)}>Wachtlijst</Link>
          {user.role === 'admin' && (
            <Link to="/admin" onClick={() => setMenuOpen(false)}>Beheer</Link>
          )}
          <Link to="/profiel" onClick={() => setMenuOpen(false)}>Profiel</Link>
          <button onClick={handleLogout} className="btn-logout">Uitloggen</button>
        </div>
      </div>
    </nav>
  );
}
