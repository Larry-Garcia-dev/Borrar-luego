import { Link, useLocation } from 'react-router-dom';
import { translations } from '../utils/translations';

/* ── Inline SVG Icon Components ────────────────────── */
const Icon = ({ children, size = 18, ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    {children}
  </svg>
);

const HomeIcon = () => (
  <Icon>
    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    <polyline points="9 22 9 12 15 12 15 22" />
  </Icon>
);

const TrendingIcon = () => (
  <Icon>
    <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
    <polyline points="17 6 23 6 23 12" />
  </Icon>
);

const UsersIcon = () => (
  <Icon>
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </Icon>
);

const MusicIcon = () => (
  <Icon>
    <path d="M9 18V5l12-2v13" />
    <circle cx="6" cy="18" r="3" />
    <circle cx="18" cy="16" r="3" />
  </Icon>
);

const StarIcon = () => (
  <Icon>
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
  </Icon>
);

const TrophyIcon = () => (
  <Icon>
    <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
    <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
    <path d="M4 22h16" />
    <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
    <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
    <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
  </Icon>
);

const UploadIcon = () => (
  <Icon>
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="17 8 12 3 7 8" />
    <line x1="12" y1="3" x2="12" y2="15" />
  </Icon>
);
const SparkleIcon = () => (
  <Icon>
    <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z" />
  </Icon>
);

// NUEVO: Ícono del Panel Admin (Candado)
const ShieldIcon = () => (
  <Icon>
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </Icon>
);

function Sidebar({ isOpen, onClose }) {
  const location = useLocation();
  const lang = localStorage.getItem('appLanguage') || 'en';
  const t = translations[lang] || translations.en;
  
  // Obtenemos al usuario de forma segura
  const userString = localStorage.getItem('user');
  const user = userString ? JSON.parse(userString) : null;

  const isActive = (path) => location.pathname === path;

  const navItemStyle = (active) => ({
    padding: '12px 14px',
    borderRadius: '12px',
    cursor: 'pointer',
    color: active ? 'var(--text)' : 'var(--muted)',
    background: active ? 'var(--panel)' : 'transparent',
    fontWeight: active ? 600 : 400,
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    transition: 'all 0.15s ease',
    border: active ? '1px solid var(--line)' : '1px solid transparent',
    textDecoration: 'none',
    fontSize: '14px',
  });

  return (
    <aside className={`sidebar ${isOpen ? 'sidebar-open' : ''}`}>
      {/* Navigation */}
      <nav style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1 }}>
        <Link to="/" style={navItemStyle(isActive('/'))} onClick={onClose}>
          <HomeIcon />
          <span>{t.sidebar?.home || 'Home'}</span>
        </Link>
        <Link to="/trending" style={navItemStyle(isActive('/trending'))} onClick={onClose}>
          <TrendingIcon />
          <span>{t.sidebar?.trending || 'Trending'}</span>
        </Link>
        <Link to="/following" style={navItemStyle(isActive('/following'))} onClick={onClose}>
          <UsersIcon />
          <span>{t.sidebar?.following || 'Following'}</span>
        </Link>
        {/* <Link to="/sounds" style={navItemStyle(isActive('/sounds'))} onClick={onClose}>
          <MusicIcon />
          <span>{t.sidebar?.sounds || 'Sounds'}</span>
        </Link> */}
        <Link to="/favorites" style={navItemStyle(isActive('/favorites'))} onClick={onClose}>
          <StarIcon />
          <span>{t.sidebar?.favorites || 'Favorites'}</span>
        </Link>

        <div style={{ borderTop: '1px solid var(--line)', margin: '12px 0' }} />

        <Link to="/campaigns" style={navItemStyle(isActive('/campaigns'))} onClick={onClose}>
          <TrophyIcon />
          <span>{t.sidebar?.campaigns || 'Campaigns'}</span>
        </Link>
        
        <Link to="/upload" style={navItemStyle(isActive('/upload'))} onClick={onClose}>
          <UploadIcon />
          <span>{t.sidebar?.upload || 'Upload'}</span>
        </Link>
        {/* <Link to="/ai-generator" style={navItemStyle(isActive('/ai-generator'))} onClick={onClose}>
          <SparkleIcon />
          <span style={{ color: 'var(--brand)' }}>{t.sidebar?.aiGenerator || 'AI Video'}</span>
        </Link> */}

        {/* 🛡️ BOTÓN PRIVADO: Solo para administradores */}
        {user && user.role === 'admin' && (
          <Link to="/admin" style={navItemStyle(isActive('/admin'))} onClick={onClose}>
            <ShieldIcon />
            <span style={{ color: 'var(--brand2)' }}>{t.header?.adminPanel || t.adminPanel?.title || 'Admin Panel'}</span>
          </Link>
        )}
      </nav>

      {/* Tip */}
      <div style={{
        fontSize: '12px',
        color: 'var(--muted)',
        lineHeight: 1.4,
        padding: '12px',
        background: 'var(--panel)',
        borderRadius: '12px',
        border: '1px solid var(--line)',
      }}>
        <strong>{t.sidebar?.tipLabel || 'Tip:'}</strong>{' '}
        <span style={{ color: 'var(--brand2)' }}>{t.sidebar?.tipText || 'Click on a video card to watch it.'}</span>
      </div>
    </aside>
  );
}

export default Sidebar;
