import React, { useState } from 'react';
import { OTMRequest } from '../types';
import { useOTM } from '../context/OTMContext';
import SignaturePad from './SignaturePad';

export default function ConformityModal({ otm, onClose }: { otm: OTMRequest; onClose: () => void }) {
  const { submitConformity } = useOTM();
  const [rating, setRating] = useState(0);
  const [notes, setNotes] = useState('');
  const [signature, setSignature] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = () => {
    if (rating === 0) return;
    submitConformity(otm.id, rating, notes, signature);
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-content" onClick={e => e.stopPropagation()} style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🎉</div>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>¡Conformidad Registrada!</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: 8 }}>La OTM {otm.otm_code} ha sido cerrada exitosamente.</p>
          <button className="btn btn-primary" style={{ marginTop: 20 }} onClick={onClose}>Cerrar</button>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-title">Conformidad de Servicio</div>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: 20 }}>
          OTM: <strong>{otm.otm_code}</strong> — {otm.failure_type}
        </p>

        {/* Star Rating */}
        <div className="form-group" style={{ marginBottom: 20 }}>
          <label className="form-label">Calificación del trabajo *</label>
          <div className="stars-rating" style={{ marginTop: 8 }}>
            {[1, 2, 3, 4, 5].map(n => (
              <span key={n} className={`star ${n <= rating ? 'filled' : ''}`} onClick={() => setRating(n)}>
                {n <= rating ? '★' : '☆'}
              </span>
            ))}
          </div>
        </div>

        {/* Observation */}
        <div className="form-group" style={{ marginBottom: 20 }}>
          <label className="form-label">Observaciones</label>
          <textarea className="form-textarea" placeholder="Comentarios sobre el trabajo realizado..." value={notes} onChange={e => setNotes(e.target.value)} />
        </div>

        {/* Signature */}
        <div className="form-group" style={{ marginBottom: 24 }}>
          <label className="form-label">Firma de Conformidad</label>
          <SignaturePad onSignatureChange={setSignature} strokeColor="#0f172a" lineWidth={3} />
        </div>

        <div className="flex gap-3" style={{ justifyContent: 'flex-end' }}>
          <button className="btn btn-secondary" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary" onClick={handleSubmit} disabled={rating === 0}>✓ Confirmar</button>
        </div>
      </div>
    </div>
  );
}
