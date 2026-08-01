import { getScoreTier } from '@/lib/scoreUtils'

function ScoreBadge({ score, size = 'default' }) {
  const tier = getScoreTier(score)
  const sizeClasses = size === 'sm' ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-0.5 text-xs'

  return (
    <span
      className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full font-medium ${sizeClasses} ${tier.className}`}
    >
      <span>{tier.emoji}</span>
      {typeof score === 'number' ? `${score}/100` : 'Not scored'}
    </span>
  )
}

export default ScoreBadge