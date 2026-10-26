import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Clock, ShieldAlert, RefreshCw, LogOut } from 'lucide-react';

export const SessionTimeoutModal = () => {
  const { sessionExpiryWarning, setSessionExpiryWarning, refreshUser, logout } = useAuth();

  if (!sessionExpiryWarning) return null;

  return (
    <div className="modal-backdrop">
      <div className="modal-content" style={{ maxWidth: '440px', textAlign: 'center', padding: '32px 24px' }}>
        <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: '#fffbeb', color: '#d97706', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
          <ShieldAlert size={30} />
        </div>
        <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#1e293b', marginBottom: '8px' }}>
          Session Security Check
        </h3>
        <p style={{ fontSize: '14px', color: '#64748b', marginBottom: '24px' }}>
          Your active session token is being monitored. Would you like to extend your session or logout now?
        </p>
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
          <button
            onClick={() => {
              setSessionExpiryWarning(false);
              refreshUser();
            }}
            className="btn btn-primary"
          >
            <RefreshCw size={15} /> Extend Session
          </button>
          <button
            onClick={logout}
            className="btn btn-danger"
          >
            <LogOut size={15} /> Logout
          </button>
        </div>
      </div>
    </div>
  );
};

export default SessionTimeoutModal;
