export default function ErrorBanner({ message, onRetry }) {
  return (
    <div className="px-5 py-4 flex items-center justify-between">
      <div>
        <p className="text-[12px] font-medium text-accent">Failed to load data</p>
        <p className="text-[11px] text-text-muted mt-0.5">{message}</p>
      </div>
      {onRetry && (
        <button
          onClick={onRetry}
          className="px-3 py-1 text-[11px] font-medium rounded border border-border text-text-secondary hover:text-text-primary hover:border-text-muted transition-colors"
        >
          Retry
        </button>
      )}
    </div>
  );
}
