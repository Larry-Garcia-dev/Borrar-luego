import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API_URL } from '../config';
import Header from '../components/Header';
import Sidebar from '../components/Sidebar';
// NUEVO: Importamos el sistema de traducciones
import { translations } from '../utils/translations';

function CreateCampaign() {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    startDate: '',
    endDate: ''
  });
  
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // NUEVO: Extraemos el idioma del usuario y preparamos las traducciones
  const lang = localStorage.getItem('appLanguage') || 'en';
  const t = translations[lang] || translations.en;
  // Creamos un atajo "ct" (Campaign Translations) para que el código quede más limpio
  const ct = t.createCampaign || {};

  // Verificamos que solo los administradores puedan ver esta página
  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('user'));
    if (!user || user.role !== 'admin') {
      navigate('/');
    }
  }, [navigate]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    setError('');

    try {
      const token = localStorage.getItem('token');
      
      const res = await axios.post(`${API_URL}/campaigns/create`, formData, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        }
      });

      // Usamos el texto traducido o el de por defecto
      setMessage(ct.successMsg || '¡Campaña creada con éxito!');
      setFormData({ name: '', description: '', startDate: '', endDate: '' }); 
      
      setTimeout(() => navigate('/campaigns'), 2000);

    } catch (err) {
      setError(err.response?.data?.message || ct.errorMsg || 'Error al crear la campaña.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Header onSearch={() => {}} onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
      
      {sidebarOpen && <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />}
      
      <div className="app-layout">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        
        <main style={{ padding: '24px', width: '100%', overflowY: 'auto' }}>
          <div className="panel" style={{ maxWidth: '600px', margin: '0 auto', padding: '30px' }}>
            <h1 style={{ fontWeight: 800, marginBottom: '20px', borderBottom: '1px solid var(--line)', paddingBottom: '10px' }}>
              📢 {ct.title || 'Lanzar Nueva Campaña'}
            </h1>
            
            <p className="muted" style={{ marginBottom: '24px', fontSize: '14px' }}>
              {ct.subtitle || 'Crea un evento o reto para que la comunidad participe subiendo sus mejores videos.'}
            </p>

            {message && <div style={{ background: 'rgba(70,230,165,0.1)', color: 'var(--good)', padding: '12px', borderRadius: '12px', marginBottom: '20px', fontSize: '14px' }}>{message}</div>}
            {error && <div style={{ background: 'rgba(255,77,109,0.1)', color: 'var(--bad)', padding: '12px', borderRadius: '12px', marginBottom: '20px', fontSize: '14px' }}>{error}</div>}

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 600 }}>
                  {ct.nameLabel || 'Nombre de la Campaña'}
                </label>
                <input 
                  type="text" 
                  name="name"
                  className="input" 
                  placeholder={ct.namePlaceholder || 'Ej: Reto de Baile Verano 2026'}
                  value={formData.name}
                  onChange={handleChange}
                  required
                  style={{ width: '100%' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 600 }}>
                  {ct.descLabel || 'Descripción y Reglas'}
                </label>
                <textarea 
                  name="description"
                  className="input" 
                  placeholder={ct.descPlaceholder || 'Explica de qué trata la campaña, qué deben subir los usuarios, etc.'}
                  value={formData.description}
                  onChange={handleChange}
                  required
                  style={{ width: '100%', minHeight: '120px', resize: 'vertical' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '16px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 600 }}>
                    {ct.startDateLabel || 'Fecha de Inicio'}
                  </label>
                  <input 
                    type="date" 
                    name="startDate"
                    className="input" 
                    value={formData.startDate}
                    onChange={handleChange}
                    required
                    style={{ width: '100%' }}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 600 }}>
                    {ct.endDateLabel || 'Fecha de Cierre'}
                  </label>
                  <input 
                    type="date" 
                    name="endDate"
                    className="input" 
                    value={formData.endDate}
                    onChange={handleChange}
                    required
                    style={{ width: '100%' }}
                  />
                </div>
              </div>

              <div style={{ marginTop: '10px' }}>
                <button type="submit" className="btn primary" style={{ width: '100%', padding: '14px' }} disabled={loading}>
                  {loading ? (ct.creatingBtn || 'Creando campaña...') : (ct.createBtn || 'Lanzar Campaña')}
                </button>
              </div>
            </form>

          </div>
        </main>
      </div>
    </div>
  );
}

export default CreateCampaign;