import express from "express";
import cors from "cors";
import morgan from "morgan";
import fs from "fs";

const app = express();
const PORT = process.env.PORT || 10000;

// Load JSON once at boot (restart to refresh file)
const raw = fs.readFileSync("./F1_Drivers.json", "utf-8");
const db = JSON.parse(raw);

// Simple helpers
const drivers = db.drivers || [];
const bySlug = new Map(drivers.map(d => [d.slug, d]));

// Middleware
app.use(morgan("tiny"));
app.use(cors({ origin: "*", methods: ["GET"] }));
app.use((req, res, next) => {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "public, max-age=300, s-maxage=300"); // 5 min
  next();
});

// Health
app.get("/", (req, res) => {
  res.send(JSON.stringify({
    ok: true,
    name: "f1-api",
    season: db.season,
    endpoints: ["/api/drivers", "/api/drivers/:slug", "/api/standings"]
  }));
});

// All drivers (full objects)
app.get("/api/drivers", (req, res) => {
  // Optional query filters (?team=...&minPoints=...)
  const { team, minPoints, maxPoints } = req.query;
  let list = drivers;

  if (team) list = list.filter(d => d.teamKey === String(team).toLowerCase());
  if (minPoints != null) list = list.filter(d => d.points >= Number(minPoints));
  if (maxPoints != null) list = list.filter(d => d.points <= Number(maxPoints));

  res.send(JSON.stringify(list));
});

// One driver by slug
app.get("/api/drivers/:slug", (req, res) => {
  const slug = String(req.params.slug).toLowerCase();
  const d = bySlug.get(slug);
  if (!d) {
    res.status(404).send(JSON.stringify({ error: "Driver not found", slug }));
    return;
  }
  res.send(JSON.stringify(d));
});

// Compact standings (great for table views)
app.get("/api/standings", (req, res) => {
  const table = drivers
    .slice()
    .sort((a, b) => a.pos - b.pos)
    .map(({ pos, driver, slug, nationality, team, teamKey, points }) => ({
      pos, driver, slug, nationality, team, teamKey, points
    }));
  res.send(JSON.stringify({ season: db.season, standings: table }));
});

// 404 fallback
app.use((req, res) => {
  res.status(404).send(JSON.stringify({ error: "Not found" }));
});

app.listen(PORT, () => {
  console.log(`F1 API listening on :${PORT}`);
});
