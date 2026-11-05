# LT14 Race Calendar

A static, data-first race calendar for a running group. Runners, events, dates, and distances are maintained in one CSV file; the browser turns that file into the published calendar. The live site is [lt14-racecalendar.pages.dev](https://lt14-racecalendar.pages.dev/).

## Design and approach

This app avoids a database, login, and admin dashboard on purpose. A CSV is easy to edit in a spreadsheet, review in Git, and deploy with a normal commit. It is the single source of truth; every visible count and badge is derived from it.

The application adds the interpretation that makes the data useful:

- Summary totals for runners, races, and registrations.
- A runner total directly below each race date.
- Color-coded distance badges instead of generic participation checks.
- A touch-friendly rotating countdown for upcoming events.
- Responsive table behavior and social-media preview metadata.

## Stack

| Area | Technology | Role |
| --- | --- | --- |
| UI | React 19 | Renders the calendar from parsed data. |
| Language | TypeScript | Type checking. |
| Build/dev server | Vite 6 | Development and static production build. |
| CSV parsing | Papa Parse | Downloads and parses `public/races.csv`. |
| Styling | CSS | Responsive layout, sticky columns, and badges. |
| Hosting | Cloudflare Pages | Serves the built static site. |

## Project structure

```text
index.html                         HTML shell plus SEO/share metadata
public/races.csv                   Calendar source data
public/member-race-calendar-share.png  1200 × 630 share image
src/main.tsx                       React bootstrap
src/App.tsx                        Parsing, calculations, and UI
src/styles.css                     Visual design and responsive rules
```

## CSV data contract

Edit [`public/races.csv`](public/races.csv). The first column must remain `Person`; every later column represents one race.

```csv
"Person","Amartha/6Sep","Garmin/20Sep","JRF/25Oct"
"Amal","10k","",""
"Ardhis","","21k","10k"
"Diny","5k","",""
```

### Race columns

Use `Race name/DDMon` or `Race name/DDMonYYYY` for every race header, for example `Amartha/6Sep`, `Garmin/20Sep`, or `Jakim/12Jun2027`.

The slash separates the race name and date. The UI renders these as separate lines (`Amartha`, then `6 Sep`) and the date drives the countdown. Days may contain one or two digits and the month can be an English month abbreviation or longer name.

The year is optional. Dates without a year use the current year; an explicit year is used as written. For example, `Jakim/12Jun2027` displays `Jakim` above `12 Jun 2027` and counts down to June 12, 2027. Past races remain in the table but are excluded from the countdown and upcoming-race highlighting; they do not automatically roll into next year.

```csv
"Person","BayRun/8Nov","Jakim/12Jun2027"
"Amal","","10k"
"Ardhis","21k",""
```

### Runner entries and distances

Every row after the header is a runner. A non-empty cell means they are entered in that event. Its value is the displayed distance.

| Cell value | Badge |
| --- | --- |
| `5k` | Green `5K` |
| `10k` | Blue `10K` |
| `21k` | Orange `21K` |
| Other non-empty value | Purple fallback badge preserving the text |

Capitalization and spaces do not affect the color: `10K`, `10k`, and `10 k` are all blue. An empty cell displays `—` and is not counted. Quote fields containing commas; spreadsheet exports normally handle this automatically.

## Parsing and calculations

On load, `App.tsx` asks Papa Parse to fetch the public asset:

```ts
Papa.parse<RaceRow>("/races.csv", {
  download: true,
  header: true,
  skipEmptyLines: true,
});
```

`header: true` makes each row an object keyed by its CSV headers. Papa Parse also returns the ordered header list, preserving the race-column order for the table.

All summaries are calculated rather than stored:

| Display | Calculation |
| --- | --- |
| Runners | Number of CSV data rows. |
| Races | Headers minus the `Person` column. |
| Entries | Every non-empty race cell. |
| Race total | Non-empty cells in that race column. |

An unavailable or unreadable CSV displays its parse/download error in the calendar card.

## Upcoming-race countdown

Valid race dates are converted to dates, sorted, and shown one at a time in the fourth summary card. It expresses time fuzzily: `today`, `3 days`, `2 weeks`, or `1 month 3 days`.

Only races dated today or later are included, including races with an explicit future year. Once every race has passed, the card shows `—` and `no upcoming races`.

The countdown card is a button. Tapping it advances to the next already-parsed upcoming race in memory, so it does not reload the page or fetch the CSV again. The selected race is remembered in local storage under `lt14-race-calendar-last-countdown-race`; after the final event it loops back to the first. The sequence is local to each browser/device and remains selected after a later real page refresh. Clear site storage to reset it.

## Interface behavior

The header row and runner-name column are sticky. On narrow screens, the hero stacks vertically and the table scrolls horizontally, preserving readable race columns. Badge values have descriptive accessibility labels and tooltip titles.

## Last updated timestamp

The footer displays the modification timestamp of `public/races.csv` in the
Asia/Jakarta time zone. A Vite plugin reads the file timestamp during the build
and embeds it in the page's JavaScript. During local development, editing the
CSV reloads the page and refreshes the timestamp.

On a static deployment the timestamp reflects the CSV file on the build
machine. Git does not preserve file modification times, so a fresh checkout
(such as a Cloudflare Pages build) can show the checkout time rather than the
original local edit time. Rebuild and redeploy after updating the CSV.

## Social sharing

`index.html` defines the page title, one standard description, canonical URL, Open Graph tags, and Twitter Card tags. Keep exactly one `<meta name="description">` tag so search engines and social-preview systems receive an unambiguous page description. The social image is:

```text
https://lt14-racecalendar.pages.dev/member-race-calendar-share.png
```

It is 1200 × 630 pixels for landscape social previews. Facebook, X, WhatsApp, and similar platforms cache previews, so changes may require a platform debugger/cache refresh. If the production domain changes, replace every `https://lt14-racecalendar.pages.dev/` reference in `index.html`, including canonical, `og:url`, `og:image`, and `twitter:image`.

## Development

Prerequisites: Node.js 20+ (Node 22 LTS is recommended) and npm.

```bash
npm install
npm run dev
```

Vite normally serves `http://localhost:5173/`. To expose it to the same Wi-Fi/LAN:

```bash
npm run dev -- --host 0.0.0.0
```

Open the Network URL Vite prints, such as `http://192.168.1.25:5173/`. Allow TCP port `5173` in the host firewall if necessary.

Create and inspect a production build with:

```bash
npm run build
npm run preview
```

The build runs TypeScript checking first, then emits the deployable static site into `dist/`.

## Cloudflare Pages

| Setting | Value |
| --- | --- |
| Framework preset | React (Vite), or None if unavailable |
| Production branch | `main` |
| Build command | `npm run build` |
| Build output directory | `dist` |
| Root directory | Empty (repository root) |

Cloudflare publishes `dist/`; Vite automatically copies assets from `public/`, including the CSV and social image.

## Updating the calendar

1. Edit `public/races.csv`.
2. Keep `Person` first and use `Race name/DDMon` or `Race name/DDMonYYYY` headers.
3. Enter the appropriate distance in each participating runner's cell.
4. Run `npm run build` when possible.
5. Commit and push to `main`; Cloudflare Pages deploys the update.

## Current limitations and future work

The CSV supports optional explicit years but has no location, registration link, or race status. There is no in-browser editor, and the countdown changes only on reload/tap, not continuously. Potential next steps are a distance legend, registration links, per-distance race totals, and runner filtering.
