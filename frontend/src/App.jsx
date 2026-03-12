import { useState } from "react";
import Nav from "./components/Nav";
import LeagueView from "./views/LeagueView";
import TeamView from "./views/TeamView";
import PlayerView from "./views/PlayerView";

const views = {
  league: LeagueView,
  team: TeamView,
  player: PlayerView,
};

export default function App() {
  const [activeView, setActiveView] = useState("league");
  const View = views[activeView];

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <Nav active={activeView} onNavigate={setActiveView} />
      <main className="max-w-[1400px] mx-auto px-5 py-6">
        <View />
      </main>
      <footer className="border-t border-border-subtle py-5 mt-12">
        <p className="text-center text-[11px] text-text-muted tracking-wide">
          NBA Shot Quality Engine &middot; 2024-25 Season &middot; Data via nba_api
        </p>
      </footer>
    </div>
  );
}
