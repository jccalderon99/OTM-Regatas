import { useState } from 'react';
import { useOTM } from '../context/OTMContext';
import { useAuth } from '../context/AuthContext';

export default function NotificationBell() {
  const { otms } = useOTM();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);

  if (!user) return null;

  // Simple notification logic based on recent OTM changes relevant to the user
  let notifications: string[] = [];
  if (user.role === 'requester') {
    const awaiting = otms.filter(o => o.area_sector === user.area_sector && o.status === 'awaiting_conformity');
    if (awaiting.length > 0) notifications.push(`Tienes ${awaiting.length} OTM(s) esperando tu conformidad.`);
  } else if (user.role === 'technician') {
    const assigned = otms.filter(o => o.technician_id === user.id && o.status === 'scheduled');
    if (assigned.length > 0) notifications.push(`Tienes ${assigned.length} nueva(s) tarea(s) programada(s).`);
  } else if (user.role === 'supervisor') {
    const pending = otms.filter(o => o.status === 'pending');
    if (pending.length > 0) notifications.push(`Hay ${pending.length} OTM(s) pendientes por asignar.`);
  }

  return (
    <div className="notif-bell" style={{ position: 'relative' }}>
      <button className="btn btn-icon btn-ghost" onClick={() => setOpen(!open)}>
        🔔
        {notifications.length > 0 && <span className="notif-dot" />}
      </button>

      {open && (
        <>
          <div style={{ position: 'fixed', inset: 0, zIndex: 90 }} onClick={() => setOpen(false)} />
          <div className="glass-card" style={{
            position: 'absolute', top: '100%', right: 0, marginTop: 8,
            width: 320, zIndex: 100, padding: 16
          }}>
            <h4 style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: 12, borderBottom: '1px solid var(--border)', paddingBottom: 8 }}>Notificaciones</h4>
            {notifications.length === 0 ? (
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>No tienes notificaciones nuevas.</p>
            ) : (
              <div className="flex-col gap-2">
                {notifications.map((msg, i) => (
                  <div key={i} style={{ fontSize: '0.85rem', padding: '8px 12px', background: 'var(--bg-primary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                    {msg}
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
