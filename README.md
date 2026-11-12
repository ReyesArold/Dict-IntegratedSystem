# DICT Abra — Integrated PMIS, Training & Trip Tracker System

A fully offline-first web application for the **Department of Information and
Communications Technology (DICT) — Abra Provincial Office**. It brings project
monitoring, capacity-building records, trainee rosters, official field travel
tracking, analytics, and report exports into one local workstation application.

All records are stored on the device using **IndexedDB**. There is no backend,
no API, no account system, and no transmission of project, trainee, or trip data
over the internet.

## Features

### Provincial Dashboard

- Live KPIs for projects, active/completed projects, trainings, and trainees.
- Project status distribution and portfolio allocation chart.
- Training delivery snapshot with Gender and Development (GAD) reach.
- Upcoming and ongoing field trips with destination and departure details.
- Recent activity feed sourced from the local audit log.

### Project Monitoring

- Register projects across DICT Abra categories, including Free Wi-Fi for All,
  Tech4ED, GovNet, PNPI, Capacity Building, and LGU Systems Assistance.
- Capture municipality, target dates, budget, focal person, status, progress,
  and implementation remarks.
- Search, filter by status/category, sort columns, and identify overdue targets.
- Validated create, edit, and delete flows with local activity logging.

### Training Management

- Schedule training sessions with dates, duration, venues, trainers, and status.
- Manage a participant roster per session, including gender, sector, email, and
  contact details.
- Update attendance and certification status inline.
- View GAD and sector summaries for every session.

### Trip Tracker

- Log official field travel with departure and return schedules, destination,
  purpose, assigned driver, vehicle/unit, passenger manifest, and remarks.
- Track scheduled, in-transit, completed, and cancelled trips with live KPIs,
  search, status/date filters, and departure sorting.
- View a detailed trip record and generate an **Official Travel Order / Trip
  Ticket** for a single trip.
- Export the currently filtered register as a **Trip Masterlist PDF** or an
  **Excel workbook** with trip and passenger manifest sheets.
- Surface upcoming and ongoing trips on the provincial dashboard.

### Reports & Analytics

- Portfolio allocation, average progress, training reach, and GAD analytics.
- Export **Project Monitoring Register**, **Training Masterlist**, and
  **Trainee Attendance & Certification** reports.
- Both **PDF** and **Excel** formats are generated entirely in the browser.
- Every export includes the official DICT Abra document header, agency details,
  report title, generated date and time, and page numbering.

### Backup, Restore & Offline Use

- Download a complete JSON backup of projects, trainings, trainees, trips,
  activities, and metadata.
- Validate and restore a backup into a fresh database from Settings or the
  header backup manager.
- Load realistic DICT Abra demonstration data at any time.
- Clear all local records when preparing a new workstation.
- Installable PWA with a service worker that caches the app shell for offline
  use, including full page reloads.

## Technology Stack

| Layer | Technology |
| --- | --- |
| UI | React 19 + TypeScript |
| Build | Vite 8 |
| Styling | Tailwind CSS 4 |
| Icons | Lucide React |
| Routing | React Router 7 (`HashRouter`) |
| Local database | Dexie 4 + `dexie-react-hooks` |
| PDF export | jsPDF + jsPDF AutoTable |
| Excel export | SheetJS (`xlsx`) |
| Offline / PWA | `vite-plugin-pwa` + Workbox |

## Getting Started

### Requirements

- Node.js 20.19+ or 22.12+
- npm
- A modern browser with IndexedDB and service worker support

### Install and run

```bash
npm install
npm run dev
```

Open the local URL printed by Vite. On first launch, the application seeds a
realistic DICT Abra demo dataset automatically.

### Quality checks

```bash
npm run lint
npm run build
```

### Test the offline PWA

The service worker is intentionally disabled during development. To test the
full offline experience, use a production build:

```bash
npm run build
npm run preview
```

Then open the preview URL, wait for the service worker to activate, and reload
once. The application remains available after the browser goes offline.

