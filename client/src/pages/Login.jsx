import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { ListTodo, Mail, Lock, LogIn, AlertCircle, Eye, EyeOff, ShieldCheck } from 'lucide-react';

export const Login = () => {
  const { login, loginWithGoogle } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const initGoogle = async () => {
    try {
      const res = await api.getGoogleClientId();
      if (!res.configured || !res.clientId) {
        setError('Google Sign-In is not configured. Set GOOGLE_CLIENT_ID in the backend .env file.');
        return;
      }

      // GIS is loaded asynchronously; wait for it before initializing the button.
      if (!window.google?.accounts?.id) {
        await new Promise((resolve, reject) => {
          const existing = document.querySelector('script[src="https://accounts.google.com/gsi/client"]');
          const script = existing || document.createElement('script');
          const timeout = window.setTimeout(() => reject(new Error('Google Sign-In failed to load. Check your internet connection.')), 15000);
          const onLoad = () => {
            window.clearTimeout(timeout);
            if (window.google?.accounts?.id) resolve();
            else reject(new Error('Google Sign-In loaded but is unavailable.'));
          };
          if (window.google?.accounts?.id) {
            window.clearTimeout(timeout);
            resolve();
            return;
          }
          script.addEventListener('load', onLoad, { once: true });
          script.addEventListener('error', () => {
            window.clearTimeout(timeout);
            reject(new Error('Unable to load Google Sign-In.'));
          }, { once: true });
          if (!existing) {
            script.src = 'https://accounts.google.com/gsi/client';
            script.async = true;
            script.defer = true;
            document.head.appendChild(script);
          }
        });
      }

      window.google.accounts.id.initialize({
        client_id: res.clientId,
        callback: async (response) => {
          if (!response?.credential) {
            setError('Google did not return a valid sign-in credential.');
            return;
          }
          setLoading(true);
          setError('');
          try {
            await loginWithGoogle(response.credential);
            navigate('/dashboard');
          } catch (err) {
            setError(err.message || 'Google authentication failed');
          } finally {
            setLoading(false);
          }
        },
        auto_select: false,
        cancel_on_tap_outside: true,
      });

      const button = document.getElementById('googleSignInButton');
      if (button) {
        button.innerHTML = '';
        window.google.accounts.id.renderButton(button, {
          theme: 'outline',
          size: 'large',
          width: 340,
          text: 'continue_with',
          shape: 'rectangular',
          logo_alignment: 'left',
        });
      }
    } catch (e) {
      console.error('Google initialization failed:', e);
      setError(e.message || 'Google Sign-In could not be initialized.');
    }
  };

  useEffect(() => {
    initGoogle();
  }, []);

  const handleCustomGoogleClick = async () => {
    try {
      const res = await api.getGoogleClientId();
      if (!res.configured || !res.clientId) {
        alert('Google Sign-In is not configured yet. Please configure GOOGLE_CLIENT_ID.');
        return;
      }
      if (window.google && window.google.accounts && window.google.accounts.id) {
        window.google.accounts.id.initialize({
          client_id: res.clientId,
          callback: async (response) => {
            if (response && response.credential) {
              setLoading(true);
              try {
                await loginWithGoogle(response.credential);
                navigate('/dashboard');
              } catch (err) {
                setError(err.message || 'Google authentication failed');
              } finally {
                setLoading(false);
              }
            }
          },
        });
        window.google.accounts.id.prompt();
      } else {
        alert('Google Sign-In library is loading. Please try again in a moment.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please provide both email and password');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await login({ email, password });
      navigate('/dashboard');
    } catch (err) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '440px', margin: '40px auto', width: '100%' }}>
      <div className="card" style={{ padding: '36px 30px' }}>
        {/* Logo & Header */}
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div style={{ width: '52px', height: '52px', borderRadius: '14px', background: 'linear-gradient(135deg, #4f46e5, #6366f1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', margin: '0 auto 16px', boxShadow: '0 8px 18px rgba(79, 70, 229, 0.3)' }}>
            <ListTodo size={28} />
          </div>
          <h1 style={{ fontSize: '22px', fontWeight: '800', color: '#0f172a', marginBottom: '6px' }}>
            Welcome Back
          </h1>
          <p style={{ fontSize: '13px', color: '#64748b' }}>
            Sign in to access your Task Management workspace
          </p>
        </div>

        {error && (
          <div style={{ padding: '12px 16px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', color: '#b91c1c', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
            <AlertCircle size={16} /> {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Email */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>
              Email Address
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

          {/* Password */}
          <div style={{ marginBottom: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <label style={{ fontSize: '13px', fontWeight: '600', color: '#334155' }}>
                Password
              </label>
              <Link to="/forgot-password" style={{ fontSize: '12px', fontWeight: '600', color: 'var(--primary)' }}>
                Forgot Password?
              </Link>
            </div>
            <div style={{ position: 'relative' }}>
              <Lock size={16} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                required
                style={{ width: '100%', padding: '10px 38px 10px 38px', borderRadius: '8px', border: '1.5px solid #cbd5e1', fontSize: '14px', outline: 'none' }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', marginTop: '16px', padding: '12px' }}
            disabled={loading}
          >
            {loading ? 'Authenticating...' : <><LogIn size={16} /> Sign In</>}
          </button>
        </form>

        {/* Google Sign-In Divider & Button */}
        <div style={{ display: 'flex', alignItems: 'center', margin: '20px 0', gap: '10px' }}>
          <div style={{ flex: 1, height: '1px', background: '#e2e8f0' }}></div>
          <span style={{ fontSize: '12px', color: '#94a3b8', fontWeight: '600' }}>OR</span>
          <div style={{ flex: 1, height: '1px', background: '#e2e8f0' }}></div>
        </div>

        <div id="googleSignInButton" style={{ display: 'flex', justifyContent: 'center', minHeight: '44px' }} />

        <div style={{ marginTop: '24px', textAlign: 'center', fontSize: '13px', color: '#64748b' }}>
          Don't have an account?{' '}
          <Link to="/signup" style={{ color: 'var(--primary)', fontWeight: '700' }}>
            Create an Account
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Login;
