import { useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { translations } from '../utils/translations';
import { API_URL } from '../config';

function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Sistema de traducciones
  const lang = localStorage.getItem('appLanguage') || 'en';
  const t = translations[lang] || translations.en;
  const fp = t.forgotPassword || {};

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    try {
      // Petición al backend usando la URL dinámica de config.js
      const res = await axios.post(`${API_URL}/auth/forgot-password`, { email });
      
      // Si el backend responde con éxito
      setMessage(res.data.message);
    } catch (err) {
      // Manejo de errores (si el correo no existe o falla el servidor)
      setError(err.response?.data?.message || (fp.errorDefault || 'Error requesting reset'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', padding: '20px' }}>
      <div className="panel" style={{ width: '100%', maxWidth: '400px', padding: '28px' }}>
        <h2 style={{ marginBottom: '16px', fontWeight: 800 }}>{fp.title || 'Reset Password'}</h2>
        <p className="muted" style={{ marginBottom: '20px', fontSize: '14px' }}>
          {fp.subtitle || 'Enter your email to receive a password reset link.'}
        </p>

        {/* Mensaje de Éxito */}
        {message && (
          <div style={{ background: 'rgba(70, 230, 165, 0.1)', color: 'var(--good)', padding: '12px', borderRadius: '12px', marginBottom: '16px', fontSize: '13px' }}>
            {message}
          </div>
        )}

        {/* Mensaje de Error */}
        {error && (
          <div style={{ background: 'rgba(230, 70, 70, 0.1)', color: 'var(--bad)', padding: '12px', borderRadius: '12px', marginBottom: '16px', fontSize: '13px' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 600 }}>Email</label>
            <input 
              type="email" 
              className="input" 
              placeholder={fp.emailPlaceholder || 'email@example.com'} 
              style={{ width: '100%' }} 
              value={email} 
              onChange={e => setEmail(e.target.value)} 
              required 
            />
          </div>

          <button type="submit" className="btn primary" style={{ width: '100%' }} disabled={loading}>
            {loading ? (fp.sending || 'Sending...') : (fp.sendLink || 'Send Reset Link')}
          </button>
        </form>

        <div style={{ marginTop: '20px', textAlign: 'center' }}>
          <Link to="/login" className="muted" style={{ fontSize: '13px', textDecoration: 'none' }}>
            ← {fp.backToLogin || 'Back to Login'}
          </Link>
        </div>
      </div>
    </div>
  );
}

export default ForgotPassword;