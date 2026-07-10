export function InfoTooltip({ label, children }) {
  return (
    <button aria-label={label} className="info-tooltip" type="button">
      i
      <span role="tooltip">{children}</span>
    </button>
  );
}
