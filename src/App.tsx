import { useEffect, useMemo, useRef, useState } from "react";
import Papa from "papaparse";
import raceDataLastUpdated from "virtual:race-data-updated";

type RaceRow = Record<string, string>;

interface ParsedTable {
  headers: string[];
  rows: RaceRow[];
}

interface UpcomingRace {
  id: string;
  name: string;
  date: Date;
}

const countdownStorageKey = "lt14-race-calendar-last-countdown-race";
const raceHeaderPattern = /^(.+?)\/(\d{1,2})\s*([a-zA-Z]{3,})(?:\s*(\d{4}))?$/;

const monthNumbers: Record<string, number> = {
  jan: 0,
  feb: 1,
  mar: 2,
  apr: 3,
  may: 4,
  jun: 5,
  jul: 6,
  aug: 7,
  sep: 8,
  oct: 9,
  nov: 10,
  dec: 11,
};

function splitHeader(header: string) {
  const raceHeader = header.match(raceHeaderPattern);
  if (raceHeader) {
    const [, title, day, month, year] = raceHeader;
    return { title, date: `${day} ${month}${year ? ` ${year}` : ""}` };
  }

  const parts = header.split("\n");
  return {
    title: parts[0] ?? header,
    date: parts.slice(1).join(" "),
  };
}

function isRaceEntry(value: string) {
  return value.trim().length > 0;
}

function distanceBadgeClass(value: string) {
  const distance = value.trim().toLowerCase().replaceAll(" ", "");

  switch (distance) {
    case "5k":
      return "distance-5k";
    case "10k":
      return "distance-10k";
    case "21k":
      return "distance-21k";
    default:
      return "distance-other";
  }
}

function upcomingRaceFromHeader(header: string, today: Date): UpcomingRace | null {
  const match = header.match(raceHeaderPattern);
  if (!match) return null;

  const [, name, dayText, monthText, yearText] = match;
  const month = monthNumbers[monthText.slice(0, 3).toLowerCase()];
  const day = Number(dayText);
  const year = yearText ? Number(yearText) : today.getFullYear();

  if (month === undefined || !Number.isInteger(day) || day < 1 || day > 31) {
    return null;
  }

  const startOfToday = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
  );
  const date = new Date(year, month, day);

  if (date.getFullYear() !== year || date.getMonth() !== month || date.getDate() !== day) return null;
  if (date < startOfToday) return null;

  return { id: header, name: name.trim(), date };
}

function fuzzyCountdown(targetDate: Date, today: Date) {
  const startOfToday = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
  );
  const days = Math.round(
    (targetDate.getTime() - startOfToday.getTime()) / 86_400_000,
  );

  if (days === 0) return "today";
  if (days < 7) return `${days} day${days === 1 ? "" : "s"}`;
  if (days < 28) {
    const weeks = Math.round(days / 7);
    return `${weeks} week${weeks === 1 ? "" : "s"}`;
  }

  let months =
    (targetDate.getFullYear() - startOfToday.getFullYear()) * 12 +
    targetDate.getMonth() -
    startOfToday.getMonth();
  let remainingDays = targetDate.getDate() - startOfToday.getDate();

  if (remainingDays < 0) {
    months -= 1;
    const daysInPreviousMonth = new Date(
      targetDate.getFullYear(),
      targetDate.getMonth(),
      0,
    ).getDate();
    remainingDays += daysInPreviousMonth;
  }

  if (months === 0) {
    const weeks = Math.round(days / 7);
    return `${weeks} week${weeks === 1 ? "" : "s"}`;
  }

  const parts = [`${months} month${months === 1 ? "" : "s"}`];
  if (remainingDays > 0) {
    parts.push(`${remainingDays} day${remainingDays === 1 ? "" : "s"}`);
  }

  return parts.join(" ");
}

