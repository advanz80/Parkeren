import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Profile from './pages/Profile';
import Reserve from './pages/Reserve';
import MyReservations from './pages/MyReservations';
import Waitlist from './pages/Waitlist';
import Admin from './pages/Admin';
import Confirm from './pages/Confirm';
import WaitlistClaim from './pages/WaitlistClaim';
import './App.css';

function AppRoutes() {
  const { user, loading } = useAuth();

  if (loading) return <div className="loading">Laden...</div>;

  return (
    <>
      <Navbar />
      <Routes>
        <Route path="/login" element={user ? <Navigate to="/" /> : <Login />} />
        <Route path="/register" element={user ? <Navigate to="/" /> : <Register />} />
        <Route path="/confirm/:token" element={<Confirm />} />
        <Route path="/waitlist/claim/:token" element={<WaitlistClaim />} />
        <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/profiel" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
        <Route path="/reserveren" element={<ProtectedRoute><Reserve /></ProtectedRoute>} />
        <Route path="/mijn-reserveringen" element={<ProtectedRoute><MyReservations /></ProtectedRoute>} />
        <Route path="/wachtlijst" element={<ProtectedRoute><Waitlist /></ProtectedRoute>} />
        <Route path="/admin" element={<ProtectedRoute adminOnly><Admin /></ProtectedRoute>} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
