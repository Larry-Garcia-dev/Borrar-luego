import { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';
import { translations } from '../utils/translations';
import { API_URL } from '../config';

/* Generate a random secure password: 10 chars, 1 upper, 1 lower, 1 digit, 1 symbol */
function generatePassword() {
  const upper = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lower = 'abcdefghijklmnopqrstuvwxyz';
  const digits = '0123456789';
  const symbols = '!@#$%&*?';
  const all = upper + lower + digits + symbols;

  let pw = '';
  pw += upper[Math.floor(Math.random() * upper.length)];
  pw += lower[Math.floor(Math.random() * lower.length)];
  pw += digits[Math.floor(Math.random() * digits.length)];
  pw += symbols[Math.floor(Math.random() * symbols.length)];
  for (let i = 4; i < 10; i++) {
    pw += all[Math.floor(Math.random() * all.length)];
  }
  return pw.split('').sort(() => Math.random() - 0.5).join('');
}

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

function Register() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [suggestedPw, setSuggestedPw] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const [language, setLanguage] = useState(localStorage.getItem('appLanguage') || 'en');
  const navigate = useNavigate();

  const t = translations[language] || translations.en;

  useEffect(() => {
    localStorage.setItem('appLanguage', language);
  }, [language]);

  const passwordRegex = /^(?=.*[A-Z])(?=.*\d)(?=.*[^a-zA-Z0-9]).{8,12}$/;

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');

    if (!passwordRegex.test(password)) {
      setError(t.register.errorRegex);
      return;
    }

    setLoading(true);
    try {
      const res = await axios.post(`${API_URL}/auth/register`, {
        email,
        password,
        language
      });

      localStorage.setItem('user', JSON.stringify(res.data.user));

      navigate('/');
      window.location.reload();
    } catch (err) {
      setError(err.response?.data?.message || t.errors.generic);
    } finally {
      setLoading(false);
    }
  };

  const handleSuggestPassword = () => {
    const pw = generatePassword();
    setSuggestedPw(pw);
    setPassword(pw);
    setShowPassword(true);
  };

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '100vh',
      padding: '20px',
      position: 'relative'
    }}>
      {/* Language selector */}
      <div style={{ position: 'absolute', top: '20px', right: '20px', display: 'flex', alignItems: 'center', gap: '5px' }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <line x1="2" y1="12" x2="22" y2="12" />
          <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
        </svg>
        <select
          value={language}
          onChange={(e) => setLanguage(e.target.value)}
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

      <div className="panel" style={{ width: '100%', maxWidth: '400px', padding: '28px' }}>
        <h1 style={{ textAlign: 'center', marginBottom: '8px', fontWeight: 800 }}>{t.register.title}</h1>

        {error && (
          <div style={{
            background: 'rgba(255, 77, 109, 0.1)',
            border: '1px solid rgba(255, 77, 109, 0.2)',
            color: 'var(--bad)',
            padding: '12px 14px',
            borderRadius: '12px',
            marginBottom: '16px',
            fontSize: '13px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
            {error}
          </div>
        )}

        <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '12px', color: 'var(--muted)' }}>
              {t.register.emailLabel}
            </label>
            <input
              type="email"
              className="input"
              style={{ width: '100%' }}
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
            />
          </div>

          <div>
            <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px', fontSize: '12px', color: 'var(--muted)' }}>
              <span>{t.register.passwordLabel}</span>
              <button
                type="button"
                onClick={handleSuggestPassword}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--brand2)',
                  cursor: 'pointer',
                  fontSize: '11px',
                  fontWeight: 600,
                  padding: 0,
                }}
              >
                {t.register.suggestPassword || 'Suggest password'}
              </button>
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                className="input"
                style={{ width: '100%', paddingRight: '44px' }}
                value={password}
                onChange={e => { setPassword(e.target.value); setSuggestedPw(''); }}
                required
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
            <div className="muted" style={{ fontSize: '11px', marginTop: '4px' }}>
              {t.register.passwordHelp}
            </div>
            {suggestedPw && (
              <div style={{
                marginTop: '6px',
                fontSize: '11px',
                color: 'var(--good)',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
                {t.register.passwordSuggested || 'Secure password applied'}
              </div>
            )}
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '12px', color: 'var(--muted)' }}>
              {t.register.languageLabel}
            </label>
            <select
              className="select"
              style={{ width: '100%', padding: '10px' }}
              value={language}
              onChange={e => setLanguage(e.target.value)}
            >
              <option value="en">English</option>
              <option value="es">Espanol</option>
              <option value="zh">{'Chinese (中文)'}</option>
            </select>
          </div>

          <button type="submit" className="btn primary" disabled={loading} style={{ width: '100%', marginTop: '10px', opacity: loading ? 0.7 : 1 }}>
            {loading ? t.register.submittingBtn : t.register.submitBtn}
          </button>
        </form>

        <div style={{ marginTop: '20px', textAlign: 'center', fontSize: '13px', color: 'var(--muted)' }}>
          {t.register.hasAccount}{' '}
          <Link to="/login" style={{ color: 'var(--brand2)', fontWeight: 600 }}>{t.register.loginLink}</Link>
        </div>
      </div>
    </div>
  );
}

export default Register;