function App() {
  const [table, setTable] = useState<ParsedTable>({
    headers: [],
    rows: [],
  });
  const [error, setError] = useState("");
  const [countdownRace, setCountdownRace] = useState<UpcomingRace | null>(null);
  const hasSelectedCountdownRace = useRef(false);

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
          table.headers
            .slice(1)
            .filter((header) => isRaceEntry(row[header] ?? ""))
            .length,
        0,
      ),
    [table],
  );

  const upcomingRaces = useMemo(() => {
    const today = new Date();

    return table.headers
      .slice(1)
      .map((header) => upcomingRaceFromHeader(header, today))
      .filter((race): race is UpcomingRace => race !== null)
      .sort((first, second) => first.date.getTime() - second.date.getTime());
  }, [table.headers]);

  const nextRaceId = upcomingRaces[0]?.id;

  useEffect(() => {
    if (hasSelectedCountdownRace.current || upcomingRaces.length === 0) return;

    const lastRaceId = window.localStorage.getItem(countdownStorageKey);
    const lastRaceIndex = upcomingRaces.findIndex(
      (race) => race.id === lastRaceId,
    );
    const nextRace = upcomingRaces[(lastRaceIndex + 1) % upcomingRaces.length];

    setCountdownRace(nextRace);
    window.localStorage.setItem(countdownStorageKey, nextRace.id);
    hasSelectedCountdownRace.current = true;
  }, [upcomingRaces]);

  function showNextCountdownRace() {
    if (upcomingRaces.length === 0) return;

    const currentRaceIndex = upcomingRaces.findIndex(
      (race) => race.id === countdownRace?.id,
    );
    const nextRace =
      upcomingRaces[(currentRaceIndex + 1) % upcomingRaces.length];

    setCountdownRace(nextRace);
    window.localStorage.setItem(countdownStorageKey, nextRace.id);
  }

  return (
    <main className="page-shell">
      <section className="hero">
        <div>
          <p className="eyebrow">~\o/</p>
          <h1>Lt14 Race Calendar</h1>
          <p className="subtitle">
            One shared view of who is racing where
          </p>
        </div>

        <div className="stats" aria-label="calendar summary">
          <div className="stat">
            <span>{table.rows.length}</span>
            <small>runners</small>
          </div>
          <div className="stat">
            <span>{raceCount}</span>
            <small>races</small>
          </div>
          <div className="stat">
            <span>{participationCount}</span>
            <small>entries</small>
          </div>
          <button
            className="stat countdown"
            type="button"
            onClick={showNextCountdownRace}
            aria-label="Show the next race countdown"
            title="Show the next race countdown"
          >
            <span>
              {countdownRace ? fuzzyCountdown(countdownRace.date, new Date()) : "—"}
            </span>
            <small>
              {countdownRace ? `to ${countdownRace.name}` : "no upcoming races"}
            </small>
          </button>
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
                    const participantCount = table.rows.filter((row) =>
                      isRaceEntry(row[header] ?? ""),
                    ).length;

                    return (
                      <th
                        key={header}
                        className={[
                          index === 0 ? "person-column" : "",
                          header === nextRaceId ? "next-race-column" : "",
                        ]
                          .filter(Boolean)
                          .join(" ")}
                      >
                        <span className="race-title">
                          {index === 0 ? "Runners" : title}
                        </span>
                        {date && <span className="race-date">{date}</span>}
                        {index > 0 && (
                          <span className="race-participants">
                            {participantCount} runners
                          </span>
                        )}
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
                      const isEntry = isRaceEntry(value);

                      return (
                        <td
                          key={header}
                          className={[
                            colIndex === 0 ? "person-column" : "",
                            header === nextRaceId ? "next-race-column" : "",
                          ]
                            .filter(Boolean)
                            .join(" ")}
                        >
                          {colIndex === 0 ? (
                            <strong>{value}</strong>
                          ) : isEntry ? (
                            <span
                              className={`distance-badge ${distanceBadgeClass(value)}`}
                              aria-label={`${row.Person}: ${value}`}
                              title={`${row.Person}: ${value}`}
                            >
                              {value}
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
        <p>
          Last updated: {" "}
          <time dateTime={raceDataLastUpdated}>
            {new Intl.DateTimeFormat("en-GB", {
              day: "numeric",
              month: "short",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
              timeZone: "Asia/Jakarta",
              timeZoneName: "short",
            }).format(new Date(raceDataLastUpdated))}
          </time>
        </p>
        from <a href="https://x.com/ialexs/status/2090229530229342363">https://x.com/ialexs/status/2090229530229342363</a>
      </footer>
    </main>
  );
}

export default App;
