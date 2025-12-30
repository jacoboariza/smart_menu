export default function Card({ as: As = 'div', className = '', children } = {}) {
  return (
    <As className={`rounded-xl border border-slate-200 bg-white p-5 ${className}`.trim()}>
      {children}
    </As>
  )
}
