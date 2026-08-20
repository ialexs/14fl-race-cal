import { useEffect, useMemo, useState } from "react";
import Papa from "papaparse";

type RaceRow = Record<string, string>;

interface ParsedTable {
  headers: string[];
  rows: RaceRow[];
}

function splitHeader(header: string) {
  const parts = header.split("\n");
  return {
    title: parts[0] ?? header,
    date: parts.slice(1).join(" "),
  };
}

function App() {
  const [table, setTable] = useState<ParsedTable>({
    headers: [],
    rows: [],
  });
  const [error, setError] = useState("");

  useEffect(() => {
    Papa.parse<RaceRow>("/races.csv", {
      download: true,
      header: true,
      skipEmptyLines: true,
      complete: (result) => {
        const headers = result.meta.fields ?? [];
        setTable({
          headers,
          rows: result.data,
        });
      },
      error: (parseError) => {
        setError(parseError.message || "Could not load race data.");
      },
    });
  }, []);

  const raceCount = Math.max(table.headers.length - 1, 0);

  const participationCount = useMemo(
    () =>
      table.rows.reduce(
        (total, row) =>
          total +
          table.headers.slice(1).filter((header) => row[header] === "✓")
            .length,
        0,
      ),
    [table],
  );

  return (
    <main className="page-shell">
      <section className="hero">
        <div>
          <p className="eyebrow">~\o/</p>
          <h1>Lt14 Race Calendar</h1>
          <p className="subtitle">
            One shared view of who is racing where — powered directly by CSV.
          </p>
        </div>

        <div className="stats" aria-label="calendar summary">
          <div className="stat">
            <span>{table.rows.length}</span>
            <small>people</small>
          </div>
          <div className="stat">
            <span>{raceCount}</span>
            <small>races</small>
          </div>
          <div className="stat">
            <span>{participationCount}</span>
            <small>entries</small>
          </div>
        </div>
      </section>

      <section className="table-card">
        {error ? (
          <div className="error">{error}</div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  {table.headers.map((header, index) => {
                    const { title, date } = splitHeader(header);

                    return (
                      <th
                        key={header}
                        className={index === 0 ? "person-column" : ""}
                      >
                        <span className="race-title">{title}</span>
                        {date && <span className="race-date">{date}</span>}
                      </th>
                    );
                  })}
                </tr>
              </thead>

              <tbody>
                {table.rows.map((row, rowIndex) => (
                  <tr key={`${row.Person}-${rowIndex}`}>
                    {table.headers.map((header, colIndex) => {
                      const value = row[header] ?? "";
                      const isCheck = value === "✓";

                      return (
                        <td
                          key={header}
                          className={colIndex === 0 ? "person-column" : ""}
                        >
                          {colIndex === 0 ? (
                            <strong>{value}</strong>
                          ) : isCheck ? (
                            <span
                              className="check"
                              aria-label={`${row.Person} participates`}
                              title={`${row.Person} participates`}
                            >
                              ✓
                            </span>
                          ) : (
                            <span className="empty">—</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <footer>
        from <a href="https://x.com/ialexs/status/2090229530229342363">https://x.com/ialexs/status/2090229530229342363</a>
      </footer>
    </main>
  );
}

export default App;
