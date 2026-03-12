import { useState } from "react";
import Nav from "./components/Nav";
import NidhiChaos from "./components/NidhiChaos";
import LeagueView from "./views/LeagueView";
import TeamView from "./views/TeamView";
import PlayerView from "./views/PlayerView";
import { useNidhi } from "./hooks/useNidhi";

const views = {
  league: LeagueView,
  team: TeamView,
  player: PlayerView,
};

export default function App() {
  const [activeView, setActiveView] = useState("league");
  const nidhiMode = useNidhi();
  const View = views[activeView];

  return (
    <div className="min-h-screen transition-colors duration-500">
      <Nav active={activeView} onNavigate={setActiveView} nidhiMode={nidhiMode} />
      <main className="max-w-[1400px] mx-auto px-5 py-6 relative z-10">
        <View />
      </main>
      <footer
        className="py-5 mt-12 transition-colors duration-500"
        style={{
          borderTop: nidhiMode ? "1px solid rgba(255,105,180,0.2)" : "1px solid #1a1a1a",
        }}
      >
        <p className="text-center text-[11px] tracking-wide transition-colors duration-500"
          style={{ color: nidhiMode ? "#ff69b4" : "#555" }}
        >
          {nidhiMode
            ? "\u{1F495} NBA Shot Quality Engine \u{1F495} made with love \u{1F495}"
            : <>NBA Shot Quality Engine &middot; 2024-25 Season &middot; Data via nba_api</>
          }
        </p>
      </footer>
      <NidhiChaos active={nidhiMode} />
    </div>
  );
}
