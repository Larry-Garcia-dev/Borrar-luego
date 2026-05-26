import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { API_URL } from '../config';

function ResetPassword() {
  const { token } = useParams(); // Extrae el token de la URL
  const navigate = useNavigate();
  
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleReset = async (e) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      return setError("Las contraseñas no coinciden");
    }

    setLoading(true);
    setError('');
    setMessage('');

    try {
      // CORRECCIÓN 1 Y 2: Usar API_URL dinámica y el método PUT (no POST)
      const res = await axios.put(`${API_URL}/auth/reset-password/${token}`, { password });
      
      setMessage(res.data.message || 'Contraseña actualizada correctamente.');
      
      // Redirigir al login después de 3 segundos
      setTimeout(() => {
        navigate('/login');
      }, 3000);

    } catch (err) {
      setError(err.response?.data?.message || "Error al restablecer la contraseña. Verifica que cumpla los requisitos de seguridad.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', padding: '20px' }}>
      <div className="panel" style={{ width: '100%', maxWidth: '400px', padding: '28px' }}>
        <h2 style={{ marginBottom: '16px', fontWeight: 800 }}>Nueva Contraseña</h2>
        <p className="muted" style={{ marginBottom: '20px', fontSize: '14px' }}>
          Ingresa tu nueva clave de acceso. Recuerda usar mayúsculas, números y símbolos.
        </p>

        {message && (
          <div style={{ background: 'rgba(70, 230, 165, 0.1)', color: 'var(--good)', padding: '12px', borderRadius: '12px', marginBottom: '16px', fontSize: '13px' }}>
            {message} Redirigiendo al login...
          </div>
        )}
        
        {error && (
          <div style={{ background: 'rgba(230, 70, 70, 0.1)', color: 'var(--bad)', padding: '12px', borderRadius: '12px', marginBottom: '16px', fontSize: '13px' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleReset}>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 600 }}>Nueva Contraseña</label>
            <input 
              type="password" 
              className="input" 
              placeholder="Ej: Hurammy2024*" 
              style={{ width: '100%' }}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 600 }}>Confirmar Contraseña</label>
            <input 
              type="password" 
              className="input" 
              placeholder="Repite tu contraseña" 
              style={{ width: '100%' }}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
          </div>

          <button type="submit" className="btn primary" style={{ width: '100%' }} disabled={loading}>
            {loading ? 'Procesando...' : 'Cambiar Contraseña'}
          </button>
        </form>

        <div style={{ marginTop: '20px', textAlign: 'center' }}>
          <Link to="/login" className="muted" style={{ fontSize: '13px', textDecoration: 'none' }}>
            ← Volver al Login
          </Link>
        </div>
      </div>
    </div>
  );
}

export default ResetPassword;