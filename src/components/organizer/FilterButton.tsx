import type { FilterValue } from '../../types/app-types';

interface FilterButtonProps {
  value: FilterValue;
  current: FilterValue;
  onSelect: (value: FilterValue) => void;
  label: string;
}

export default function FilterButton({
  value,
  current,
  onSelect,
  label,
}: FilterButtonProps) {
  return (
    <button
      type="button"
      className={`filter-tab ${current === value ? 'active' : ''}`}
      onClick={() => onSelect(value)}
    >
      {label}
    </button>
  );
}
