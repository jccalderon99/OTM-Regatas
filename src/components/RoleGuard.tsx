import { ReactNode } from 'react';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types';

interface RoleGuardProps {
  allowed: UserRole[];
  children: ReactNode;
  fallback?: ReactNode;
}

export default function RoleGuard({ allowed, children, fallback }: RoleGuardProps) {
  const { user } = useAuth();
  if (!user || !allowed.includes(user.role)) {
    return fallback ? <>{fallback}</> : (
      <div className="empty-state">
        <div className="empty-state-icon">🔒</div>
        <div className="empty-state-title">Acceso restringido</div>
        <div className="empty-state-text">No tienes permisos para acceder a esta sección.</div>
      </div>
    );
  }
  return <>{children}</>;
}
