import { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';
import { useGoogleLogin } from '@react-oauth/google';
import { translations } from '../utils/translations';
import { API_URL } from '../config';

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLocked, setIsLocked] = useState(false);
  const [loading, setLoading] = useState(false);

  const [currentLang, setCurrentLang] = useState(localStorage.getItem('appLanguage') || 'en');
  const navigate = useNavigate();

  const t = translations[currentLang] || translations.en;

  useEffect(() => {
    localStorage.setItem('appLanguage', currentLang);
  }, [currentLang]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setIsLocked(false);
    setLoading(true);

    try {
      const response = await axios.post(`${API_URL}/auth/login`, {
        email,
        password
      });

      const { user: userData, token } = response.data;

      if (userData.language && userData.language !== currentLang) {
        localStorage.setItem('appLanguage', userData.language);
      }

      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(userData));

      navigate('/');
      window.location.reload();
    } catch (err) {
      if (err.response && err.response.status === 403) {
        setError(t.errors.locked);
        setIsLocked(true);
      } else if (err.response && err.response.status === 401) {
        setError(t.errors.credentials);
      } else {
        setError(err.response?.data?.message || t.errors.generic);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      setLoading(true);
      try {
        const res = await axios.post(`${API_URL}/auth/google`, {
          accessToken: tokenResponse.access_token
        });

        const { user: userData, token } = res.data;
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(userData));

        if (userData.language) {
          localStorage.setItem('appLanguage', userData.language);
        }

        navigate('/');
        setTimeout(() => { window.location.reload(); }, 100);
      } catch (err) {
        console.error(err);
        setError('Error starting session with Google');
        setLoading(false);
      }
    },
    onError: () => {
      setError('Google connection failed');
      setLoading(false);
    }
  });

  // Eye icon SVGs
  const EyeIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );

  const EyeOffIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '100vh',
      padding: '20px',
      position: 'relative'
    }}>
      <div style={{ width: '100%', maxWidth: '400px' }}>
        {/* Logo + Language selector row */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '32px',
        }}>
          <Link to="/" style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
            <img
              src="/logo.png"
              alt={t.common.appName}
              style={{ height: '44px', width: 'auto', objectFit: 'contain' }}
            />
          </Link>

          <div style={{ display: 'flex', alignItems: 'center', gap: '5px', flexShrink: 0 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="2" y1="12" x2="22" y2="12" />
              <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
            </svg>
            <select
              value={currentLang}
              onChange={(e) => setCurrentLang(e.target.value)}
              style={{
                background: 'var(--panel)',
                color: 'var(--text)',
                border: '1px solid var(--line)',
                borderRadius: '8px',
                padding: '6px 10px',
                cursor: 'pointer',
                fontSize: '13px',
              }}
            >
              <option value="en">English</option>
              <option value="es">Espanol</option>
              <option value="zh">{'中文'}</option>
            </select>
          </div>
        </div>

        {/* Login Card */}
        <div className="panel" style={{ padding: '28px' }}>
          <h1 style={{ margin: '0 0 8px', fontSize: '22px', textAlign: 'center', fontWeight: 800 }}>
            {t.login.title}
          </h1>
          <p style={{ margin: '0 0 24px', textAlign: 'center', color: 'var(--muted)', fontSize: '14px' }}>
            {t.login.subtitle}
          </p>

          {error && (
            <div style={{
              background: 'rgba(255, 77, 109, 0.1)',
              border: '1px solid rgba(255, 77, 109, 0.2)',
              color: 'var(--bad)',
              padding: '12px 14px',
              borderRadius: '12px',
              fontSize: '13px',
              marginBottom: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                  <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
                <span>{error}</span>
              </div>
              {isLocked && (
                <Link
                  to="/forgot-password"
                  style={{
                    color: 'var(--brand2)',
                    fontSize: '13px',
                    fontWeight: 600,
                    textDecoration: 'underline',
                    marginLeft: '24px',
                  }}
                >
                  {t.login.recoverHere || 'Recover your password here'}
                </Link>
              )}
            </div>
          )}

          {/* Google Button */}
          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={loading}
            className="btn"
            style={{
              width: '100%',
              padding: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              opacity: loading ? 0.7 : 1,
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid var(--line)',
              borderRadius: '14px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 600,
              color: 'var(--text)',
              transition: 'all 0.15s ease',
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18A10.96 10.96 0 0 0 1 12c0 1.77.42 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
            </svg>
            {loading ? 'Connecting...' : t.login.googleLogin}
          </button>

          <div style={{ display: 'flex', alignItems: 'center', margin: '16px 0', gap: '12px' }}>
            <div style={{ flex: 1, height: '1px', background: 'var(--line)' }}></div>
            <span style={{ color: 'var(--muted)', fontSize: '12px' }}>{t.login.or}</span>
            <div style={{ flex: 1, height: '1px', background: 'var(--line)' }}></div>
          </div>

          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '12px', color: 'var(--muted)' }}>
                {t.login.emailLabel}
              </label>
              <input
                type="email" className="input" placeholder={t.login.emailPlaceholder}
                value={email} onChange={(e) => setEmail(e.target.value)} required style={{ width: '100%' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '12px', color: 'var(--muted)' }}>
                {t.login.passwordLabel}
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="input"
                  placeholder={t.login.passwordPlaceholder}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  style={{ width: '100%', paddingRight: '44px' }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: '10px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'var(--muted)',
                    display: 'flex',
                    alignItems: 'center',
                    padding: '4px',
                  }}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                </button>
              </div>

            </div>

            <div style={{ textAlign: 'right' }}>
              <Link to="/forgot-password" style={{ background: 'none', border: 'none', color: 'var(--brand2)', cursor: 'pointer', fontSize: '13px', textDecoration: 'none' }}>
                {t.login.forgotPassword}
              </Link>
            </div>

            <button type="submit" className="btn primary" disabled={loading} style={{ width: '100%', padding: '12px', marginTop: '8px', opacity: loading ? 0.7 : 1 }}>
              {loading ? t.login.signingInBtn : t.login.signInBtn}
            </button>
          </form>

          <div style={{ marginTop: '20px', textAlign: 'center', fontSize: '13px', color: 'var(--muted)' }}>
            {t.login.noAccount}{' '}
            <Link to="/register" style={{ color: 'var(--brand2)', fontWeight: 600 }}>
              {t.login.signUpLink}
            </Link>
          </div>

          <div style={{ marginTop: '12px', textAlign: 'center', fontSize: '13px', color: 'var(--muted)' }}>
            {t.login.or}{' '}
            <Link to="/" style={{ color: 'var(--muted)', textDecoration: 'underline' }}>
              {t.login.guestLink}
            </Link>
          </div>
        </div>

        <div style={{ marginTop: '24px', textAlign: 'center', fontSize: '12px', color: 'var(--muted)' }}>
          <Link to="/" style={{ color: 'var(--muted)' }}>{t.login.backHome}</Link>
          <span style={{ margin: '0 10px' }}>{'|'}</span>
          <span>&copy; 2026 {t.common.appName}</span>
        </div>
      </div>
    </div>
  );
}

export default Login;
