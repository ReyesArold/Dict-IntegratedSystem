// Local shared backend for DICT Abra Integrated System.
// Runs on the host machine and serves all connected devices on the LAN.
import express from 'express'
import cors from 'cors'
import Database from 'better-sqlite3'
import path from 'node:path'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const PORT = process.env.PORT ? Number(process.env.PORT) : 5000
const HOST = process.env.HOST || '192.168.1.235'

// Permanent, absolute on-disk location for the SQLite database. Using __dirname
// (the server/ folder) guarantees the file is never resolved against a
// transient working directory (e.g. C:\\Windows\\System32 when launched by a
// scheduled task), so data survives reboots and is shared by every client.
const DB_PATH = path.join(__dirname, 'dict_abra_permanent.db')

// Migrate any pre-existing legacy database (dict_abra.db at the project root)
// into the new permanent location so previously saved records are preserved.
const LEGACY_DB_PATH = path.join(__dirname, '..', 'dict_abra.db')
if (!fs.existsSync(DB_PATH) && fs.existsSync(LEGACY_DB_PATH)) {
  try {
    fs.copyFileSync(LEGACY_DB_PATH, DB_PATH)
    for (const suffix of ['-wal', '-shm']) {
      const src = LEGACY_DB_PATH + suffix
      const dst = DB_PATH + suffix
      if (fs.existsSync(src)) fs.copyFileSync(src, dst)
    }
    console.log(`Migrated legacy database ${LEGACY_DB_PATH} -> ${DB_PATH}`)
  } catch (err) {
    console.error('Legacy database migration failed:', err)
  }
}

// Make sure the target directory exists before opening the database.
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true })

const app = express()
app.use(cors())
app.use(express.json({ limit: '50mb' }))

const db = new Database(DB_PATH, { verbose: console.log })

// Enable WAL for robust multi-user concurrency over the LAN.
db.pragma('journal_mode = WAL')
// Wait for locks instead of failing immediately on concurrent writes.
db.pragma('busy_timeout = 5000')
// FULL guarantees every committed write is synced to the physical database file.
db.pragma('synchronous = FULL')
db.pragma('foreign_keys = OFF')

// ---------- Schema ----------
db.exec(`
  CREATE TABLE IF NOT EXISTS projects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    municipality TEXT NOT NULL,
    category TEXT NOT NULL,
    targetStartDate TEXT,
    targetCompletionDate TEXT,
    budget REAL NOT NULL DEFAULT 0,
    leader TEXT NOT NULL,
    status TEXT NOT NULL,
    progress INTEGER NOT NULL DEFAULT 0,
    remarks TEXT,
    createdAt TEXT NOT NULL,
    updatedAt TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS trainings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    date TEXT,
    durationHours REAL NOT NULL DEFAULT 0,
    venue TEXT NOT NULL,
    trainer TEXT NOT NULL,
    status TEXT NOT NULL,
    createdAt TEXT NOT NULL,
    updatedAt TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS participants (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    trainingId INTEGER NOT NULL,
    fullName TEXT NOT NULL,
    gender TEXT NOT NULL,
    sector TEXT NOT NULL,
    email TEXT,
    contactNumber TEXT,
    attendanceStatus TEXT NOT NULL,
    createdAt TEXT NOT NULL,
    updatedAt TEXT NOT NULL,
    FOREIGN KEY (trainingId) REFERENCES trainings(id) ON DELETE CASCADE
  );
  CREATE TABLE IF NOT EXISTS trips (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tripTitle TEXT NOT NULL,
    destination TEXT NOT NULL,
    departureDate TEXT,
    returnDate TEXT,
    driverName TEXT NOT NULL,
    passengers TEXT,
    purpose TEXT,
    vehicleDetails TEXT,
    status TEXT NOT NULL,
    remarks TEXT,
    createdAt TEXT NOT NULL,
    updatedAt TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS schedules (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    category TEXT NOT NULL,
    startDate TEXT NOT NULL,
    endDate TEXT NOT NULL,
    location TEXT,
    focalPerson TEXT,
    description TEXT,
    status TEXT NOT NULL,
    createdAt TEXT NOT NULL,
    updatedAt TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS activities (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    entityType TEXT NOT NULL,
    entityId TEXT,
    action TEXT NOT NULL,
    description TEXT NOT NULL,
    occurredAt TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS meta (
    key TEXT PRIMARY KEY,
    value TEXT
  );
`)

// ---------- Helpers ----------
const now = () => new Date().toISOString()
const parsePassengers = (value) => {
  if (Array.isArray(value)) return value
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value)
      if (Array.isArray(parsed)) return parsed
    } catch {}
    return value
      .split(/[\n,;]+/)
      .map((item) => item.trim())
      .filter(Boolean)
  }
  return []
}

