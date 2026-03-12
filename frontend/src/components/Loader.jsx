export default function Loader() {
  return (
    <div className="flex items-center justify-center py-16">
      <div className="flex items-center gap-2 text-text-muted text-xs">
        <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        Loading
      </div>
    </div>
  );
}
