export default function JsonViewer({ value, empty = '—', className = '', maxHeightClassName = 'max-h-80' } = {}) {
  const content = value ? JSON.stringify(value, null, 2) : empty

  return (
    <pre
      className={`text-xs bg-slate-50 border border-slate-200 rounded-lg p-3 overflow-auto ${maxHeightClassName} ${className}`.trim()}
    >
      {content}
    </pre>
  )
}
