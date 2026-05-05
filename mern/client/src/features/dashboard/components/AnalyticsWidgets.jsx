import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export const panelClass =
  "rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_16px_30px_-24px_rgba(15,23,42,0.3)]";

const pieColors = ["#0284c7", "#0f172a", "#0ea5e9", "#38bdf8", "#16a34a", "#6366f1"];

export function AnalyticsPanel({ actions = null, children, description, eyebrow, title }) {
  return (
    <section className={panelClass}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          {eyebrow ? (
            <p className="font-['Space_Grotesk'] text-xs uppercase tracking-[0.22em] text-slate-500">
              {eyebrow}
            </p>
          ) : null}
          <h3 className="mt-2 text-xl font-bold text-slate-950">{title}</h3>
          {description ? <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">{description}</p> : null}
        </div>
        {actions}
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

export function StatCard({ helpText, label, tone = "orange", value }) {
  const toneClass =
    tone === "slate"
      ? "bg-slate-950 text-white"
      : tone === "emerald"
        ? "bg-emerald-50 text-emerald-950"
        : "bg-slate-100 text-slate-900";

  return (
    <article className={`rounded-2xl border border-slate-200 px-4 py-4 ${toneClass}`}>
      <p className="text-xs uppercase tracking-[0.22em] opacity-70">{label}</p>
      <p className="mt-4 text-2xl font-extrabold tracking-tight">{value}</p>
      {helpText ? <p className="mt-3 text-sm opacity-75">{helpText}</p> : null}
    </article>
  );
}

export function EmptyState({ message }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-sm text-slate-500">
      {message}
    </div>
  );
}

export function TrendChartCard({
  color = "#f97316",
  data,
  dataKey = "total",
  description,
  secondaryColor = "#0f172a",
  secondaryKey = "",
  title,
  valueFormatter,
}) {
  const formatValue = valueFormatter || ((value) => value);

  return (
    <AnalyticsPanel description={description} title={title}>
      {!data.length ? (
        <EmptyState message="No chart data is available for the selected filters." />
      ) : (
        <div className="h-64">
          <ResponsiveContainer height="100%" width="100%">
            <LineChart data={data}>
              <CartesianGrid stroke="#e2e8f0" strokeDasharray="4 4" />
              <XAxis dataKey="date" tick={{ fill: "#64748b", fontSize: 12 }} />
              <YAxis tick={{ fill: "#64748b", fontSize: 12 }} />
              <Tooltip formatter={(value) => formatValue(value)} />
              <Legend />
              <Line
                activeDot={{ r: 5 }}
                dataKey={dataKey}
                name={dataKey}
                stroke={color}
                strokeWidth={3}
                type="monotone"
              />
              {secondaryKey ? (
                <Line
                  activeDot={{ r: 4 }}
                  dataKey={secondaryKey}
                  name={secondaryKey}
                  stroke={secondaryColor}
                  strokeWidth={2}
                  type="monotone"
                />
              ) : null}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </AnalyticsPanel>
  );
}

export function BarChartCard({
  bars,
  data,
  description,
  title,
  xKey = "label",
  yFormatter,
}) {
  const formatValue = yFormatter || ((value) => value);

  return (
    <AnalyticsPanel description={description} title={title}>
      {!data.length ? (
        <EmptyState message="No chart data is available for the selected filters." />
      ) : (
        <div className="h-64">
          <ResponsiveContainer height="100%" width="100%">
            <BarChart data={data}>
              <CartesianGrid stroke="#e2e8f0" strokeDasharray="4 4" />
              <XAxis dataKey={xKey} tick={{ fill: "#64748b", fontSize: 12 }} />
              <YAxis tick={{ fill: "#64748b", fontSize: 12 }} tickFormatter={formatValue} />
              <Tooltip formatter={(value) => formatValue(value)} />
              <Legend />
              {bars.map((bar) => (
                <Bar
                  dataKey={bar.dataKey}
                  fill={bar.color}
                  key={bar.dataKey}
                  name={bar.name || bar.dataKey}
                  radius={[10, 10, 0, 0]}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </AnalyticsPanel>
  );
}

export function DonutChartCard({
  data,
  dataKey = "value",
  description,
  nameKey = "name",
  title,
  valueFormatter,
}) {
  const formatValue = valueFormatter || ((value) => value);

  return (
    <AnalyticsPanel description={description} title={title}>
      {!data.length ? (
        <EmptyState message="No chart data is available for the selected filters." />
      ) : (
        <div className="h-64">
          <ResponsiveContainer height="100%" width="100%">
            <PieChart>
              <Tooltip formatter={(value) => formatValue(value)} />
              <Legend />
              <Pie
                cx="50%"
                cy="50%"
                data={data}
                dataKey={dataKey}
                innerRadius={70}
                nameKey={nameKey}
                outerRadius={100}
                paddingAngle={3}
              >
                {data.map((entry, index) => (
                  <Cell fill={pieColors[index % pieColors.length]} key={`${entry[nameKey]}-${index}`} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}
    </AnalyticsPanel>
  );
}
