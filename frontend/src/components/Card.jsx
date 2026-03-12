export default function Card({ title, subtitle, children, className = "" }) {
  return (
    <div className={`bg-surface border border-border rounded-lg ${className}`}>
      {title && (
        <div className="px-5 py-3.5 border-b border-border">
          <h2 className="text-[13px] font-semibold text-text-primary">{title}</h2>
          {subtitle && (
            <p className="text-[11px] text-text-muted mt-0.5">{subtitle}</p>
          )}
        </div>
      )}
      <div className="p-0">{children}</div>
    </div>
  );
}
