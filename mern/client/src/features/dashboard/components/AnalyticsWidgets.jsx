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
import { cn } from "../../../shared/lib/utils";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../../shared/components/ui/card";
import {
  TrendingUp,
  TrendingDown,
  Activity,
  AlertCircle,
} from "lucide-react";

const chartColors = [
  "hsl(199, 89%, 48%)",
  "hsl(160, 60%, 45%)",
  "hsl(30, 80%, 55%)",
  "hsl(280, 65%, 60%)",
  "hsl(340, 75%, 55%)",
  "hsl(220, 70%, 55%)",
];

export function AnalyticsPanel({ actions = null, children, description, eyebrow, title }) {
  return (
    <Card className="animate-fade-in">
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1">
            {eyebrow ? (
              <p className="font-display text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                {eyebrow}
              </p>
            ) : null}
            <CardTitle>{title}</CardTitle>
            {description ? <CardDescription className="max-w-2xl">{description}</CardDescription> : null}
          </div>
          {actions}
        </div>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

export function StatCard({ helpText, label, tone = "default", value, icon: Icon, trend }) {
  const toneClasses = {
    default: "bg-card border-border",
    slate: "bg-foreground text-background border-foreground",
    emerald: "bg-emerald-50 text-emerald-950 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-100 dark:border-emerald-800",
    primary: "bg-primary/10 text-primary border-primary/20 dark:bg-primary/20",
    orange: "bg-card border-border",
    amber: "bg-amber-50 text-amber-950 border-amber-200 dark:bg-amber-950/30 dark:text-amber-100 dark:border-amber-800",
  };

  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-xl border p-4 transition-all duration-200 hover:shadow-md",
        toneClasses[tone] || toneClasses.default
      )}
    >
      <div className="flex items-start justify-between">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] opacity-60">{label}</p>
        {Icon ? (
          <Icon className="h-4 w-4 opacity-40" />
        ) : null}
      </div>
      <p className="mt-2 text-2xl font-extrabold tracking-tight">{value}</p>
      {trend != null ? (
        <div className={cn("mt-1.5 flex items-center gap-1 text-xs font-medium", trend >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400")}>
          {trend >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
          {trend >= 0 ? "+" : ""}{trend}%
        </div>
      ) : null}
      {helpText ? <p className="mt-2 text-xs opacity-60">{helpText}</p> : null}
      <div className="absolute -right-4 -top-4 h-16 w-16 rounded-full bg-current opacity-[0.03] transition-transform group-hover:scale-150" />
    </div>
  );
}

export function EmptyState({ message, icon: Icon = AlertCircle }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/50 px-6 py-10 text-center">
      <div className="mb-3 rounded-full bg-muted p-3">
        <Icon className="h-5 w-5 text-muted-foreground" />
      </div>
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  );
}

export function TrendChartCard({
  color = "hsl(199, 89%, 48%)",
  data,
  dataKey = "total",
  description,
  secondaryColor = "hsl(160, 60%, 45%)",
  secondaryKey = "",
  title,
  valueFormatter,
}) {
  const formatValue = valueFormatter || ((value) => value);

  return (
    <AnalyticsPanel description={description} title={title}>
      {!data.length ? (
        <EmptyState message="No chart data is available for the selected filters." icon={Activity} />
      ) : (
        <div className="h-64">
          <ResponsiveContainer height="100%" width="100%">
            <LineChart data={data}>
              <defs>
                <linearGradient id={`gradient-${dataKey}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={color} stopOpacity={0.15} />
                  <stop offset="100%" stopColor={color} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" />
              <XAxis dataKey="date" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} tickLine={false} axisLine={false} />
              <Tooltip
                formatter={(value) => formatValue(value)}
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  borderColor: "hsl(var(--border))",
                  borderRadius: "8px",
                  fontSize: "12px",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                }}
              />
              <Legend wrapperStyle={{ fontSize: "12px" }} />
              <Line
                activeDot={{ r: 5, strokeWidth: 2, fill: "hsl(var(--card))" }}
                dataKey={dataKey}
                name={dataKey}
                stroke={color}
                strokeWidth={2.5}
                type="monotone"
                fill={`url(#gradient-${dataKey})`}
                dot={false}
              />
              {secondaryKey ? (
                <Line
                  activeDot={{ r: 4 }}
                  dataKey={secondaryKey}
                  name={secondaryKey}
                  stroke={secondaryColor}
                  strokeWidth={2}
                  type="monotone"
                  dot={false}
                  strokeDasharray="4 4"
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
        <EmptyState message="No chart data is available for the selected filters." icon={Activity} />
      ) : (
        <div className="h-64">
          <ResponsiveContainer height="100%" width="100%">
            <BarChart data={data}>
              <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" />
              <XAxis dataKey={xKey} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={formatValue} />
              <Tooltip
                formatter={(value) => formatValue(value)}
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  borderColor: "hsl(var(--border))",
                  borderRadius: "8px",
                  fontSize: "12px",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                }}
              />
              <Legend wrapperStyle={{ fontSize: "12px" }} />
              {bars.map((bar, i) => (
                <Bar
                  dataKey={bar.dataKey}
                  fill={bar.color || chartColors[i % chartColors.length]}
                  key={bar.dataKey}
                  name={bar.name || bar.dataKey}
                  radius={[6, 6, 0, 0]}
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
        <EmptyState message="No chart data is available for the selected filters." icon={Activity} />
      ) : (
        <div className="h-64">
          <ResponsiveContainer height="100%" width="100%">
            <PieChart>
              <Tooltip
                formatter={(value) => formatValue(value)}
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  borderColor: "hsl(var(--border))",
                  borderRadius: "8px",
                  fontSize: "12px",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                }}
              />
              <Legend wrapperStyle={{ fontSize: "12px" }} />
              <Pie
                cx="50%"
                cy="50%"
                data={data}
                dataKey={dataKey}
                innerRadius={70}
                nameKey={nameKey}
                outerRadius={100}
                paddingAngle={3}
                strokeWidth={2}
                stroke="hsl(var(--card))"
              >
                {data.map((entry, index) => (
                  <Cell fill={chartColors[index % chartColors.length]} key={`${entry[nameKey]}-${index}`} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}
    </AnalyticsPanel>
  );
}
