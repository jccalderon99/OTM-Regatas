import React from 'react';
import { OTMStatus, STATUS_LABELS } from '../types';

export default function StatusBadge({ status }: { status: OTMStatus }) {
  return (
    <span className={`status-badge status-${status}`}>
      <span style={{ fontSize: '0.5rem' }}>●</span>
      {STATUS_LABELS[status]}
    </span>
  );
}
