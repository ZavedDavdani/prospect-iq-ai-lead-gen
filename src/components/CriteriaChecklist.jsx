const LABELS = {
  industryMatch: 'Industry Match',
  roleMatch: 'Role Match',
  companySizeMatch: 'Company Size',
  regionMatch: 'Region',
  growthSignals: 'Growth Signals',
}

const ICONS = {
  match: { symbol: '✓', className: 'text-green-600 dark:text-green-400' },
  mismatch: { symbol: '✗', className: 'text-red-600 dark:text-red-400' },
  unknown: { symbol: '?', className: 'text-muted-foreground' },
}

function CriteriaChecklist({ criteria }) {
  if (!criteria) return null

  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
      {Object.entries(LABELS).map(([key, label]) => {
        const status = criteria[key] || 'unknown'
        const icon = ICONS[status]
        return (
          <div key={key} className="flex items-center justify-between gap-2">
            <span className="text-muted-foreground">{label}</span>
            <span className={`font-semibold ${icon.className}`}>{icon.symbol}</span>
          </div>
        )
      })}
    </div>
  )
}

export default CriteriaChecklist