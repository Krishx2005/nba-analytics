const tabs = [
  { id: "league", label: "League" },
  { id: "team", label: "Team Defense" },
  { id: "player", label: "Player" },
];

export default function Nav({ active, onNavigate }) {
  return (
    <header className="border-b border-border bg-surface sticky top-0 z-50">
      <div className="max-w-[1400px] mx-auto px-5 h-12 flex items-center justify-between">
        <button
          onClick={() => onNavigate("league")}
          className="flex items-center gap-2.5 hover:opacity-80 transition-opacity"
        >
          <span className="text-accent font-bold text-sm tracking-tight">SQE</span>
          <span className="text-text-secondary text-[13px] font-medium hidden sm:inline">
            Shot Quality Engine
          </span>
        </button>

        <nav className="flex items-center gap-0.5">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => onNavigate(tab.id)}
              className={`px-3 py-1.5 text-[13px] font-medium transition-colors rounded ${
                active === tab.id
                  ? "text-text-primary"
                  : "text-text-muted hover:text-text-secondary"
              }`}
            >
              {tab.label}
              {active === tab.id && (
                <div className="h-[2px] bg-accent mt-1 rounded-full" />
              )}
            </button>
          ))}
        </nav>
      </div>
    </header>
  );
}
