import { api } from "../api";
import { useFetch } from "../hooks/useFetch";
import Card from "../components/Card";
import SortableTable from "../components/SortableTable";
import Loader from "../components/Loader";
import ErrorBanner from "../components/ErrorBanner";

const fmtPct = (v) => v != null ? (v * 100).toFixed(1) + "%" : "—";
const fmtSqs = (v) => v != null ? v.toFixed(3) : "—";
const fmtInt = (v) => v != null ? v.toLocaleString() : "—";
const fmtGap = (v) => {
  if (v == null) return "—";
  const s = (v * 100).toFixed(1);
  return v > 0 ? `+${s}%` : `${s}%`;
};

const selectorColumns = [
  { key: "player_name", label: "Player", align: "left", format: (v) => v },
  { key: "team_name", label: "Team", align: "left", format: (v) => v },
  { key: "games_played", label: "GP", format: fmtInt },
  { key: "total_fga", label: "FGA", format: fmtInt },
  { key: "fg_pct", label: "FG%", format: fmtPct, percentile: true },
  { key: "avg_sqs", label: "Avg SQS", format: fmtSqs, percentile: true },
  { key: "avg_distance", label: "Avg Dist", format: (v) => v != null ? v.toFixed(1) + " ft" : "—" },
  { key: "paint_pct", label: "Paint%", format: fmtPct, percentile: true },
  { key: "three_pt_pct", label: "3PT%", format: fmtPct },
];

const clutchColumns = [
  { key: "player_name", label: "Player", align: "left", format: (v) => v },
  { key: "team_name", label: "Team", align: "left", format: (v) => v },
  { key: "total_fga", label: "FGA", format: fmtInt },
  { key: "fg_pct", label: "FG%", format: fmtPct, percentile: true },
  { key: "avg_sqs", label: "Avg SQS", format: fmtSqs },
  {
    key: "sqs_gap",
    label: "Gap",
    format: fmtGap,
    percentile: true,
  },
  {
    key: "label",
    label: "Label",
    align: "left",
    format: (v) => {
      if (v === "overperformer") return "\u25B2 Over";
      if (v === "underperformer") return "\u25BC Under";
      return "—";
    },
  },
];

export default function LeagueView() {
  const selectors = useFetch(() => api.getTopSelectors(50), []);
  const clutch = useFetch(() => api.getClutch(30), []);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-[15px] font-semibold text-text-primary">League Overview</h1>
        <p className="text-[11px] text-text-muted mt-0.5">
          2024-25 season &middot; Min 50 FGA
        </p>
      </div>

      <Card title="Shot Selection Leaders" subtitle="Ranked by average Shot Quality Score">
        {selectors.loading && <Loader />}
        {selectors.error && <ErrorBanner message={selectors.error} onRetry={selectors.refetch} />}
        {selectors.data && (
          <SortableTable
            columns={selectorColumns}
            data={selectors.data}
            defaultSort="avg_sqs"
          />
        )}
      </Card>

      <Card title="SQS vs Actual FG% Gap" subtitle="Players whose shooting most diverges from shot quality">
        {clutch.loading && <Loader />}
        {clutch.error && <ErrorBanner message={clutch.error} onRetry={clutch.refetch} />}
        {clutch.data && (
          <SortableTable
            columns={clutchColumns}
            data={clutch.data}
            defaultSort="sqs_gap"
          />
        )}
      </Card>
    </div>
  );
}