On a real deployment, serve the `dist` directory over HTTPS (or `localhost`) so
the service worker and install prompt can work.

## Data Storage

The local database is named `dict-abra-integrated-system` and contains six
object stores:

| Store | Purpose |
| --- | --- |
| `projects` | Project register and monitoring data |
| `trainings` | Training sessions and schedules |
| `participants` | Trainee rosters linked to trainings |
| `trips` | Field travel register and passenger manifests |
| `activities` | Local audit trail for the dashboard feed |
| `meta` | Installation, seed, restore, and reset metadata |

Deleting browser site data may erase the database. Download a JSON backup
regularly and keep it on a secure external drive. Restoring a backup replaces
all current local records.

## Report Exports

Reports are generated client-side and downloaded directly to the browser's
Downloads folder.

- **Project Register**: project name, municipality, category, status, progress,
  budget, target dates, focal person, remarks, and last update.
- **Training Masterlist**: session schedule, duration, venue, trainer, status,
  and gender-disaggregated participation.
- **Trainee Attendance**: consolidated roster or a single training session, with
  attendance and certification status.
- **Trip Ticket**: a single-trip Official Travel Order / Trip Ticket with travel
  details, passenger manifest, remarks, and signature blocks.
- **Trip Masterlist**: the filtered trip register with status summaries and a
  top-destination metric.
- **Trip Register**: the filtered trip register plus passenger manifest sheets
  in Excel.

Excel workbooks include formatted agency headers and summary rows. PDFs use a
branded A4 layout with repeating table headers and page footers.

## Project Structure

```text
src/
  components/
    dashboard/       Dashboard cards, charts, activity feed
    layout/          Header, sidebar, application shell
    projects/        Project form dialog
    trainings/       Training and participant form dialogs
    trips/           Trip form and details dialogs
    ui/              Buttons, modals, badges, fields, toasts
  db/                Dexie schema, demo seeding, activity helpers
  hooks/             Online status and shared hooks
  pages/             Dashboard, projects, trainings, trips, reports, settings
  types/             Domain types and DICT Abra reference lists
  utils/             PDF/Excel exports, backup logic, formatters
public/              PWA icons and favicon
```

## Network Deployment (Shared Local System)

The app runs as a centralized local server so every device on the same Wi-Fi/LAN shares one SQLite database.

- **Fixed host IP:** `192.168.1.235`
- **Backend (Express + SQLite):** `http://192.168.1.235:5000` (database file `server/dict_abra_permanent.db`)
- **Frontend (Vite):** `http://192.168.1.235:5173`

### Run manually
```bash
npm run server          # start the shared backend
npm run dev             # start the frontend
```

### Run in the background (PM2-managed Express backend)
```bash
npm run pm2:start           # start the Express + SQLite backend via PM2
npm run pm2:save            # persist the PM2 process list
```

### Auto-start on boot (Windows)
Run once as Administrator:
```powershell
powershell -ExecutionPolicy Bypass -File scripts\register-autostart.ps1
```
This creates a scheduled task (`DICTAbraAutoStart`) that starts the backend via PM2 and the frontend in the background whenever the host PC powers on.

### Desktop packaging (Tauri `.exe`)
```bash
npm run tauri:build          # builds the frontend and generates the Windows NSIS .exe installer
```
The desktop build serves the compiled frontend and points the API client at the local backend via `VITE_API_BASE` (see `.env.production`), so the packaged app talks to `http://192.168.1.235:5000`.

## Privacy & Operational Notes

- The application never sends records to an external service.
- Network status is informational only; all workflows function offline.
- This installation is the system of record for its workstation. Use JSON
  backups for safekeeping, turnover, or migration.
- Use a current Chromium-based browser (Chrome or Edge) for the best PWA
  install and offline experience. Avoid private/incognito mode for permanent
  record keeping.

---

Department of Information and Communications Technology  
Abra Provincial Office · Cordillera Administrative Region
