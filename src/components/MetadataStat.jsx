import { InfoTooltip } from './InfoTooltip.jsx';

export function MetadataStat({ icon, label, tooltip, value }) {
  return (
    <div className="metadata-stat">
      {icon}
      <span className="metadata-stat-label">
        {label}
        {tooltip && <InfoTooltip label={`${label}: ${tooltip}`}>{tooltip}</InfoTooltip>}
      </span>
      <strong>{value}</strong>
    </div>
  );
}