// ---------- Seed ----------
function seedIfEmpty() {
  const projectCount = db.prepare('SELECT COUNT(*) AS c FROM projects').get().c
  if (projectCount > 0) return

  const insertProject = db.prepare(`
    INSERT INTO projects (name, municipality, category, targetStartDate, targetCompletionDate, budget, leader, status, progress, remarks, createdAt, updatedAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)
  const insertTraining = db.prepare(`
    INSERT INTO trainings (title, date, durationHours, venue, trainer, status, createdAt, updatedAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `)
  const insertParticipant = db.prepare(`
    INSERT INTO participants (trainingId, fullName, gender, sector, email, contactNumber, attendanceStatus, createdAt, updatedAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)
  const insertTrip = db.prepare(`
    INSERT INTO trips (tripTitle, destination, departureDate, returnDate, driverName, passengers, purpose, vehicleDetails, status, remarks, createdAt, updatedAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)
  const insertSchedule = db.prepare(`
    INSERT INTO schedules (title, category, startDate, endDate, location, focalPerson, description, status, createdAt, updatedAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)
  const insertActivity = db.prepare(`
    INSERT INTO activities (entityType, entityId, action, description, occurredAt)
    VALUES (?, ?, ?, ?, ?)
  `)

  const tx = db.transaction(() => {
    const projects = [
      ['Free Wi-Fi for All — Bangued Public Market', 'Bangued', 'Free Wi-Fi for All', '2026-07-14', '2026-12-20', 1850000, 'Engr. Maria Elena Valera', 'In Progress', 68, 'Fiber termination at the market annex is awaiting clearance.'],
      ['Tech4ED Center — Dolores Community Hub', 'Dolores', 'Tech4ED / Digital Transformation Centers', '2026-02-04', '2026-09-26', 950000, 'Mark Anthony Bautista', 'Completed', 100, 'Turned over to the LGU.'],
      ['GovNet Expansion — Lagangilang Municipal Hall', 'Lagangilang', 'GovNet', '2026-08-28', '2026-12-03', 2300000, 'Engr. Rafael B. Dominguez', 'In Progress', 45, 'Router configuration pending.'],
      ['PNPI — Bucay Community e-Center', 'Bucay', 'PNPI', '2026-04-14', '2026-11-17', 1200000, 'Ma. Cristina S. Alvarado', 'On Hold', 35, 'On hold pending right-of-way.'],
      ['LGU Data Privacy Bootcamp — Cohort 2', 'Bangued', 'Capacity Building', '2026-09-12', '2026-10-28', 320000, 'Atty. Leo M. Rivera', 'Completed', 100, 'All 34 participants certified.'],
      ['LGU Systems Assistance — Bangued e-BOSS Rollout', 'Bangued', 'LGU Systems Assistance', '2026-06-03', '2026-12-09', 780000, 'Jayson P. Bermudez', 'In Progress', 78, 'Business permit module in UAT.'],
      ['Free Wi-Fi for All — ASIST Main Campus', 'Lagangilang', 'Free Wi-Fi for All', '2026-07-02', '2026-11-19', 1450000, 'Engr. Maria Elena Valera', 'In Progress', 82, '12 access points installed.'],
      ['Tech4ED Center — Tayum Digital Hub', 'Tayum', 'Tech4ED / Digital Transformation Centers', '2026-11-03', '2027-03-13', 900000, 'Mark Anthony Bautista', 'Planned', 5, 'Awaiting site endorsement.'],
      ['GovNet — Abra Provincial Hospital Link', 'Bangued', 'GovNet', '2026-11-16', '2027-05-25', 1650000, 'Engr. Rafael B. Dominguez', 'Planned', 0, 'Site survey targeted next month.'],
      ['PNPI — Luba Connectivity Project', 'Luba', 'PNPI', '2026-06-23', '2026-11-23', 1100000, 'Ma. Cristina S. Alvarado', 'In Progress', 55, 'Solar backup units delivered.'],
      ['Women in ICT: Digital Skills Fellowship', 'Bangued', 'Capacity Building', '2026-03-25', '2026-07-26', 280000, 'Atty. Leo M. Rivera', 'Completed', 100, '38 women completed fellowship.'],
      ['Tech4ED Center — Pidigan', 'Pidigan', 'Tech4ED / Digital Transformation Centers', '2026-09-12', '2026-12-27', 875000, 'Jayson P. Bermudez', 'On Hold', 25, 'Awaiting MOA.'],
    ]
    for (const p of projects) {
      insertProject.run(p[0], p[1], p[2], p[3], p[4], p[5], p[6], p[7], p[8], p[9], now(), now())
    }

    const trainings = [
      ['Cybersecurity Awareness for LGU Employees', '2026-10-14', 8, 'Bangued Municipal Training Hall', 'Engr. Jose Mari Flores', 'Completed'],
      ['Digital Marketing for MSMEs', '2026-09-09', 6, 'DICT Abra Provincial Office, Bangued', 'Ms. Ana Liza Ramos', 'Completed'],
      ['Python Coding Fundamentals for Senior High School', '2026-11-10', 16, 'ASIST Bangued Campus', 'Mr. Paul Christian Dizon', 'Ongoing'],
      ['Basic Computer Literacy for Senior Citizens', '2026-11-21', 4, 'Bangued Senior Citizens Center', 'Ms. Kim Audrey S. Padilla', 'Upcoming'],
      ['Data Privacy Act Orientation for LGU Focal Persons', '2026-12-02', 3, 'Dolores Municipal Session Hall', 'Atty. Leo M. Rivera', 'Upcoming'],
      ["Tech4ED Center Managers' Upskilling Workshop", '2026-08-26', 8, 'DICT Abra Training Room, Bangued', 'Mark Anthony Bautista', 'Completed'],
      ['Graphic Design for Youth Entrepreneurs', '2026-11-15', 8, 'Abra Youth Innovation Hub, Bangued', 'Mr. Gabriel S. de Vera', 'Cancelled'],
      ['Digital Literacy for Barangay Officials', '2026-08-07', 6, 'Lagangilang Municipal Gymnasium', 'Ms. Kim Audrey S. Padilla', 'Completed'],
    ]
    for (const t of trainings) {
      insertTraining.run(t[0], t[1], t[2], t[3], t[4], t[5], now(), now())
    }

    const participants = [
      [1, 'Maria Teresa Agustin', 'Female', 'LGU Employee', 'maria.agustin@bangued.gov.ph', '+63 917 555 0101', 'Attended'],
      [1, 'Roberto Corpuz', 'Male', 'LGU Employee', 'r.corpuz@bangued.gov.ph', '+63 917 555 0102', 'Completed / Certified'],
      [2, 'Angela Marie Buenafe', 'Female', 'MSME', 'angela@abraweaves.ph', '+63 918 555 0201', 'Completed / Certified'],
      [3, 'Althea Bautista', 'Female', 'Student', 'althea.bautista@student.asist.edu.ph', '+63 919 555 0301', 'Attended'],
      [4, 'Remedios Flores', 'Female', 'Senior Citizen', 'remedios.flores@gmail.com', '+63 920 555 0401', 'Enrolled'],
      [5, 'Faith Mendoza', 'Female', 'LGU Employee', 'faith.mendoza@dolores.gov.ph', '+63 921 555 0501', 'Enrolled'],
    ]
    for (const p of participants) {
      insertParticipant.run(p[0], p[1], p[2], p[3], p[4], p[5], p[6], now(), now())
    }

    const trips = [
      ['Free Wi-Fi Site Inspection — Tubo LGU', 'Tubo', '2026-10-06T05:30:00', '2026-10-06T17:15:00', 'Rolando B. Bautista (Office Driver)', JSON.stringify(['Engr. Maria Elena Valera', 'Jayson P. Bermudez']), 'Conduct technical site inspection of proposed Free Wi-Fi access point locations.', 'DICT Abra Service Pick-up — Plate No. CAG 4821', 'Completed', 'Site inspection completed.'],
      ['Tech4ED Turnover — Dolores Community Hub', 'Dolores', '2026-10-14T06:00:00', '2026-10-14T16:30:00', 'Edwin P. Marquez (Designated Driver)', JSON.stringify(['Mark Anthony Bautista', 'Ma. Cristina S. Alvarado']), 'Facilitate official turnover of the Tech4ED Center.', 'DICT Abra Hi-Ace Van — Plate No. CAE 7319', 'Completed', 'Turnover documents signed.'],
      ['GovNet Bandwidth Testing — Lagangilang', 'Lagangilang', '2026-10-21T07:00:00', '2026-10-21T18:00:00', 'Rolando B. Bautista (Office Driver)', JSON.stringify(['Engr. Rafael B. Dominguez']), 'Perform bandwidth testing for GovNet expansion.', 'DICT Abra Service Pick-up — Plate No. CAG 4821', 'Completed', '92 Mbps recorded.'],
      ['PNPI Solar Backup Monitoring — Luba', 'Luba', '2026-11-11T06:00:00', '2026-11-11T18:00:00', 'Rolando B. Bautista (Office Driver)', JSON.stringify(['Ma. Cristina S. Alvarado', 'Jayson P. Bermudez']), 'Monitor solar backup installation.', 'DICT Abra Service Pick-up — Plate No. CAG 4821', 'In Transit', 'Field team departed.'],
      ['Community Needs Assessment — Boliney', 'Boliney', '2026-11-12T05:00:00', '2026-11-12T18:00:00', 'Edwin P. Marquez (Designated Driver)', JSON.stringify(['Jayson P. Bermudez', 'Faith Mendoza']), 'Conduct community ICT needs assessment.', 'DICT Abra Hi-Ace Van — Plate No. CAE 7319', 'Scheduled', 'Coordinate with municipal planning offices.'],
    ]
    for (const t of trips) {
      insertTrip.run(t[0], t[1], t[2], t[3], t[4], t[5], t[6], t[7], t[8], t[9], now(), now())
    }

    const schedules = [
      ['Provincial ICT Coordinators Meeting', 'Meetings', '2026-11-13T09:00', '2026-11-13T12:00', 'DICT Abra Provincial Office, Bangued', 'Engr. Rafael B. Dominguez', 'Quarterly coordination meeting.', 'Approved'],
      ['Cybersecurity Awareness Refresher', 'Training & Seminar', '2026-11-16T08:30', '2026-11-16T17:00', 'Bangued Municipal Training Hall', 'Engr. Jose Mari Flores', 'Refresher on phishing and password hygiene.', 'Scheduled'],
      ['Free Wi-Fi Site Inspection — Tubo', 'Official Travel / Trips', '2026-11-18T06:00', '2026-11-18T17:30', 'Tubo, Abra', 'Engr. Maria Elena Valera', 'Technical site inspection.', 'Approved'],
      ['Stakeholder Consultation — Tech4ED Tayum', 'Stakeholder Consultation', '2026-11-21T10:00', '2026-11-21T12:30', 'Tayum Municipal Hall', 'Mark Anthony Bautista', 'Consultation on Tech4ED site.', 'Pending'],
      ['Project Implementation Review — Bangued e-BOSS', 'Project Implementation', '2026-11-23T14:00', '2026-11-23T16:00', 'DICT Abra Provincial Office, Bangued', 'Jayson P. Bermudez', 'Review of UAT progress.', 'Scheduled'],
    ]
    for (const s of schedules) {
      insertSchedule.run(s[0], s[1], s[2], s[3], s[4], s[5], s[6], s[7], now(), now())
    }

    const activities = [
      ['trip', null, 'departed', 'Field team departed for Luba to monitor PNPI solar backup installation.', '2026-11-11T06:00:00'],
      ['project', '7', 'updated', 'Free Wi-Fi for All — ASIST Main Campus progress updated to 82%.', '2026-11-10T14:00:00'],
      ['training', '3', 'updated', 'Python Coding Fundamentals is now ongoing.', '2026-11-10T09:00:00'],
      ['project', '1', 'updated', 'Free Wi-Fi for All — Bangued Public Market progress updated to 68%.', '2026-11-08T10:00:00'],
    ]
    for (const a of activities) {
      insertActivity.run(a[0], a[1], a[2], a[3], a[4])
    }

    db.prepare("INSERT OR REPLACE INTO meta (key, value) VALUES ('appInitialized', 'true')").run()
    db.prepare("INSERT OR REPLACE INTO meta (key, value) VALUES ('dataSource', 'demo')").run()
    db.prepare("INSERT OR REPLACE INTO meta (key, value) VALUES ('seedVersion', '1')").run()
  })
  tx()
  console.log('DICT Abra seed data inserted.')
}

seedIfEmpty()

// ---------- Route helpers ----------
function rows(table) {
  return db.prepare(`SELECT * FROM ${table}`).all()
}
function row(table, id) {
  return db.prepare(`SELECT * FROM ${table} WHERE id = ?`).get(id)
}

function parsePassengersField(value) {
  if (value == null) return []
  if (Array.isArray(value)) return value
  try {
    const parsed = JSON.parse(value)
    if (Array.isArray(parsed)) return parsed
  } catch {}
  return String(value)
    .split(/[\n,;]+/)
    .map((item) => item.trim())
    .filter(Boolean)
}

function normalizeProject(r) {
  if (!r) return null
  return {
    id: r.id,
    name: r.name,
    municipality: r.municipality,
    category: r.category,
    targetStartDate: r.targetStartDate,
    targetCompletionDate: r.targetCompletionDate,
    budget: r.budget,
    leader: r.leader,
    status: r.status,
    progress: r.progress,
    remarks: r.remarks,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  }
}
function normalizeTraining(r) {
  if (!r) return null
  return {
    id: r.id,
    title: r.title,
    date: r.date,
    durationHours: r.durationHours,
    venue: r.venue,
    trainer: r.trainer,
    status: r.status,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  }
}
function normalizeParticipant(r) {
  if (!r) return null
  return {
    id: r.id,
    trainingId: r.trainingId,
    fullName: r.fullName,
    gender: r.gender,
    sector: r.sector,
    email: r.email,
    contactNumber: r.contactNumber,
    attendanceStatus: r.attendanceStatus,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  }
}
function normalizeTrip(r) {
  if (!r) return null
  return {
    id: r.id,
    tripTitle: r.tripTitle,
    destination: r.destination,
    departureDate: r.departureDate,
    returnDate: r.returnDate,
    driverName: r.driverName,
    passengers: parsePassengersField(r.passengers),
    purpose: r.purpose,
    vehicleDetails: r.vehicleDetails,
    status: r.status,
    remarks: r.remarks,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  }
}
function normalizeSchedule(r) {
  if (!r) return null
  return {
    id: r.id,
    title: r.title,
    category: r.category,
    startDate: r.startDate,
    endDate: r.endDate,
    location: r.location,
    focalPerson: r.focalPerson,
    description: r.description,
    status: r.status,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  }
}
function normalizeActivity(r) {
  if (!r) return null
  return {
    id: r.id,
    entityType: r.entityType,
    entityId: r.entityId,
    action: r.action,
    description: r.description,
    occurredAt: r.occurredAt,
  }
}

// ---------- Projects ----------
app.get('/api/projects', (req, res) => {
  res.json(rows('projects').map(normalizeProject))
})
app.get('/api/projects/:id', (req, res) => {
  const r = row('projects', req.params.id)
  if (!r) return res.status(404).json({ error: 'Not found' })
  res.json(normalizeProject(r))
})
app.post('/api/projects', (req, res) => {
  const b = req.body || {}
  const ts = now()
  const info = db
    .prepare(
      `INSERT INTO projects (name, municipality, category, targetStartDate, targetCompletionDate, budget, leader, status, progress, remarks, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      b.name,
      b.municipality,
      b.category,
      b.targetStartDate || null,
      b.targetCompletionDate || null,
      Number(b.budget) || 0,
      b.leader,
      b.status || 'Planned',
      Number(b.progress) || 0,
      b.remarks || '',
      ts,
      ts,
    )
  res.status(201).json(normalizeProject(row('projects', info.lastInsertRowid)))
})
app.put('/api/projects/:id', (req, res) => {
  const b = req.body || {}
  const existing = row('projects', req.params.id)
  if (!existing) return res.status(404).json({ error: 'Not found' })
  const ts = now()
  db.prepare(
    `UPDATE projects SET name=?, municipality=?, category=?, targetStartDate=?, targetCompletionDate=?, budget=?, leader=?, status=?, progress=?, remarks=?, updatedAt=? WHERE id=?`,
  ).run(
    b.name ?? existing.name,
    b.municipality ?? existing.municipality,
    b.category ?? existing.category,
    b.targetStartDate ?? existing.targetStartDate,
    b.targetCompletionDate ?? existing.targetCompletionDate,
    b.budget != null ? Number(b.budget) : existing.budget,
    b.leader ?? existing.leader,
    b.status ?? existing.status,
    b.progress != null ? Number(b.progress) : existing.progress,
    b.remarks ?? existing.remarks,
    ts,
    req.params.id,
  )
  res.json(normalizeProject(row('projects', req.params.id)))
})
app.delete('/api/projects/:id', (req, res) => {
  db.prepare('DELETE FROM projects WHERE id = ?').run(req.params.id)
  res.status(204).send()
})

// ---------- Trainings ----------
app.get('/api/trainings', (req, res) => {
  res.json(rows('trainings').map(normalizeTraining))
})
app.get('/api/trainings/:id', (req, res) => {
  const r = row('trainings', req.params.id)
  if (!r) return res.status(404).json({ error: 'Not found' })
  res.json(normalizeTraining(r))
})
app.post('/api/trainings', (req, res) => {
  const b = req.body || {}
  const ts = now()
  const info = db
    .prepare(
      `INSERT INTO trainings (title, date, durationHours, venue, trainer, status, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      b.title,
      b.date || null,
      Number(b.durationHours) || 0,
      b.venue,
      b.trainer,
      b.status || 'Upcoming',
      ts,
      ts,
    )
  res.status(201).json(normalizeTraining(row('trainings', info.lastInsertRowid)))
})
app.put('/api/trainings/:id', (req, res) => {
  const b = req.body || {}
  const existing = row('trainings', req.params.id)
  if (!existing) return res.status(404).json({ error: 'Not found' })
  const ts = now()
  db.prepare(
    `UPDATE trainings SET title=?, date=?, durationHours=?, venue=?, trainer=?, status=?, updatedAt=? WHERE id=?`,
  ).run(
    b.title ?? existing.title,
    b.date ?? existing.date,
    b.durationHours != null ? Number(b.durationHours) : existing.durationHours,
    b.venue ?? existing.venue,
    b.trainer ?? existing.trainer,
    b.status ?? existing.status,
    ts,
    req.params.id,
  )
  res.json(normalizeTraining(row('trainings', req.params.id)))
})
app.delete('/api/trainings/:id', (req, res) => {
  db.prepare('DELETE FROM participants WHERE trainingId = ?').run(req.params.id)
  db.prepare('DELETE FROM trainings WHERE id = ?').run(req.params.id)
  res.status(204).send()
})

// ---------- Participants ----------
app.get('/api/participants', (req, res) => {
  const trainingId = req.query.trainingId
  if (trainingId) {
    res.json(
      db
        .prepare('SELECT * FROM participants WHERE trainingId = ?')
        .all(trainingId)
        .map(normalizeParticipant),
    )
  } else {
    res.json(rows('participants').map(normalizeParticipant))
  }
})
app.post('/api/participants', (req, res) => {
  const b = req.body || {}
  const ts = now()
  const info = db
    .prepare(
      `INSERT INTO participants (trainingId, fullName, gender, sector, email, contactNumber, attendanceStatus, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      Number(b.trainingId) || 0,
      b.fullName,
      b.gender,
      b.sector,
      b.email || '',
      b.contactNumber || '',
      b.attendanceStatus || 'Enrolled',
      ts,
      ts,
    )
  res.status(201).json(normalizeParticipant(row('participants', info.lastInsertRowid)))
})
app.put('/api/participants/:id', (req, res) => {
  const b = req.body || {}
  const existing = row('participants', req.params.id)
  if (!existing) return res.status(404).json({ error: 'Not found' })
  const ts = now()
  db.prepare(
    `UPDATE participants SET fullName=?, gender=?, sector=?, email=?, contactNumber=?, attendanceStatus=?, updatedAt=? WHERE id=?`,
  ).run(
    b.fullName ?? existing.fullName,
    b.gender ?? existing.gender,
    b.sector ?? existing.sector,
    b.email ?? existing.email,
    b.contactNumber ?? existing.contactNumber,
    b.attendanceStatus ?? existing.attendanceStatus,
    ts,
    req.params.id,
  )
  res.json(normalizeParticipant(row('participants', req.params.id)))
})
app.delete('/api/participants/:id', (req, res) => {
  db.prepare('DELETE FROM participants WHERE id = ?').run(req.params.id)
  res.status(204).send()
})

// ---------- Trips ----------
app.get('/api/trips', (req, res) => {
  res.json(rows('trips').map(normalizeTrip))
})
app.get('/api/trips/:id', (req, res) => {
  const r = row('trips', req.params.id)
  if (!r) return res.status(404).json({ error: 'Not found' })
  res.json(normalizeTrip(r))
})
app.post('/api/trips', (req, res) => {
  const b = req.body || {}
  const ts = now()
  const info = db
    .prepare(
      `INSERT INTO trips (tripTitle, destination, departureDate, returnDate, driverName, passengers, purpose, vehicleDetails, status, remarks, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      b.tripTitle,
      b.destination,
      b.departureDate || null,
      b.returnDate || null,
      b.driverName,
      JSON.stringify(parsePassengers(b.passengers)),
      b.purpose || '',
      b.vehicleDetails || '',
      b.status || 'Scheduled',
      b.remarks || '',
      ts,
      ts,
    )
  res.status(201).json(normalizeTrip(row('trips', info.lastInsertRowid)))
})
app.put('/api/trips/:id', (req, res) => {
  const b = req.body || {}
  const existing = row('trips', req.params.id)
  if (!existing) return res.status(404).json({ error: 'Not found' })
  const ts = now()
  db.prepare(
    `UPDATE trips SET tripTitle=?, destination=?, departureDate=?, returnDate=?, driverName=?, passengers=?, purpose=?, vehicleDetails=?, status=?, remarks=?, updatedAt=? WHERE id=?`,
  ).run(
    b.tripTitle ?? existing.tripTitle,
    b.destination ?? existing.destination,
    b.departureDate ?? existing.departureDate,
    b.returnDate ?? existing.returnDate,
    b.driverName ?? existing.driverName,
    b.passengers != null ? JSON.stringify(parsePassengers(b.passengers)) : existing.passengers,
    b.purpose ?? existing.purpose,
    b.vehicleDetails ?? existing.vehicleDetails,
    b.status ?? existing.status,
    b.remarks ?? existing.remarks,
    ts,
    req.params.id,
  )
  res.json(normalizeTrip(row('trips', req.params.id)))
})
app.delete('/api/trips/:id', (req, res) => {
  db.prepare('DELETE FROM trips WHERE id = ?').run(req.params.id)
  res.status(204).send()
})

// ---------- Schedules ----------
app.get('/api/schedules', (req, res) => {
  res.json(rows('schedules').map(normalizeSchedule))
})
app.get('/api/schedules/:id', (req, res) => {
  const r = row('schedules', req.params.id)
  if (!r) return res.status(404).json({ error: 'Not found' })
  res.json(normalizeSchedule(r))
})
app.post('/api/schedules', (req, res) => {
  const b = req.body || {}
  const ts = now()
  const info = db
    .prepare(
      `INSERT INTO schedules (title, category, startDate, endDate, location, focalPerson, description, status, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      b.title,
      b.category,
      b.startDate,
      b.endDate,
      b.location || '',
      b.focalPerson || '',
      b.description || '',
      b.status || 'Scheduled',
      ts,
      ts,
    )
  res.status(201).json(normalizeSchedule(row('schedules', info.lastInsertRowid)))
})
app.put('/api/schedules/:id', (req, res) => {
  const b = req.body || {}
  const existing = row('schedules', req.params.id)
  if (!existing) return res.status(404).json({ error: 'Not found' })
  const ts = now()
  db.prepare(
    `UPDATE schedules SET title=?, category=?, startDate=?, endDate=?, location=?, focalPerson=?, description=?, status=?, updatedAt=? WHERE id=?`,
  ).run(
    b.title ?? existing.title,
    b.category ?? existing.category,
    b.startDate ?? existing.startDate,
    b.endDate ?? existing.endDate,
    b.location ?? existing.location,
    b.focalPerson ?? existing.focalPerson,
    b.description ?? existing.description,
    b.status ?? existing.status,
    ts,
    req.params.id,
  )
  res.json(normalizeSchedule(row('schedules', req.params.id)))
})
app.delete('/api/schedules/:id', (req, res) => {
  db.prepare('DELETE FROM schedules WHERE id = ?').run(req.params.id)
  res.status(204).send()
})

// ---------- Activities ----------
app.get('/api/activities', (req, res) => {
  const limit = Number(req.query.limit) || 50
  res.json(
    db
      .prepare('SELECT * FROM activities ORDER BY occurredAt DESC LIMIT ?')
      .all(limit)
      .map(normalizeActivity),
  )
})
app.post('/api/activities', (req, res) => {
  const b = req.body || {}
  const ts = now()
  const info = db
    .prepare(
      `INSERT INTO activities (entityType, entityId, action, description, occurredAt) VALUES (?, ?, ?, ?, ?)`,
    )
    .run(b.entityType, b.entityId || null, b.action || 'updated', b.description, b.occurredAt || ts)
  res.status(201).json(normalizeActivity(row('activities', info.lastInsertRowid)))
})

// ---------- Meta ----------
app.get('/api/meta/:key', (req, res) => {
  const r = db.prepare('SELECT value FROM meta WHERE key = ?').get(req.params.key)
  res.json({ key: req.params.key, value: r ? r.value : null })
})
app.put('/api/meta/:key', (req, res) => {
  db.prepare('INSERT OR REPLACE INTO meta (key, value) VALUES (?, ?)').run(
    req.params.key,
    req.body?.value ?? '',
  )
  res.json({ key: req.params.key, value: req.body?.value ?? '' })
})

// ---------- Backup / Restore / Seed ----------
app.get('/api/backup', (req, res) => {
  res.json({
    app: 'dict-abra-integrated-system',
    version: 1,
    exportedAt: now(),
    data: {
      projects: rows('projects').map(normalizeProject),
      trainings: rows('trainings').map(normalizeTraining),
      participants: rows('participants').map(normalizeParticipant),
      trips: rows('trips').map(normalizeTrip),
      activities: rows('activities').map(normalizeActivity),
      schedules: rows('schedules').map(normalizeSchedule),
      meta: rows('meta').map((r) => ({ key: r.key, value: r.value })),
    },
  })
})

app.post('/api/restore', (req, res) => {
  const payload = req.body
  if (!payload || !payload.data) return res.status(400).json({ error: 'Invalid backup' })
  const d = payload.data
  const tx = db.transaction(() => {
    db.prepare('DELETE FROM projects').run()
    db.prepare('DELETE FROM trainings').run()
    db.prepare('DELETE FROM participants').run()
    db.prepare('DELETE FROM trips').run()
    db.prepare('DELETE FROM activities').run()
    db.prepare('DELETE FROM schedules').run()
    db.prepare('DELETE FROM meta').run()

    for (const p of d.projects || []) {
      db.prepare(
        `INSERT INTO projects (name, municipality, category, targetStartDate, targetCompletionDate, budget, leader, status, progress, remarks, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ).run(
        p.name, p.municipality, p.category, p.targetStartDate || null, p.targetCompletionDate || null,
        Number(p.budget) || 0, p.leader, p.status, Number(p.progress) || 0, p.remarks || '',
        p.createdAt || now(), p.updatedAt || now(),
      )
    }
    for (const t of d.trainings || []) {
      db.prepare(
        `INSERT INTO trainings (title, date, durationHours, venue, trainer, status, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      ).run(t.title, t.date || null, Number(t.durationHours) || 0, t.venue, t.trainer, t.status, t.createdAt || now(), t.updatedAt || now())
    }
    for (const p of d.participants || []) {
      db.prepare(
        `INSERT INTO participants (trainingId, fullName, gender, sector, email, contactNumber, attendanceStatus, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ).run(Number(p.trainingId) || 0, p.fullName, p.gender, p.sector, p.email || '', p.contactNumber || '', p.attendanceStatus, p.createdAt || now(), p.updatedAt || now())
    }
    for (const t of d.trips || []) {
      db.prepare(
        `INSERT INTO trips (tripTitle, destination, departureDate, returnDate, driverName, passengers, purpose, vehicleDetails, status, remarks, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ).run(t.tripTitle, t.destination, t.departureDate || null, t.returnDate || null, t.driverName, JSON.stringify(parsePassengers(t.passengers)), t.purpose || '', t.vehicleDetails || '', t.status, t.remarks || '', t.createdAt || now(), t.updatedAt || now())
    }
    for (const s of d.schedules || []) {
      db.prepare(
        `INSERT INTO schedules (title, category, startDate, endDate, location, focalPerson, description, status, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ).run(s.title, s.category, s.startDate, s.endDate, s.location || '', s.focalPerson || '', s.description || '', s.status, s.createdAt || now(), s.updatedAt || now())
    }
    for (const a of d.activities || []) {
      db.prepare(
        `INSERT INTO activities (entityType, entityId, action, description, occurredAt) VALUES (?, ?, ?, ?, ?)`,
      ).run(a.entityType, a.entityId || null, a.action || 'updated', a.description, a.occurredAt || now())
    }
    for (const m of d.meta || []) {
      db.prepare('INSERT OR REPLACE INTO meta (key, value) VALUES (?, ?)').run(m.key, m.value)
    }
    db.prepare("INSERT OR REPLACE INTO meta (key, value) VALUES ('appInitialized', 'true')").run()
  })
  tx()
  res.json({ ok: true })
})

app.post('/api/seed', (req, res) => {
  // Clear and re-seed
  db.transaction(() => {
    db.prepare('DELETE FROM projects').run()
    db.prepare('DELETE FROM trainings').run()
    db.prepare('DELETE FROM participants').run()
    db.prepare('DELETE FROM trips').run()
    db.prepare('DELETE FROM activities').run()
    db.prepare('DELETE FROM schedules').run()
    db.prepare('DELETE FROM meta').run()
  })()
  // Re-run seed by reloading module? Instead, just call seedIfEmpty logic via a flag.
  // We'll re-seed by invoking the seed function again (it checks emptiness, so force).
  // Simpler: re-run seedIfEmpty won't work since not empty guard. Use direct re-seed:
  // Just call the same seed routine by resetting and re-running seedIfEmpty after clearing meta.
  seedIfEmpty()
  res.json({ ok: true })
})

app.post('/api/clear', (req, res) => {
  db.transaction(() => {
    db.prepare('DELETE FROM projects').run()
    db.prepare('DELETE FROM trainings').run()
    db.prepare('DELETE FROM participants').run()
    db.prepare('DELETE FROM trips').run()
    db.prepare('DELETE FROM activities').run()
    db.prepare('DELETE FROM schedules').run()
    db.prepare('DELETE FROM meta').run()
    db.prepare("INSERT OR REPLACE INTO meta (key, value) VALUES ('appInitialized', 'true')").run()
    db.prepare("INSERT OR REPLACE INTO meta (key, value) VALUES ('lastClearedAt', ?)").run(now())
  })()
  res.json({ ok: true })
})

// ---------- Static frontend (production) ----------
const distPath = path.join(__dirname, '..', 'dist')
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath))
  app.get(/.*/, (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'))
  })
}

// Flush WAL to the main database file and close cleanly on exit so that all
// committed writes survive restarts and are not stranded in -wal/-shm files.
function closeDatabase() {
  try {
    db.pragma('wal_checkpoint(TRUNCATE)')
  } catch (err) {
    console.error('WAL checkpoint failed:', err)
  }
  try {
    db.close()
  } catch (err) {
    console.error('Database close failed:', err)
  }
}
process.on('exit', closeDatabase)
process.on('SIGINT', () => {
  closeDatabase()
  process.exit(0)
})
process.on('SIGTERM', () => {
  closeDatabase()
  process.exit(0)
})
process.on('uncaughtException', (err) => {
  console.error('Uncaught exception:', err)
  closeDatabase()
  process.exit(1)
})

app.listen(PORT, HOST, () => {
  console.log(`DICT Abra server listening on http://${HOST}:${PORT}`)
  console.log(`Database: ${DB_PATH}`)
})
