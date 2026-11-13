export default function DataTable({ columns = [], rows = [], empty = "No rows.", className = "" }) {
  return (
    <div className={`overflow-x-auto ${className}`}>
      <table className="w-full min-w-[28rem] border-collapse text-left text-sm">
        <thead>
          <tr className="border-b border-[var(--tt-border)]">
            {columns.map((col) => (
              <th
                key={col.key}
                className="px-3 py-2 text-sm font-semibold text-[var(--tt-secondary)]"
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-3 py-6 text-[var(--tt-secondary)]">
                {empty}
              </td>
            </tr>
          ) : (
            rows.map((row, idx) => (
              <tr key={row.id ?? idx} className="border-b border-[var(--tt-border)] last:border-b-0">
                {columns.map((col) => (
                  <td key={col.key} className="px-3 py-2.5 text-[var(--tt-ink)] align-top">
                    {col.render ? col.render(row) : row[col.key]}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
