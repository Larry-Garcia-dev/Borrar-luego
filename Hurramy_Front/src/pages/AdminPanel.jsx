import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { API_URL } from '../config';
import Header from '../components/Header';
import Sidebar from '../components/Sidebar';
import { translations } from '../utils/translations';

function AdminPanel() {
  const navigate = useNavigate();
  const lang = localStorage.getItem('appLanguage') || 'en';
  const t = translations[lang] || translations.en;
  const ap = t.adminPanel || {};
  const locale = lang === 'es' ? 'es-ES' : lang === 'zh' ? 'zh-CN' : 'en-US';
  const [currentUser, setCurrentUser] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('users');
  
  // Estados del buscador
  const [searchEmail, setSearchEmail] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  // Estados para edición de coins
  const [editingCoins, setEditingCoins] = useState(null);
  const [coinInputValue, setCoinInputValue] = useState('');

  // Estados para campañas/anuncios
  const [campaigns, setCampaigns] = useState([]);
  const [campaignsLoading, setCampaignsLoading] = useState(false);

  // 1. Barrera de Seguridad (Frontend)
  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('user'));
    const token = localStorage.getItem('token');
    
    // Si no está logueado o NO es admin, lo expulsamos al Home
    if (!user || !token || user.role !== 'admin') {
      navigate('/');
    } else {
      setCurrentUser(user);
    }
  }, [navigate]);

  // 2. Buscar usuarios en la nueva ruta /api/admin
  const handleSearch = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');
    
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_URL}/admin/users/search?email=${searchEmail}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSearchResults(res.data);
      if (res.data.length === 0) {
        setMessage(ap.noUsersFound || 'No users found with that email.');
      }
    } catch (err) {
      setError(ap.searchError || err.response?.data?.message || 'Error searching users');
    } finally {
      setLoading(false);
    }
  };

  // 3. Cambiar rol en la nueva ruta /api/admin
  const handleUpdateRole = async (userId, newRole) => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.put(`${API_URL}/admin/users/${userId}/role`, { role: newRole }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setMessage(ap.roleUpdated || 'User role updated.');
      
      // Actualizamos la tabla visualmente
      setSearchResults(searchResults.map(u => 
        u.id === userId ? { ...u, role: newRole } : u
      ));
      
      // Limpiar mensaje después de 3 segundos
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setError(ap.roleUpdateError || err.response?.data?.message || 'Error updating role');
      setTimeout(() => setError(''), 3000);
    }
  };

  // 4. Actualizar WAi Coins de un usuario
  const handleUpdateCoins = async (userId) => {
    const newCoins = parseInt(coinInputValue, 10);
    if (isNaN(newCoins) || newCoins < 0) {
      setError(ap.invalidCoins || 'WAi Coins must be a positive number');
      setTimeout(() => setError(''), 3000);
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const res = await axios.put(`${API_URL}/admin/users/${userId}/coins`, { waiCoins: newCoins }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setMessage(ap.coinsUpdated || 'WAi Coins updated.');
      
      // Actualizamos la tabla visualmente
      setSearchResults(searchResults.map(u => 
        u.id === userId ? { ...u, waiCoins: newCoins } : u
      ));
      
      setEditingCoins(null);
      setCoinInputValue('');
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setError(ap.coinsUpdateError || err.response?.data?.message || 'Error updating WAi Coins');
      setTimeout(() => setError(''), 3000);
    }
  };

  // 5. Toggle freeze/unfreeze de WAi Coins
  const handleToggleFreeze = async (userId) => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.put(`${API_URL}/admin/users/${userId}/freeze`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setMessage(res.data.user?.coinsFrozen
        ? (ap.coinsFrozenSuccess || 'WAi Coins frozen.')
        : (ap.coinsUnfrozenSuccess || 'WAi Coins unfrozen.')
      );
      
      // Actualizamos la tabla visualmente
      setSearchResults(searchResults.map(u => 
        u.id === userId ? { ...u, coinsFrozen: res.data.user.coinsFrozen } : u
      ));
      
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setError(ap.freezeUpdateError || err.response?.data?.message || 'Error changing freeze status');
      setTimeout(() => setError(''), 3000);
    }
  };

  // Start editing coins for a user
  const startEditingCoins = (userId, currentCoins) => {
    setEditingCoins(userId);
    setCoinInputValue(String(currentCoins ?? 0));
  };

  // Cancel editing coins
  const cancelEditingCoins = () => {
    setEditingCoins(null);
    setCoinInputValue('');
  };

  // 6. Cargar campañas/anuncios
  const loadCampaigns = async () => {
    setCampaignsLoading(true);
    try {
      const res = await axios.get(`${API_URL}/campaigns`);
      setCampaigns(res.data);
    } catch (err) {
      console.error('Error loading campaigns:', err);
    } finally {
      setCampaignsLoading(false);
    }
  };

  // Cargar campañas cuando se cambia a esa tab
  useEffect(() => {
    if (activeTab === 'announcements') {
      loadCampaigns();
    }
  }, [activeTab]);

  // 7. Cambiar estado de una campaña
  const handleToggleCampaignStatus = async (campaignId, currentStatus) => {
    try {
      const token = localStorage.getItem('token');
      const newStatus = currentStatus === 'Active' ? 'Inactive' : 'Active';
      await axios.put(`${API_URL}/campaigns/${campaignId}`, { status: newStatus }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setMessage(newStatus === 'Active'
        ? (ap.campaignActivated || 'Campaign activated.')
        : (ap.campaignDeactivated || 'Campaign deactivated.')
      );
      setCampaigns(campaigns.map(c => 
        c.id === campaignId ? { ...c, status: newStatus } : c
      ));
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setError(ap.campaignStatusError || err.response?.data?.message || 'Error changing campaign status');
      setTimeout(() => setError(''), 3000);
    }
  };

  // 8. Eliminar campaña
  const handleDeleteCampaign = async (campaignId) => {
    if (!window.confirm(ap.deleteConfirm || 'Are you sure you want to delete this campaign/announcement?')) return;
    
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API_URL}/campaigns/${campaignId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setMessage(ap.campaignDeleted || 'Campaign deleted.');
      setCampaigns(campaigns.filter(c => c.id !== campaignId));
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setError(ap.deleteCampaignError || err.response?.data?.message || 'Error deleting campaign');
      setTimeout(() => setError(''), 3000);
    }
  };

  if (!currentUser) return null; // Evita parpadeos de UI antes de expulsar

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Header onSearch={() => {}} onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} />

      {sidebarOpen && <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />}

      <div className="app-layout">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        
        <main style={{ padding: '24px', width: '100%', overflowY: 'auto' }}>
          <div className="panel" style={{ maxWidth: '900px', margin: '0 auto', padding: '24px' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid var(--line)', paddingBottom: '16px' }}>
              <h1 style={{ fontWeight: 800, margin: 0 }}>🛡️ {ap.title || 'Admin Command Center'}</h1>
              <span className="muted" style={{ fontSize: '14px' }}>{ap.loggedInAs || 'Logged in as'}: {currentUser.email}</span>
            </div>

            {/* Pestañas de Navegación */}
            <div style={{ display: 'flex', gap: '10px', marginBottom: '24px', flexWrap: 'wrap' }}>
              <button 
                className={`btn ${activeTab === 'users' ? 'primary' : ''}`} 
                onClick={() => setActiveTab('users')}
                style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                  <circle cx="12" cy="7" r="4"/>
                </svg>
                {ap.usersTab || 'Users and Credits'}
              </button>
              <button 
                className={`btn ${activeTab === 'announcements' ? 'primary' : ''}`} 
                onClick={() => setActiveTab('announcements')}
                style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M19 4v16"/>
                  <path d="M3 8l4-4 4 4"/>
                  <path d="M7 4v16"/>
                  <path d="M15 20l4-4 4 4"/>
                  <path d="M19 20V4"/>
                </svg>
                {ap.announcementsTab || 'Announcements and Campaigns'}
              </button>
            </div>

            {/* Notificaciones */}
            {message && <div style={{ background: 'rgba(70,230,165,0.1)', color: 'var(--good)', padding: '12px', borderRadius: '12px', marginBottom: '20px' }}>{message}</div>}
            {error && <div style={{ background: 'rgba(255,77,109,0.1)', color: 'var(--bad)', padding: '12px', borderRadius: '12px', marginBottom: '20px' }}>{error}</div>}

            {/* ========== TAB: USUARIOS Y CREDITOS ========== */}
            {activeTab === 'users' && (
              <>
                {/* Buscador */}
                <form onSubmit={handleSearch} style={{ display: 'flex', gap: '10px', marginBottom: '24px' }}>
                  <input 
                    type="text" 
                    className="input" 
                    placeholder={ap.searchPlaceholder || 'Search a user email (e.g. jane@gmail.com)'} 
                    value={searchEmail}
                    onChange={(e) => setSearchEmail(e.target.value)}
                    style={{ flex: 1 }}
                    required
                  />
                  <button type="submit" className="btn primary" disabled={loading}>
                    {loading ? (ap.searching || 'Searching...') : (ap.searchUser || 'Search User')}
                  </button>
                </form>

                {/* Tabla de Resultados */}
                <div style={{ background: 'rgba(0,0,0,0.2)', borderRadius: '16px', border: '1px solid var(--line)', overflow: 'auto' }}>
                  {searchResults.length > 0 && (
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '900px' }}>
                  <thead style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid var(--line)' }}>
                    <tr>
                      <th style={{ padding: '16px', fontSize: '13px', color: 'var(--muted)' }}>{ap.userHeader || 'USER'}</th>
                      <th style={{ padding: '16px', fontSize: '13px', color: 'var(--muted)' }}>{ap.statusHeader || 'STATUS'}</th>
                      <th style={{ padding: '16px', fontSize: '13px', color: 'var(--muted)' }}>{ap.roleHeader || 'ROLE'}</th>
                      <th style={{ padding: '16px', fontSize: '13px', color: 'var(--muted)' }}>WAi COINS</th>
                      <th style={{ padding: '16px', fontSize: '13px', color: 'var(--muted)' }}>{ap.actionsHeader || 'ACTIONS'}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {searchResults.map((u) => (
                      <tr key={u.id} style={{ borderBottom: '1px solid var(--line)' }}>
                        <td style={{ padding: '16px', fontSize: '14px', fontWeight: 600 }}>{u.email}</td>
                        <td style={{ padding: '16px' }}>
                          <span style={{ color: u.status === 'Locked' ? 'var(--bad)' : 'var(--good)', fontSize: '13px' }}>
                            {u.status === 'Locked' ? (ap.locked || 'Locked') : (ap.activeUser || 'Active')}
                          </span>
                        </td>
                        <td style={{ padding: '16px' }}>
                          <select 
                            className="input" 
                            style={{ padding: '8px', fontSize: '13px', cursor: 'pointer', minWidth: '140px' }}
                            value={u.role}
                            onChange={(e) => handleUpdateRole(u.id, e.target.value)}
                          >
                            <option value="user">{ap.userRole || 'User'}</option>
                            <option value="admin">{ap.adminRole || 'Admin'}</option>
                          </select>
                        </td>
                        <td style={{ padding: '16px' }}>
                          {editingCoins === u.id ? (
                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                              <input
                                type="number"
                                min="0"
                                className="input"
                                style={{ width: '100px', padding: '8px', fontSize: '13px' }}
                                value={coinInputValue}
                                onChange={(e) => setCoinInputValue(e.target.value)}
                                autoFocus
                              />
                              <button 
                                className="btn primary" 
                                style={{ padding: '6px 12px', fontSize: '12px' }}
                                onClick={() => handleUpdateCoins(u.id)}
                              >
                                {ap.save || 'Save'}
                              </button>
                              <button 
                                className="btn" 
                                style={{ padding: '6px 12px', fontSize: '12px' }}
                                onClick={cancelEditingCoins}
                              >
                                {ap.cancel || 'Cancel'}
                              </button>
                            </div>
                          ) : (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span style={{ 
                                fontWeight: 700, 
                                color: u.coinsFrozen ? 'var(--bad)' : 'var(--brand2)',
                                fontSize: '14px'
                              }}>
                                {u.waiCoins ?? 0}
                              </span>
                              {u.coinsFrozen && (
                                <span style={{
                                  padding: '2px 6px',
                                  borderRadius: '4px',
                                  fontSize: '10px',
                                  fontWeight: 600,
                                  background: 'rgba(255, 77, 109, 0.2)',
                                  color: 'var(--bad)',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '4px'
                                }}>
                                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                                    <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                                  </svg>
                                  {ap.frozen || 'FROZEN'}
                                </span>
                              )}
                              <button
                                className="btn"
                                style={{ padding: '4px 8px', fontSize: '11px', marginLeft: '4px' }}
                                onClick={() => startEditingCoins(u.id, u.waiCoins)}
                              >
                                {ap.edit || 'Edit'}
                              </button>
                            </div>
                          )}
                        </td>
                        <td style={{ padding: '16px' }}>
                          <button
                            className="btn"
                            style={{ 
                              padding: '6px 12px', 
                              fontSize: '12px',
                              background: u.coinsFrozen ? 'rgba(70, 230, 165, 0.15)' : 'rgba(255, 77, 109, 0.15)',
                              color: u.coinsFrozen ? 'var(--good)' : 'var(--bad)',
                              border: u.coinsFrozen ? '1px solid rgba(70, 230, 165, 0.3)' : '1px solid rgba(255, 77, 109, 0.3)'
                            }}
                            onClick={() => handleToggleFreeze(u.id)}
                          >
                            {u.coinsFrozen ? (ap.unfreezeCoins || 'Unfreeze Coins') : (ap.freezeCoins || 'Freeze Coins')}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
)}
                </div>
              </>
            )}

            {/* ========== TAB: ANUNCIOS Y CAMPANAS ========== */}
            {activeTab === 'announcements' && (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                  <p className="muted" style={{ margin: 0, fontSize: '14px' }}>
                    {ap.announcementsDescription || 'Manage the announcements and campaigns shown to users.'}
                  </p>
                  <Link to="/create-campaign" className="btn primary" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="12" y1="5" x2="12" y2="19"/>
                      <line x1="5" y1="12" x2="19" y2="12"/>
                    </svg>
                    {ap.createAnnouncement || 'Create New Announcement'}
                  </Link>
                </div>

                {campaignsLoading ? (
                  <div style={{ textAlign: 'center', padding: '40px' }}>
                    <span className="muted">{ap.loadingAnnouncements || 'Loading announcements...'}</span>
                  </div>
                ) : campaigns.length === 0 ? (
                  <div style={{ background: 'rgba(0,0,0,0.2)', borderRadius: '16px', border: '1px solid var(--line)', padding: '40px', textAlign: 'center' }}>
                    <span className="muted">{ap.noAnnouncements || 'No announcements or campaigns created.'}</span>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {campaigns.map((campaign) => (
                      <div key={campaign.id} style={{ 
                        background: 'rgba(0,0,0,0.2)', 
                        borderRadius: '16px', 
                        border: '1px solid var(--line)', 
                        padding: '20px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        gap: '16px'
                      }}>
                        <div style={{ flex: 1, minWidth: '200px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700 }}>{campaign.name}</h3>
                            <span style={{ 
                              padding: '3px 8px', 
                              borderRadius: '6px', 
                              fontSize: '11px', 
                              fontWeight: 600,
                              background: campaign.status === 'Active' ? 'rgba(70, 230, 165, 0.15)' : 'rgba(255, 77, 109, 0.15)',
                              color: campaign.status === 'Active' ? 'var(--good)' : 'var(--bad)',
                              border: campaign.status === 'Active' ? '1px solid rgba(70, 230, 165, 0.3)' : '1px solid rgba(255, 77, 109, 0.3)'
                            }}>
                              {campaign.status === 'Active' ? (ap.active || 'Active') : (ap.inactive || 'Inactive')}
                            </span>
                          </div>
                          <p style={{ margin: 0, fontSize: '13px', color: 'var(--muted)', lineHeight: 1.5 }}>
                            {campaign.description?.substring(0, 100)}{campaign.description?.length > 100 ? '...' : ''}
                          </p>
                          <div style={{ marginTop: '8px', fontSize: '12px', color: 'var(--muted)' }}>
                            <span>{ap.start || 'Start'}: {new Date(campaign.startDate).toLocaleDateString(locale)}</span>
                            <span style={{ margin: '0 8px' }}>|</span>
                            <span>{ap.end || 'End'}: {new Date(campaign.endDate).toLocaleDateString(locale)}</span>
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                          <button
                            className="btn"
                            style={{ 
                              padding: '8px 14px', 
                              fontSize: '12px',
                              background: campaign.status === 'Active' ? 'rgba(255, 77, 109, 0.15)' : 'rgba(70, 230, 165, 0.15)',
                              color: campaign.status === 'Active' ? 'var(--bad)' : 'var(--good)',
                              border: campaign.status === 'Active' ? '1px solid rgba(255, 77, 109, 0.3)' : '1px solid rgba(70, 230, 165, 0.3)'
                            }}
                            onClick={() => handleToggleCampaignStatus(campaign.id, campaign.status)}
                          >
                            {campaign.status === 'Active' ? (ap.deactivate || 'Deactivate') : (ap.activate || 'Activate')}
                          </button>
                          <Link to={`/campaign/${campaign.id}`} className="btn" style={{ padding: '8px 14px', fontSize: '12px' }}>
                            {ap.viewDetails || 'View Details'}
                          </Link>
                          <button
                            className="btn"
                            style={{ 
                              padding: '8px 14px', 
                              fontSize: '12px',
                              background: 'rgba(255, 77, 109, 0.1)',
                              color: 'var(--bad)',
                              border: '1px solid rgba(255, 77, 109, 0.2)'
                            }}
                            onClick={() => handleDeleteCampaign(campaign.id)}
                          >
                            {ap.delete || 'Delete'}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          
          </div>
        </main>
      </div>
    </div>
  );
}

export default AdminPanel;
