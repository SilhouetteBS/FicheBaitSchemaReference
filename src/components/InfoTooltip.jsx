import { useEffect, useId, useRef, useState } from 'react';

export function InfoTooltip({ label, children }) {
  const tooltipId = useId();
  const containerRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [pinned, setPinned] = useState(false);

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    function handlePointerDown(event) {
      if (!containerRef.current?.contains(event.target)) {
        setPinned(false);
        setOpen(false);
      }
    }

    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [open]);

  function closeTooltip() {
    setPinned(false);
    setOpen(false);
  }

  return (
    <button
      aria-describedby={tooltipId}
      aria-expanded={open}
      aria-label={label}
      className="info-tooltip"
      onBlur={(event) => {
        if (!pinned && !event.currentTarget.contains(event.relatedTarget)) {
          setOpen(false);
        }
      }}
      onClick={() => {
        const next = !pinned;
        setPinned(next);
        setOpen(next);
      }}
      onFocus={() => setOpen(true)}
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          event.preventDefault();
          closeTooltip();
        }
      }}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => {
        if (!pinned) {
          setOpen(false);
        }
      }}
      ref={containerRef}
      type="button"
    >
      i
      <span hidden={!open} id={tooltipId} role="tooltip">{children}</span>
    </button>
  );
}
