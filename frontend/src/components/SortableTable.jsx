import { useState, useMemo } from "react";

/**
 * Get a percentile color class for a value within a dataset.
 * top 10% = accent (red), top 25% = high, top 50% = above avg, rest = muted
 */
function pctColor(value, sorted, invert = false) {
  if (!sorted.length || value == null) return "";
  const idx = sorted.indexOf(value);
  const pct = invert ? idx / sorted.length : 1 - idx / sorted.length;
  if (pct >= 0.9) return "text-pct-elite font-semibold";
  if (pct >= 0.75) return "text-pct-high";
  if (pct >= 0.5) return "text-pct-above";
  return "";
}

/**
 * columns: [{ key, label, align?, format?, percentile?, invertPercentile?, width? }]
 * data: array of row objects
 */
export default function SortableTable({ columns, data, defaultSort, defaultOrder = "desc" }) {
  const [sortKey, setSortKey] = useState(defaultSort || columns[0]?.key);
  const [sortOrder, setSortOrder] = useState(defaultOrder);

  const handleSort = (key) => {
    if (sortKey === key) {
      setSortOrder((o) => (o === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortOrder("desc");
    }
  };

  const sorted = useMemo(() => {
    if (!data) return [];
    return [...data].sort((a, b) => {
      const av = a[sortKey], bv = b[sortKey];
      if (av == null) return 1;
      if (bv == null) return -1;
      const cmp = typeof av === "string" ? av.localeCompare(bv) : av - bv;
      return sortOrder === "asc" ? cmp : -cmp;
    });
  }, [data, sortKey, sortOrder]);

  // Precompute sorted arrays for percentile coloring
  const pctArrays = useMemo(() => {
    const arrays = {};
    columns.forEach((col) => {
      if (col.percentile && data) {
        arrays[col.key] = [...data.map((r) => r[col.key])].sort(
          (a, b) => (b ?? 0) - (a ?? 0)
        );
      }
    });
    return arrays;
  }, [data, columns]);

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[12px]">
        <thead>
          <tr className="border-b border-border">
            <th className="text-left pl-5 pr-2 py-2.5 text-[10px] font-semibold text-text-muted uppercase tracking-wider w-10">
              #
            </th>
            {columns.map((col) => (
              <th
                key={col.key}
                onClick={() => handleSort(col.key)}
                className={`py-2.5 px-2 text-[10px] font-semibold text-text-muted uppercase tracking-wider cursor-pointer select-none hover:text-text-secondary transition-colors ${
                  col.align === "left" ? "text-left" : "text-right"
                } ${col.width || ""}`}
              >
                <span className="inline-flex items-center gap-1">
                  {col.label}
                  {sortKey === col.key && (
                    <span className="text-text-secondary">
                      {sortOrder === "asc" ? "\u25B2" : "\u25BC"}
                    </span>
                  )}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map((row, i) => (
            <tr
              key={row.player_id || row.team_id || i}
              className="border-b border-border-subtle hover:bg-row-hover transition-colors"
            >
              <td className="pl-5 pr-2 py-2 text-text-muted">{i + 1}</td>
              {columns.map((col) => {
                const val = row[col.key];
                const fmt = col.format ? col.format(val, row) : val;
                const colorClass = col.percentile
                  ? pctColor(val, pctArrays[col.key] || [], col.invertPercentile)
                  : "";
                return (
                  <td
                    key={col.key}
                    className={`py-2 px-2 ${
                      col.align === "left" ? "text-left" : "text-right"
                    } ${colorClass || "text-text-secondary"}`}
                  >
                    {fmt}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      {sorted.length === 0 && (
        <p className="text-center text-text-muted text-[11px] py-8">No data</p>
      )}
    </div>
  );
}
