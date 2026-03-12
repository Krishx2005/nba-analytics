import { api } from "../api";
import { useFetch } from "../hooks/useFetch";
import Card from "../components/Card";
import SortableTable from "../components/SortableTable";
import Loader from "../components/Loader";
import ErrorBanner from "../components/ErrorBanner";

const fmtPct = (v) => v != null ? (v * 100).toFixed(1) + "%" : "—";
const fmtSqs = (v) => v != null ? v.toFixed(4) : "—";
const fmtInt = (v) => v != null ? v.toLocaleString() : "—";

const columns = [
  { key: "team_name", label: "Team", align: "left", format: (v) => v },
  { key: "opponent_fga", label: "Opp FGA", format: fmtInt },
  { key: "opponent_fgm", label: "Opp FGM", format: fmtInt },
  { key: "opponent_fg_pct", label: "Opp FG%", format: fmtPct, percentile: true, invertPercentile: true },
  { key: "avg_sqs_allowed", label: "SQS Allowed", format: fmtSqs, percentile: true, invertPercentile: true },
];

export default function TeamView() {
  const { data, loading, error, refetch } = useFetch(() => api.getTeamDefense(), []);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-[15px] font-semibold text-text-primary">Team Defense</h1>
        <p className="text-[11px] text-text-muted mt-0.5">
          Ranked by average Shot Quality Score allowed to opponents &middot; Lower is better
        </p>
      </div>

      <Card title="Defensive Shot Quality Rankings">
        {loading && <Loader />}
        {error && <ErrorBanner message={error} onRetry={refetch} />}
        {data && (
          <SortableTable
            columns={columns}
            data={data}
            defaultSort="avg_sqs_allowed"
            defaultOrder="asc"
          />
        )}
      </Card>

      {data && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Stat label="Best Defense" value={data[0]?.team_name} sub={fmtSqs(data[0]?.avg_sqs_allowed)} />
          <Stat label="Worst Defense" value={data[data.length - 1]?.team_name} sub={fmtSqs(data[data.length - 1]?.avg_sqs_allowed)} />
          <Stat
            label="League Avg"
            value={fmtSqs(data.reduce((s, t) => s + t.avg_sqs_allowed, 0) / data.length)}
          />
          <Stat
            label="Tightest Opp FG%"
            value={data.reduce((b, t) => t.opponent_fg_pct < b.opponent_fg_pct ? t : b, data[0])?.team_name}
            sub={fmtPct(data.reduce((b, t) => t.opponent_fg_pct < b.opponent_fg_pct ? t : b, data[0])?.opponent_fg_pct)}
          />
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, sub }) {
  return (
    <div className="bg-surface border border-border rounded-lg px-4 py-3">
      <p className="text-[10px] font-medium text-text-muted uppercase tracking-wider">{label}</p>
      <p className="text-[13px] font-semibold text-text-primary mt-1">{value}</p>
      {sub && <p className="text-[11px] text-accent mt-0.5">{sub}</p>}
    </div>
  );
}
