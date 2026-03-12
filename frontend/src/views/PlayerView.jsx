import { useState, useMemo } from "react";
import {
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, ZAxis,
} from "recharts";
import Select from "react-select";
import { api } from "../api";
import { useFetch } from "../hooks/useFetch";
import Card from "../components/Card";
import SortableTable from "../components/SortableTable";
import Loader from "../components/Loader";
import ErrorBanner from "../components/ErrorBanner";

const selectStyles = {
  control: (base, { isFocused }) => ({
    ...base,
    backgroundColor: "#111111",
    borderColor: isFocused ? "#444" : "#222",
    borderRadius: 8,
    minHeight: 44,
    fontSize: 14,
    boxShadow: "none",
    "&:hover": { borderColor: "#333" },
  }),
  menu: (base) => ({
    ...base,
    backgroundColor: "#161616",
    border: "1px solid #222",
    borderRadius: 8,
    marginTop: 4,
  }),
  option: (base, { isFocused, isSelected }) => ({
    ...base,
    backgroundColor: isSelected ? "#e84d4d" : isFocused ? "#1a1a1a" : "transparent",
    color: isSelected ? "#fff" : "#ccc",
    fontSize: 13,
    padding: "8px 14px",
  }),
  singleValue: (base) => ({ ...base, color: "#e5e5e5", fontSize: 14 }),
  input: (base) => ({ ...base, color: "#e5e5e5" }),
  placeholder: (base) => ({ ...base, color: "#555", fontSize: 14 }),
  indicatorSeparator: () => ({ display: "none" }),
  dropdownIndicator: (base) => ({ ...base, color: "#555", "&:hover": { color: "#888" } }),
};

const fmtPct = (v) => v != null ? (v * 100).toFixed(1) + "%" : "—";
const fmtSqs = (v) => v != null ? v.toFixed(3) : "—";

const gameColumns = [
  { key: "game_date", label: "Date", align: "left", format: (v) => v },
  { key: "matchup", label: "Matchup", align: "left", format: (v) => v },
  { key: "fga", label: "FGA" },
  { key: "fgm", label: "FGM" },
  { key: "game_fg_pct", label: "FG%", format: fmtPct, percentile: true },
  { key: "game_avg_sqs", label: "Avg SQS", format: fmtSqs, percentile: true },
  { key: "rest_days", label: "Rest", format: (v) => v != null ? v + "d" : "—" },
  {
    key: "is_back_to_back",
    label: "B2B",
    format: (v) => v ? "Yes" : "",
  },
];

function ScatterTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-[#161616] border border-border rounded-md px-3 py-2 text-[11px]">
      <p className="font-medium text-text-primary">{d.matchup}</p>
      <p className="text-text-muted">{d.game_date}</p>
      <div className="mt-1.5 space-y-0.5 text-text-secondary">
        <p>FG%: <span className="text-text-primary font-medium">{fmtPct(d.game_fg_pct)}</span></p>
        <p>SQS: <span className="text-accent font-medium">{fmtSqs(d.game_avg_sqs)}</span></p>
        <p>{d.fga} FGA &middot; {d.rest_days ?? "?"} rest days{d.is_back_to_back ? " (B2B)" : ""}</p>
      </div>
    </div>
  );
}

