import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import { KeyRound, Mail, ArrowLeft, Send, CheckCircle2, AlertCircle } from 'lucide-react';

export const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email) {
      setError('Please enter your email address');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await api.forgotPassword(email);
      setMessage(res.message || 'Password reset instructions sent!');
      setSubmitted(true);
    } catch (err) {
      setError(err.message || 'Failed to process request');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '440px', margin: '40px auto', width: '100%' }}>
      <div className="card" style={{ padding: '36px 30px' }}>
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div style={{ width: '52px', height: '52px', borderRadius: '14px', background: 'linear-gradient(135deg, #f59e0b, #d97706)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', margin: '0 auto 16px', boxShadow: '0 8px 18px rgba(245, 158, 11, 0.3)' }}>
            <KeyRound size={28} />
          </div>
          <h1 style={{ fontSize: '22px', fontWeight: '800', color: '#0f172a', marginBottom: '6px' }}>
            Forgot Password
          </h1>
          <p style={{ fontSize: '13px', color: '#64748b' }}>
            Enter your registered email and we'll send you a password reset link
          </p>
        </div>

        {error && (
          <div style={{ padding: '12px 16px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', color: '#b91c1c', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
            <AlertCircle size={16} /> {error}
          </div>
        )}

        {submitted ? (
          <div style={{ padding: '24px', textAlign: 'center', background: '#ecfdf5', borderRadius: '12px', border: '1px solid #a7f3d0', color: '#065f46' }}>
            <CheckCircle2 size={36} color="#10b981" style={{ margin: '0 auto 10px' }} />
            <h3 style={{ fontSize: '16px', fontWeight: '700' }}>Instructions Sent!</h3>
            <p style={{ fontSize: '13px', marginTop: '6px', lineHeight: '1.5' }}>
              {message}
            </p>
            <div style={{ marginTop: '20px' }}>
              <Link to="/login" className="btn btn-primary btn-sm">
                Back to Login
              </Link>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>
                Your Account Email
              </label>
              <div style={{ position: 'relative' }}>
                <Mail size={16} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  required
                  style={{ width: '100%', padding: '10px 14px 10px 38px', borderRadius: '8px', border: '1.5px solid #cbd5e1', fontSize: '14px', outline: 'none' }}
                />
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: '100%', padding: '12px' }}
              disabled={loading}
            >
              {loading ? 'Sending link...' : <><Send size={15} /> Send Reset Link</>}
            </button>
          </form>
        )}

        <div style={{ marginTop: '24px', textAlign: 'center' }}>
          <Link to="/login" style={{ fontSize: '13px', color: 'var(--primary)', fontWeight: '600', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            <ArrowLeft size={14} /> Back to Sign In
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
