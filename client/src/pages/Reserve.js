import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

const API = process.env.REACT_APP_API_URL || '';

export default function Reserve() {
  const { token } = useAuth();
  const [plazas, setPlazas] = useState([]);
  const [selectedPlaza, setSelectedPlaza] = useState(null);
  const [selectedDate, setSelectedDate] = useState(getToday());
  const [availability, setAvailability] = useState(null);
  const [selectedSpot, setSelectedSpot] = useState(null);
  const [startSlot, setStartSlot] = useState('');
  const [endSlot, setEndSlot] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch(`${API}/api/reservations/plazas`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(setPlazas);
  }, [token]);

  useEffect(() => {
    if (selectedPlaza && selectedDate) {
      setLoading(true);
      fetch(`${API}/api/reservations/availability?plaza_id=${selectedPlaza.id}&date=${selectedDate}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
        .then(r => r.json())
        .then(data => { setAvailability(data); setLoading(false); })
        .catch(() => setLoading(false));
    }
  }, [selectedPlaza, selectedDate, token]);

  function getToday() {
    return new Date().toISOString().split('T')[0];
  }

  function getMaxDate() {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().split('T')[0];
  }

  function generateTimeSlots() {
    const slots = [];
    for (let h = 6; h < 22; h++) {
      slots.push(`${String(h).padStart(2, '0')}:00`);
      slots.push(`${String(h).padStart(2, '0')}:30`);
    }
    slots.push('22:00');
    return slots;
  }

  function isSlotBooked(spot, time) {
    if (!availability) return false;
    const spotData = availability.spots.find(s => s.id === spot.id);
    if (!spotData) return false;

    const slotTime = new Date(`${selectedDate}T${time}:00`);
    return spotData.reservations.some(r => {
      const start = new Date(r.start_time);
      const end = new Date(r.end_time);
      return slotTime >= start && slotTime < end;
    });
  }

  function getMaxEndSlots() {
    if (!selectedSpot || !startSlot) return [];
    const allSlots = generateTimeSlots();
    const startIdx = allSlots.indexOf(startSlot);
    const maxSlots = (selectedSpot.max_duration_hours * 2);
    const endSlots = [];

    for (let i = startIdx + 1; i <= Math.min(startIdx + maxSlots, allSlots.length - 1); i++) {
      const time = allSlots[i];
      if (isSlotBooked(selectedSpot, allSlots[i - 1]) && i > startIdx + 1) break;
      endSlots.push(time);
      if (isSlotBooked(selectedSpot, time)) break;
    }

    return endSlots;
  }

  async function handleReserve() {
    if (!selectedSpot || !startSlot || !endSlot) {
      return setError('Selecteer een plek, starttijd en eindtijd.');
    }

    setError('');
    setMessage('');
    setLoading(true);

    try {
      const res = await fetch(`${API}/api/reservations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          spot_id: selectedSpot.id,
          start_time: `${selectedDate}T${startSlot}:00`,
          end_time: `${selectedDate}T${endSlot}:00`
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setMessage(data.message);
      setSelectedSpot(null);
      setStartSlot('');
      setEndSlot('');
      // Refresh availability
      const avRes = await fetch(`${API}/api/reservations/availability?plaza_id=${selectedPlaza.id}&date=${selectedDate}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAvailability(await avRes.json());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const timeSlots = generateTimeSlots();

  return (
    <div className="page">
      <div className="container">
        <h1>Laadplek Reserveren</h1>

        {message && <div className="alert alert-success">{message}</div>}
        {error && <div className="alert alert-error">{error}</div>}

        <div className="card">
          <h2>1. Kies een laadplein</h2>
          <div className="plaza-grid">
            {plazas.map(p => (
              <button
                key={p.id}
                className={`plaza-card ${selectedPlaza?.id === p.id ? 'selected' : ''}`}
                onClick={() => { setSelectedPlaza(p); setSelectedSpot(null); setStartSlot(''); setEndSlot(''); }}
              >
                <h3>{p.name}</h3>
                <p>{p.location_description}</p>
                <span className="spot-count">{p.spots.length} laadplek{p.spots.length !== 1 ? 'ken' : ''}</span>
              </button>
            ))}
          </div>
        </div>

        {selectedPlaza && (
          <div className="card">
            <h2>2. Kies een datum</h2>
            <input
              type="date"
              value={selectedDate}
              min={getToday()}
              max={getMaxDate()}
              onChange={e => { setSelectedDate(e.target.value); setSelectedSpot(null); setStartSlot(''); setEndSlot(''); }}
              className="date-input"
            />
          </div>
        )}

        {selectedPlaza && availability && (
          <div className="card">
            <h2>3. Kies een laadplek en tijdslot</h2>
            <p className="text-muted">Groen = beschikbaar, Rood = bezet. Klik op een plek om te selecteren.</p>

            <div className="availability-table-wrapper">
              <table className="availability-table">
                <thead>
                  <tr>
                    <th>Tijd</th>
                    {availability.spots.map(spot => (
                      <th key={spot.id} className={selectedSpot?.id === spot.id ? 'selected-col' : ''}>
                        {spot.spot_number}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {timeSlots.map(time => (
                    <tr key={time}>
                      <td className="time-label">{time}</td>
                      {availability.spots.map(spot => {
                        const booked = isSlotBooked(spot, time);
                        const isSelected = selectedSpot?.id === spot.id && startSlot && endSlot &&
                          time >= startSlot && time < endSlot;
                        return (
                          <td
                            key={spot.id}
                            className={`slot-cell ${booked ? 'booked' : 'available'} ${isSelected ? 'selected-slot' : ''}`}
                            onClick={() => {
                              if (!booked) {
                                setSelectedSpot(spot);
                                if (!startSlot || selectedSpot?.id !== spot.id) {
                                  setStartSlot(time);
                                  setEndSlot('');
                                }
                              }
                            }}
                          />
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {selectedSpot && (
              <div className="booking-form">
                <h3>Reservering voor plek {selectedSpot.spot_number}</h3>
                <p>Max. laadtijd: {selectedSpot.max_duration_hours} uur</p>

                <div className="form-row">
                  <div className="form-group">
                    <label>Starttijd</label>
                    <select value={startSlot} onChange={e => { setStartSlot(e.target.value); setEndSlot(''); }}>
                      <option value="">Kies starttijd</option>
                      {timeSlots.map(t => (
                        <option key={t} value={t} disabled={isSlotBooked(selectedSpot, t)}>{t}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Eindtijd</label>
                    <select value={endSlot} onChange={e => setEndSlot(e.target.value)} disabled={!startSlot}>
                      <option value="">Kies eindtijd</option>
                      {getMaxEndSlots().map(t => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <button className="btn btn-primary" onClick={handleReserve} disabled={loading || !startSlot || !endSlot}>
                  {loading ? 'Bezig...' : 'Reserveren'}
                </button>
              </div>
            )}

            {availability.waitlistCount > 0 && (
              <p className="text-muted">Er staan {availability.waitlistCount} personen op de wachtlijst voor deze dag.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
