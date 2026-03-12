const tabs = [
  { id: "league", label: "League" },
  { id: "team", label: "Team Defense" },
  { id: "player", label: "Player" },
];

export default function Nav({ active, onNavigate, nidhiMode }) {
  return (
    <header
      className="border-b sticky top-0 z-50 transition-all duration-500"
      style={{
        borderColor: nidhiMode ? "rgba(255, 105, 180, 0.3)" : "#222",
        background: nidhiMode
          ? "linear-gradient(90deg, rgba(30,5,30,0.95), rgba(50,10,40,0.95))"
          : "#111111",
      }}
    >
      <div className="max-w-[1400px] mx-auto px-5 h-12 flex items-center justify-between">
        <button
          onClick={() => onNavigate("league")}
          className="flex items-center gap-2.5 hover:opacity-80 transition-opacity"
        >
          <span
            className="font-bold text-sm tracking-tight transition-colors duration-500"
            style={{ color: nidhiMode ? "#ff69b4" : "#e84d4d" }}
          >
            {nidhiMode ? "\u{1F3C0}" : "SQE"}
          </span>
          <span
            className="text-[13px] font-medium hidden sm:inline transition-colors duration-500"
            style={{ color: nidhiMode ? "#ffb6d9" : "#888" }}
          >
            {nidhiMode ? "NBA \u{1F495} NIDHI Analytics" : "Shot Quality Engine"}
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
                <div
                  className="h-[2px] mt-1 rounded-full transition-colors duration-500"
                  style={{ background: nidhiMode ? "#ff69b4" : "#e84d4d" }}
                />
              )}
            </button>
          ))}
        </nav>
      </div>
    </header>
  );
}
