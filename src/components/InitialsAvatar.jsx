import { getInitials, getAvatarColor } from '@/lib/avatarUtils'

function InitialsAvatar({ name, className = '' }) {
  return (
    <div
      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white ${getAvatarColor(
        name
      )} ${className}`}
    >
      {getInitials(name)}
    </div>
  )
}

export default InitialsAvatar