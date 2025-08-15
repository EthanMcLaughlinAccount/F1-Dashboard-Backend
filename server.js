import express from "express";
import cors from "cors";
import morgan from "morgan";
import fs from "fs";

const app = express();
const PORT = process.env.PORT || 10000;

// Load JSON safely
let db = { season: null, drivers: [] };
try {
  const raw = fs.readFileSync("./F1_Drivers.json", "utf-8");
  db = JSON.parse(raw);
} catch (err) {
  console.error("Failed to load F1_Drivers.json:", err);
  // continue with empty db to avoid crash; root will show ok:false
}

const drivers = Array.isArray(db.drivers) ? db.drivers : [];
const bySlug = new Map(drivers.map(d => [String(d.slug || "").toLowerCase(), d]));

app.disable("x-powered-by");
app.use(morgan("tiny"));
app.use(cors({ origin: "*", methods: ["GET"] }));
app.use((req, res, next) => {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "public, max-age=300, s-maxage=300");
  next();
});

// Health + metadata
app.get("/", (req, res) => {
  res.status(200).send(JSON.stringify({
    ok: !!drivers.length,
    name: "f1-api",
    season: db.season,
    count: drivers.length,
    endpoints: ["/api/drivers", "/api/drivers/:slug", "/api/standings"]
  }));
});

// Lightweight status (for health check)
app.get("/status", (req, res) => {
  res.status(200).send(JSON.stringify({ ok: true, ts: new Date().toISOString() }));
});

// All drivers
app.get("/api/drivers", (req, res) => {
  let list = drivers.slice();
  const { team, minPoints, maxPoints } = req.query;

  if (team) list = list.filter(d => String(d.teamKey).toLowerCase() === String(team).toLowerCase());
  if (minPoints != null) list = list.filter(d => Number(d.points) >= Number(minPoints));
  if (maxPoints != null) list = list.filter(d => Number(d.points) <= Number(maxPoints));

  res.status(200).send(JSON.stringify(list));
});

// One driver
app.get("/api/drivers/:slug", (req, res) => {
  const slug = String(req.params.slug || "").toLowerCase();
  const d = bySlug.get(slug);
  if (!d) return res.status(404).send(JSON.stringify({ error: "Driver not found", slug }));
  res.status(200).send(JSON.stringify(d));
});

// Standings
app.get("/api/standings", (req, res) => {
  const table = drivers
    .slice()
    .sort((a, b) => Number(a.pos) - Number(b.pos))
    .map(({ pos, driver, slug, nationality, team, teamKey, points }) => ({
      pos, driver, slug, nationality, team, teamKey, points
    }));
  res.status(200).send(JSON.stringify({ season: db.season, standings: table }));
});

// 404
app.use((req, res) => {
  res.status(404).send(JSON.stringify({ error: "Not found" }));
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`F1 API listening on :${PORT}`);
});
