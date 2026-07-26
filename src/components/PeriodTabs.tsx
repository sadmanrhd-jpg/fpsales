import type { PeriodFilter } from '../types'

export function PeriodTabs({ value, onChange, disabledHistory = false }: { value: PeriodFilter; onChange: (period: PeriodFilter) => void; disabledHistory?: boolean }) {
  const options: Array<{ value: PeriodFilter; label: string }> = [
    { value: 'daily', label: 'Daily' },
    { value: 'weekly', label: 'Weekly' },
    { value: 'monthly', label: 'Monthly' },
  ]
  return (
    <div className="segmented-control" aria-label="Report period">
      {options.map((option) => (
        <button
          type="button"
          key={option.value}
          className={value === option.value ? 'active' : ''}
          disabled={disabledHistory && option.value !== 'daily'}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}