export default function PlayerView() {
  const [selectedPlayer, setSelectedPlayer] = useState(null);

  const players = useFetch(() => api.getPlayers(50), []);
  const scatter = useFetch(
    () => (selectedPlayer ? api.getPlayerScatter(selectedPlayer.value) : Promise.resolve(null)),
    [selectedPlayer?.value]
  );

  const playerOptions = useMemo(() => {
    if (!players.data) return [];
    return players.data.map((p) => ({
      value: p.player_id,
      label: `${p.player_name} — ${p.team_name}`,
      player: p,
    }));
  }, [players.data]);

  const avgSqs = useMemo(() => {
    if (!scatter.data?.length) return 0;
    return scatter.data.reduce((s, g) => s + g.game_avg_sqs, 0) / scatter.data.length;
  }, [scatter.data]);

  const avgFg = useMemo(() => {
    if (!scatter.data?.length) return 0;
    return scatter.data.reduce((s, g) => s + g.game_fg_pct, 0) / scatter.data.length;
  }, [scatter.data]);

  const stats = useMemo(() => {
    if (!scatter.data?.length) return null;
    const d = scatter.data;
    const totalFga = d.reduce((s, g) => s + g.fga, 0);
    const totalFgm = d.reduce((s, g) => s + g.fgm, 0);
    return {
      games: d.length,
      totalFga,
      totalFgm,
      fgPct: totalFga > 0 ? totalFgm / totalFga : 0,
      avgSqs,
      b2b: d.filter((g) => g.is_back_to_back).length,
    };
  }, [scatter.data, avgSqs]);

  const playerName = selectedPlayer?.label.split(" — ")[0];

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-[15px] font-semibold text-text-primary">Player Analysis</h1>
        <p className="text-[11px] text-text-muted mt-0.5">
          Search for a player to view game-by-game shot quality
        </p>
      </div>

      <div className="max-w-xl mx-auto">
        {players.loading ? (
          <Loader />
        ) : players.error ? (
          <ErrorBanner message={players.error} onRetry={players.refetch} />
        ) : (
          <Select
            options={playerOptions}
            value={selectedPlayer}
            onChange={setSelectedPlayer}
            placeholder="Search players..."
            styles={selectStyles}
            isSearchable
          />
        )}
      </div>

      {selectedPlayer && (
        <>
          {stats && (
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2.5">
              <Stat label="GP" value={stats.games} />
              <Stat label="FGA" value={stats.totalFga.toLocaleString()} />
              <Stat label="FGM" value={stats.totalFgm.toLocaleString()} />
              <Stat label="FG%" value={fmtPct(stats.fgPct)} />
              <Stat label="Avg SQS" value={fmtSqs(stats.avgSqs)} accent />
              <Stat label="B2B" value={stats.b2b} />
            </div>
          )}

          <Card
            title={`${playerName} — SQS vs FG% by Game`}
            subtitle="Each point is one game. Dot size = FGA. Dashed lines = season averages."
          >
            {scatter.loading && <Loader />}
            {scatter.error && <ErrorBanner message={scatter.error} onRetry={scatter.refetch} />}
            {scatter.data && scatter.data.length > 0 && (
              <div className="p-4">
                <ResponsiveContainer width="100%" height={380}>
                  <ScatterChart margin={{ top: 10, right: 16, bottom: 24, left: 8 }}>
                    <CartesianGrid stroke="#1a1a1a" />
                    <XAxis
                      type="number"
                      dataKey="game_avg_sqs"
                      name="Avg SQS"
                      domain={["dataMin - 0.05", "dataMax + 0.05"]}
                      tick={{ fill: "#555", fontSize: 10 }}
                      tickFormatter={(v) => v.toFixed(2)}
                      label={{ value: "Shot Quality Score", position: "bottom", fill: "#444", fontSize: 11, offset: -5 }}
                    />
                    <YAxis
                      type="number"
                      dataKey="game_fg_pct"
                      name="FG%"
                      domain={[0, "dataMax + 0.1"]}
                      tick={{ fill: "#555", fontSize: 10 }}
                      tickFormatter={(v) => `${(v * 100).toFixed(0)}%`}
                      label={{ value: "FG%", angle: -90, position: "insideLeft", fill: "#444", fontSize: 11 }}
                    />
                    <ZAxis type="number" dataKey="fga" range={[30, 180]} name="FGA" />
                    <Tooltip content={<ScatterTooltip />} />
                    <ReferenceLine x={avgSqs} stroke="#333" strokeDasharray="4 4" />
                    <ReferenceLine y={avgFg} stroke="#333" strokeDasharray="4 4" />
                    <Scatter data={scatter.data} fill="#e84d4d" fillOpacity={0.7} />
                  </ScatterChart>
                </ResponsiveContainer>
              </div>
            )}
            {scatter.data && scatter.data.length === 0 && (
              <p className="text-center text-text-muted text-[11px] py-10">No game data for this player.</p>
            )}
          </Card>

          <Card title={`${playerName} — Game Log`} subtitle="Sortable by any column">
            {scatter.data && scatter.data.length > 0 && (
              <SortableTable
                columns={gameColumns}
                data={scatter.data}
                defaultSort="game_date"
                defaultOrder="desc"
              />
            )}
          </Card>
        </>
      )}

      {!selectedPlayer && (
        <p className="text-center text-text-muted text-[12px] py-16">
          Select a player to begin
        </p>
      )}
    </div>
  );
}

function Stat({ label, value, accent }) {
  return (
    <div className="bg-surface border border-border rounded-lg px-3 py-2.5 text-center">
      <p className="text-[9px] font-semibold text-text-muted uppercase tracking-widest">{label}</p>
      <p className={`text-[15px] font-bold mt-0.5 ${accent ? "text-accent" : "text-text-primary"}`}>
        {value}
      </p>
    </div>
  );
}
