function escapeCsvValue(value) {
  const normalized =
    value instanceof Date
      ? value.toISOString()
      : value === null || value === undefined
        ? ""
        : String(value);

  if (/[",\r\n]/.test(normalized)) {
    return `"${normalized.replace(/"/g, '""')}"`;
  }

  return normalized;
}

export function buildCsv(columns, rows) {
  const header = columns.map((column) => escapeCsvValue(column.header)).join(",");
  const lines = rows.map((row) =>
    columns.map((column) => escapeCsvValue(column.value(row))).join(",")
  );

  return [header, ...lines].join("\r\n");
}

export function formatCsvDate(value) {
  if (!value) {
    return "";
  }

  return new Date(value).toISOString().slice(0, 10);
}

export function sendCsv(res, { filename, columns, rows }) {
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);

  return res.status(200).send(buildCsv(columns, rows));
}
