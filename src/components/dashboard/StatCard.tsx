import Icon from '../ui/Icon';
import type { IconName } from '../ui/Icon';

interface StatCardProps {
  label: string;
  value: string;
  hint: string;
  icon: IconName;
  color: string;
}

export default function StatCard({
  label,
  value,
  hint,
  icon,
  color,
}: StatCardProps) {
  return (
    <div className="stat-card">
      <div className={`stat-icon stat-icon-${color}`}>
        <Icon name={icon} size={19} />
      </div>
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value}</div>
      <div className="stat-hint">{hint}</div>
    </div>
  );
}
