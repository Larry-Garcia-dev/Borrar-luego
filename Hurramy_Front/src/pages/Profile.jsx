import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Header from '../components/Header';
import Sidebar from '../components/Sidebar';
import { translations } from '../utils/translations';
import { API_URL } from '../config';
import { getAvatarUrl } from '../utils/mediaUtils';

// CORRECCIÓN: Asignamos API a nuestra variable dinámica
const API = API_URL;

function Profile() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user'));
  const lang = localStorage.getItem('appLanguage') || 'en';
  const t = translations[lang] || translations.en;
  const p = t.profile || {};

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [email, setEmail] = useState(user?.email || '');
  const [language, setLanguage] = useState(user?.language || 'en');
  
  const [avatarPreview, setAvatarPreview] = useState(
    user?.avatar ? getAvatarUrl(user.avatar) : null
  );
  
  const [avatarFile, setAvatarFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');
  const fileRef = useRef(null);

  if (!user) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: 'var(--text)' }}>
        <div style={{ textAlign: 'center' }}>
          <h2>{p.signInRequired || 'Sign in required'}</h2>
          <button className="btn primary" onClick={() => navigate('/login')} style={{ marginTop: '12px' }}>
            {t.header?.login || 'Login'}
          </button>
        </div>
      </div>
    );
  }

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  const handleAvatarChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { showToast(p.onlyImage || 'Only image files'); return; }
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const formData = new FormData();
      formData.append('userId', user.id);
      formData.append('email', email);
      formData.append('language', language);
      if (avatarFile) formData.append('avatar', avatarFile);

      const token = localStorage.getItem('token');
      const res = await axios.put(`${API}/users/profile`, formData, {
        headers: { 
          'Content-Type': 'multipart/form-data',
          Authorization: `Bearer ${token}`
        }
      });

      const updatedUser = { ...user, ...res.data.user };
      localStorage.setItem('user', JSON.stringify(updatedUser));
      localStorage.setItem('appLanguage', language);
      showToast(p.saved || 'Profile saved');
    } catch (err) {
      showToast(err.response?.data?.message || p.errorSaving || 'Error saving');
    } finally {
      setSaving(false);
    }
  };

  const username = user.email?.split('@')[0] || '';

  return (
    <>
      <Header onToggleSidebar={() => setSidebarOpen(p => !p)} />
      {sidebarOpen && <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />}

      <div className="app-layout">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        <main style={{ padding: '18px', overflowY: 'auto', maxWidth: '640px', margin: '0 auto', width: '100%' }}>
          <h1 style={{ fontWeight: 850, fontSize: '22px', marginBottom: '4px' }}>{p.title || 'My Profile'}</h1>
          <p style={{ color: 'var(--muted)', fontSize: '13px', marginBottom: '24px' }}>{p.subtitle || 'Edit your account details and avatar.'}</p>

          {/* Avatar */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
            <div
              onClick={() => fileRef.current?.click()}
              style={{
                width: '96px', height: '96px', borderRadius: '50%',
                background: avatarPreview ? 'transparent' : 'linear-gradient(135deg, var(--brand), var(--brand2))',
                border: '3px solid var(--line)', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                overflow: 'hidden', position: 'relative',
                transition: 'border-color 0.15s ease',
              }}
            >
              {avatarPreview ? (
                <img src={avatarPreview} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }}/>
              ) : (
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="var(--text)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
                </svg>
              )}
              {/* Hover overlay */}
              <div style={{
                position: 'absolute', inset: 0, borderRadius: '50%',
                background: 'rgba(0,0,0,0.45)', display: 'flex',
                alignItems: 'center', justifyContent: 'center',
                opacity: 0, transition: 'opacity 0.15s ease',
              }}
                onMouseEnter={(e) => e.currentTarget.style.opacity = 1}
                onMouseLeave={(e) => e.currentTarget.style.opacity = 0}
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                  <circle cx="12" cy="13" r="4"/>
                </svg>
              </div>
            </div>
            <input ref={fileRef} type="file" accept="image/*" onChange={handleAvatarChange} style={{ display: 'none' }}/>
            <button className="btn ghost" style={{ fontSize: '12px', padding: '6px 14px' }} onClick={() => fileRef.current?.click()}>
              {p.changeAvatar || 'Change avatar'}
            </button>
          </div>

          {/* Username (read-only) */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '12px', color: 'var(--muted)', marginBottom: '6px' }}>
              {p.usernameLabel || 'Username'}
            </label>
            <input className="input" value={`@${username}`} readOnly style={{ opacity: 0.6 }}/>
          </div>

          {/* Email */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '12px', color: 'var(--muted)', marginBottom: '6px' }}>
              {p.emailLabel || 'Email'}
            </label>
            <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)}/>
          </div>

          {/* Language */}
          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', fontSize: '12px', color: 'var(--muted)', marginBottom: '6px' }}>
              {p.languageLabel || 'Language'}
            </label>
            <select className="input" value={language} onChange={(e) => setLanguage(e.target.value)}>
              <option value="en">English</option>
              <option value="es">Español</option>
              <option value="zh">中文</option>
            </select>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <button className="btn primary" onClick={handleSave} disabled={saving} style={{ minWidth: '120px' }}>
              {saving ? (p.saving || 'Saving...') : (p.saveBtn || 'Save changes')}
            </button>
            <button className="btn ghost" onClick={() => navigate('/')}>
              {t.upload?.cancel || 'Cancel'}
            </button>
          </div>
        </main>
      </div>

      {/* Toast */}
      {toast && (
        <div className="toast show">{toast}</div>
      )}
    </>
  );
}

export default Profile;
