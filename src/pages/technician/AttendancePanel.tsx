import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useAttendance } from '../../context/AttendanceContext';

export default function AttendancePanel() {
  const { user } = useAuth();
  const { getRecordToday, checkIn, checkOut } = useAttendance();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  if (!user) return null;
  const record = getRecordToday(user.id);

  const requestLocationAndAction = async (action: 'check-in' | 'check-out') => {
    setError(null);
    setSuccess(null);
    setLoading(true);

    if (!navigator.geolocation) {
      setError("La geolocalización no está soportada por tu navegador.");
      setLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          
          if (action === 'check-in') {
            await checkIn(lat, lng);
            setSuccess("¡Marcación de ingreso registrada correctamente!");
          } else {
            await checkOut(lat, lng);
            setSuccess("¡Marcación de salida registrada correctamente!");
          }
        } catch (err: any) {
          setError(err.message || "Error al registrar la marcación.");
        } finally {
          setLoading(false);
        }
      },
      (geoError) => {
        setError(`Error obteniendo ubicación: ${geoError.message}. Asegúrate de conceder permisos de ubicación.`);
        setLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  return (
    <div style={{ maxWidth: 600, margin: '0 auto' }}>
      <h1 className="page-title">Registro de Asistencia</h1>
      
      <div className="glass-card" style={{ textAlign: 'center', padding: '40px 20px', marginBottom: 24 }}>
        <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600, marginBottom: 8 }}>
          Hora Actual
        </div>
        <div style={{ fontSize: '4rem', fontWeight: 800, color: 'var(--accent-blue)', lineHeight: 1, fontFamily: 'monospace', letterSpacing: '-0.05em' }}>
          {currentTime.toLocaleTimeString('es-PE', { hour12: false })}
        </div>
        <div style={{ fontSize: '1rem', color: 'var(--text-secondary)', marginTop: 8 }}>
          {currentTime.toLocaleDateString('es-PE', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </div>
      </div>

      {error && (
        <div style={{ background: 'rgba(239, 68, 68, 0.1)', color: 'var(--accent-rose)', padding: 16, borderRadius: 12, marginBottom: 24, fontSize: '0.9rem', fontWeight: 500, border: '1px solid rgba(239, 68, 68, 0.2)' }}>
          ⚠️ {error}
        </div>
      )}

      {success && (
        <div style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#059669', padding: 16, borderRadius: 12, marginBottom: 24, fontSize: '0.9rem', fontWeight: 500, border: '1px solid rgba(16, 185, 129, 0.2)' }}>
          ✅ {success}
        </div>
      )}

      <div className="grid-2" style={{ gap: 16 }}>
        <div className="glass-card" style={{ textAlign: 'center', opacity: record?.check_in_time ? 0.7 : 1 }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 16 }}>Ingreso</h3>
          {record?.check_in_time ? (
            <div>
              <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-primary)' }}>{record.check_in_time}</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: 4 }}>Registrado</div>
              {record.tags.includes('Tarde') && (
                <div style={{ marginTop: 8 }}><span style={{ background: 'rgba(239,68,68,0.1)', color: 'var(--accent-rose)', padding: '2px 8px', borderRadius: 12, fontSize: '0.7rem', fontWeight: 600 }}>Tarde</span></div>
              )}
            </div>
          ) : (
            <button 
              className="btn btn-primary w-full" 
              onClick={() => requestLocationAndAction('check-in')}
              disabled={loading}
              style={{ padding: '16px 0', fontSize: '1.1rem' }}
            >
              {loading ? <span className="spinner" /> : 'Marcar Ingreso'}
            </button>
          )}
        </div>

        <div className="glass-card" style={{ textAlign: 'center', opacity: (!record?.check_in_time || record?.check_out_time) ? 0.7 : 1 }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 16 }}>Salida</h3>
          {record?.check_out_time ? (
            <div>
              <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-primary)' }}>{record.check_out_time}</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: 4 }}>Registrado</div>
            </div>
          ) : (
            <button 
              className="btn w-full" 
              onClick={() => requestLocationAndAction('check-out')}
              disabled={loading || !record?.check_in_time}
              style={{ padding: '16px 0', fontSize: '1.1rem', background: 'var(--accent-purple)', color: 'white' }}
            >
              {loading ? <span className="spinner" /> : 'Marcar Salida'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
