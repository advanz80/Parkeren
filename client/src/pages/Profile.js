import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';

const API = process.env.REACT_APP_API_URL || '';

export default function Profile() {
  const { user, token, updateUser } = useAuth();
  const [form, setForm] = useState({
    first_name: user?.first_name || '',
    last_name: user?.last_name || '',
    phone: user?.phone || '',
    license_plate: user?.license_plate || '',
    password: '',
    confirmPassword: ''
  });
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setMessage('');

    if (form.password && form.password !== form.confirmPassword) {
      return setError('Wachtwoorden komen niet overeen.');
    }

    setLoading(true);
    try {
      const body = {
        first_name: form.first_name,
        last_name: form.last_name,
        phone: form.phone,
        license_plate: form.license_plate
      };
      if (form.password) body.password = form.password;

      const res = await fetch(`${API}/api/auth/profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      updateUser(data.user);
      setMessage('Profiel succesvol bijgewerkt!');
      setForm(prev => ({ ...prev, password: '', confirmPassword: '' }));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page">
      <div className="container">
        <h1>Mijn Profiel</h1>
        <div className="card">
          <form onSubmit={handleSubmit}>
            {message && <div className="alert alert-success">{message}</div>}
            {error && <div className="alert alert-error">{error}</div>}

            <div className="form-group">
              <label>Emailadres</label>
              <input type="email" value={user?.email || ''} disabled />
              <small>Emailadres kan niet gewijzigd worden.</small>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Voornaam</label>
                <input type="text" name="first_name" value={form.first_name} onChange={handleChange} required />
              </div>
              <div className="form-group">
                <label>Achternaam</label>
                <input type="text" name="last_name" value={form.last_name} onChange={handleChange} required />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Telefoonnummer</label>
                <input type="tel" name="phone" value={form.phone} onChange={handleChange} required />
              </div>
              <div className="form-group">
                <label>Kenteken</label>
                <input type="text" name="license_plate" value={form.license_plate} onChange={handleChange} required />
              </div>
            </div>

            <hr />
            <h3>Wachtwoord wijzigen</h3>

            <div className="form-row">
              <div className="form-group">
                <label>Nieuw wachtwoord</label>
                <input type="password" name="password" value={form.password} onChange={handleChange} placeholder="Laat leeg om niet te wijzigen" minLength="6" />
              </div>
              <div className="form-group">
                <label>Bevestig wachtwoord</label>
                <input type="password" name="confirmPassword" value={form.confirmPassword} onChange={handleChange} placeholder="Herhaal wachtwoord" />
              </div>
            </div>

            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Opslaan...' : 'Profiel Opslaan'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
