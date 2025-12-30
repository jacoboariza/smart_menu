export default function Field({ label, hint, children, className = '' } = {}) {
  return (
    <div className={className}>
      {label ? <label className="block text-xs font-medium text-slate-600 mb-1">{label}</label> : null}
      {children}
      {hint ? <div className="mt-2 text-[11px] text-slate-500">{hint}</div> : null}
    </div>
  )
}
