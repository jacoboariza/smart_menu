export default function ActionButton({
  type = 'button',
  onClick,
  disabled,
  loading,
  className = '',
  icon,
  children,
  loadingText,
} = {}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={
        `inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors disabled:opacity-50 ${className}`.trim()
      }
    >
      {icon ? <span className={loading ? 'animate-spin' : ''}>{icon}</span> : null}
      {loading ? loadingText || children : children}
    </button>
  )
}
