import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { BookOpen, ChevronDown, CircleHelp, ExternalLink, Info, MessageSquarePlus, X } from 'lucide-react';
import { AccessibleModal } from './AccessibleModal.jsx';
import './HelpMenu.css';

export const featureRequestUrl = `https://fichebait.com/suggest-a-feature/?feature_product=${encodeURIComponent('FicheBait Schema Reference')}`;

export function HelpMenu() {
  const [position, setPosition] = useState(null);
  const [aboutOpen, setAboutOpen] = useState(false);
  const triggerRef = useRef(null);
  const menuRef = useRef(null);
  const menuId = useId();
  const aboutId = useId();
  const open = position !== null;

  function openMenu(last = false) {
    const rect = triggerRef.current.getBoundingClientRect();
    const width = Math.min(232, window.innerWidth - 16);
    setPosition({
      top: Math.max(8, Math.min(rect.bottom + 6, window.innerHeight - 160)),
      right: Math.max(8, Math.min(window.innerWidth - rect.right, window.innerWidth - width - 8)),
      last,
    });
  }

  useEffect(() => {
    if (!open) return;
    const items = menuRef.current.querySelectorAll('[role="menuitem"]');
    (position.last ? items[items.length - 1] : items[0])?.focus();
    function dismiss(event) {
      if (!menuRef.current?.contains(event.target) && !triggerRef.current?.contains(event.target)) setPosition(null);
    }
    function dismissOnResize() { setPosition(null); }
    window.addEventListener('blur', dismissOnResize);
    document.addEventListener('pointerdown', dismiss);
    document.addEventListener('focusin', dismiss);
    window.addEventListener('resize', dismissOnResize);
    return () => {
      document.removeEventListener('pointerdown', dismiss);
      document.removeEventListener('focusin', dismiss);
      window.removeEventListener('blur', dismissOnResize);
      window.removeEventListener('resize', dismissOnResize);
    };
  }, [open, position]);

  function handleMenuKey(event) {
    const items = [...menuRef.current.querySelectorAll('[role="menuitem"]')];
    const index = items.indexOf(document.activeElement);
    const keys = ['ArrowDown', 'ArrowUp', 'Home', 'End', 'Escape'];
    if (!keys.includes(event.key)) return;
    event.preventDefault();
    event.stopPropagation();
    if (event.key === 'Escape') {
      setPosition(null);
      triggerRef.current.focus();
    } else {
      const next = event.key === 'Home' ? 0 : event.key === 'End' ? items.length - 1
        : (index + (event.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length;
      items[next].focus();
    }
  }

  return <>
    <button ref={triggerRef} className="help-trigger" type="button" aria-haspopup="menu" aria-expanded={open} aria-controls={open ? menuId : undefined}
      onClick={() => open ? setPosition(null) : openMenu()}
      onKeyDown={event => {
        if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
          event.preventDefault();
          event.stopPropagation();
          openMenu(event.key === 'ArrowUp');
        }
      }}>
      <CircleHelp size={16} aria-hidden="true" /><span>Help</span><ChevronDown size={13} aria-hidden="true" />
    </button>
    {open && createPortal(<div ref={menuRef} id={menuId} className="help-menu" role="menu" tabIndex={-1} aria-label="Help" style={{ top: position.top, right: position.right }} onKeyDown={handleMenuKey}>
      <a role="menuitem" href={`/user-guide.html?${new URLSearchParams({ return: window.location.search })}`}><BookOpen size={17} aria-hidden="true" />User Guide</a>
      <button role="menuitem" type="button" onClick={() => {
        // The existing modal restores the focus it captures on mount.
        triggerRef.current.focus();
        setPosition(null);
        setAboutOpen(true);
      }}><Info size={17} aria-hidden="true" />About</button>
      <a role="menuitem" href={featureRequestUrl} target="_blank" rel="noopener noreferrer" aria-label="Feature Requests (opens in a new tab)">
        <MessageSquarePlus size={17} aria-hidden="true" /><span>Feature Requests</span><ExternalLink className="help-external" size={13} aria-hidden="true" />
      </a>
    </div>, document.body)}
    {aboutOpen && <AccessibleModal labelledBy={aboutId} onClose={() => setAboutOpen(false)}>
      <div className="help-about">
        <div className="section-title-row"><h2 id={aboutId}>About Schema Reference</h2><button type="button" className="icon-button" aria-label="Close About" title="Close About" onClick={() => setAboutOpen(false)}><X size={18} aria-hidden="true" /></button></div>
        <p>Published by FicheBait, Schema Reference is an independent database schema reference for read-only reporting, troubleshooting, and education across Laserfiche Forms, Directory Server, Repository, and Workflow databases.</p>
        <p>It documents exported schemas and evidence-based notes, not live databases. Coverage varies by product and version; inferred meanings and untested SQL require validation in a test environment. Direct modification of Laserfiche product databases is unsupported.</p>
        <p>Not affiliated with or endorsed by Laserfiche.</p>
      </div>
    </AccessibleModal>}
  </>;
}
