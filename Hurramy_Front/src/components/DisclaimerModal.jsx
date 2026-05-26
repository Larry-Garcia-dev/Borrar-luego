import { useEffect, useRef } from 'react';
import { translations } from '../utils/translations';

function DisclaimerModal({ isOpen, onClose, onAccept, language = 'en' }) {
  const modalRef = useRef(null);
  const u = translations[language]?.upload || translations.en.upload;

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e) => {
      if (modalRef.current && !modalRef.current.contains(e.target)) onClose();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="disclaimer-overlay">
      <div className="disclaimer-modal" ref={modalRef}>
        {/* Header */}
        <div className="disclaimer-modal-header">
          <div className="disclaimer-header-content">
            <div className="disclaimer-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                <path d="m9 12 2 2 4-4"/>
              </svg>
            </div>
            <h3 className="disclaimer-modal-title">{u.disclaimerModalTitle}</h3>
          </div>
          <button className="iconBtn" onClick={onClose} aria-label="Close">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="disclaimer-modal-body">
          <p className="disclaimer-intro">
            {u.disclaimerModalIntro}
          </p>

          <div className="disclaimer-sections">
            <div className="disclaimer-section">
              <div className="disclaimer-section-header">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/>
                  <circle cx="12" cy="12" r="4"/>
                </svg>
                <h4>{u.disclaimerOwnership}</h4>
              </div>
              <p>{u.disclaimerOwnershipText}</p>
            </div>

            <div className="disclaimer-section">
              <div className="disclaimer-section-header">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/>
                </svg>
                <h4>{u.disclaimerNoInfringement}</h4>
              </div>
              <p>{u.disclaimerNoInfringementText}</p>
            </div>

            <div className="disclaimer-section">
              <div className="disclaimer-section-header">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                  <circle cx="12" cy="7" r="4"/>
                </svg>
                <h4>{u.disclaimerResponsibility}</h4>
              </div>
              <p>{u.disclaimerResponsibilityText}</p>
            </div>

            <div className="disclaimer-section">
              <div className="disclaimer-section-header">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"/>
                  <path d="M12 8v8"/>
                  <path d="M8 12h8"/>
                </svg>
                <h4>{u.disclaimerUsageRights}</h4>
              </div>
              <p>{u.disclaimerUsageRightsText}</p>
            </div>

            <div className="disclaimer-section">
              <div className="disclaimer-section-header">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18.36 6.64a9 9 0 1 1-12.73 0"/>
                  <line x1="12" y1="2" x2="12" y2="12"/>
                </svg>
                <h4>{u.disclaimerProhibited}</h4>
              </div>
              <p>{u.disclaimerProhibitedText}</p>
            </div>

            <div className="disclaimer-section">
              <div className="disclaimer-section-header">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 6h18"/>
                  <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/>
                  <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
                </svg>
                <h4>{u.disclaimerRemoval}</h4>
              </div>
              <p>{u.disclaimerRemovalText}</p>
            </div>

            <div className="disclaimer-section">
              <div className="disclaimer-section-header">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                </svg>
                <h4>{u.disclaimerIndemnification}</h4>
              </div>
              <p>{u.disclaimerIndemnificationText}</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="disclaimer-modal-footer">
          <button className="btn primary" onClick={() => { if (onAccept) onAccept(); onClose(); }}>
            {u.disclaimerUnderstand}
          </button>
        </div>
      </div>
    </div>
  );
}

export default DisclaimerModal;
