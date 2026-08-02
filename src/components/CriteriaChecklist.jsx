const LABELS = {
  industryMatch: 'Industry',
  roleMatch: 'Role',
  companySizeMatch: 'Company Size',
  regionMatch: 'Region',
  growthSignals: 'Growth Signals',
}

const STYLES = {
  match: {
    symbol: '✓',
    className: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
  },
  mismatch: {
    symbol: '✗',
    className: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
  },
  unknown: {
    symbol: '?',
    className: 'bg-muted text-muted-foreground',
  },
}

function CriteriaChecklist({ criteria }) {
  if (!criteria) return null

  return (
    <div className="flex flex-wrap gap-1.5">
      {Object.entries(LABELS).map(([key, label]) => {
        const status = criteria[key] || 'unknown'
        const style = STYLES[status]
        return (
          <span
            key={key}
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${style.className}`}
          >
            <span className="font-bold">{style.symbol}</span>
            {label}
          </span>
        )
      })}
    </div>
  )
}

export default CriteriaChecklist