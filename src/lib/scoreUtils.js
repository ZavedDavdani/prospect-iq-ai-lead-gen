export function getScoreTier(score) {
  if (score === null || score === undefined) {
    return {
      emoji: '⚪',
      label: 'Not scored',
      className: 'bg-muted text-muted-foreground',
    }
  }
  if (score >= 90) {
    return {
      emoji: '🟢',
      label: 'Excellent',
      className: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
    }
  }
  if (score >= 60) {
    return {
      emoji: '🟡',
      label: 'Good',
      className: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300',
    }
  }
  return {
    emoji: '🔴',
    label: 'Low',
    className: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
  }
}