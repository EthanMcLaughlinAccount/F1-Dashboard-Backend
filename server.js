import express from "express";
import cors from "cors";
import morgan from "morgan";
import fs from "fs";
import crypto from "crypto";

const app = express();
const PORT = process.env.PORT || 10000;

// ---------- Safe JSON loader (root-level files) ----------
function loadJSON(file, fallback) {
  try {
    const raw = fs.readFileSync(`./${file}`, "utf-8");
    return JSON.parse(raw);
  } catch (err) {
    console.error(`Failed to load ${file}:`, err.message);
    return fallback;
  }
}

// ---------- Load data (root) ----------
const driversDB       = loadJSON("F1_Drivers.json",   { season: null, drivers: [] });
const constructorsDB  = loadJSON("F1_Teams.json",     { season: null, constructorStandings: [] });
const teamIndexDB     = loadJSON("F1_TeamIndex.json", { teams: [] });

// ---------- Normalizations ----------
const drivers = Array.isArray(driversDB.drivers) ? driversDB.drivers : [];
const byDriverSlug = new Map(drivers.map(d => [String(d.slug || "").toLowerCase(), d]));

const slugify = (name) =>
  String(name || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

const teamsFull = Array.isArray(teamIndexDB.teams) ? teamIndexDB.teams : [];
const teamsWithKey = teamsFull.map(t => ({ ...t, teamKey: slugify(t.name) }));
const byTeamKeyFull = new Map(teamsWithKey.map(t => [t.teamKey, t]));

const constructors = Array.isArray(constructorsDB.constructorStandings)
  ? constructorsDB.constructorStandings
  : [];
const byConstructorKey = new Map(
  constructors.map(c => [String(c.teamKey || "").toLowerCase(), c])
);

// ---------- Helpers ----------
function sendJSON(res, obj) {
  const body = JSON.stringify(obj);
  const etag = crypto.createHash("md5").update(body).digest("hex");

  res.setHeader("ETag", etag);
  if (res.req.headers["if-none-match"] === etag) {
    return res.status(304).end();
  }
  res.status(200).send(body);
}

// ---------- App setup ----------
app.disable("x-powered-by");
app.use(morgan("tiny"));
app.use(cors({ origin: "*", methods: ["GET"] }));
app.use((_, res, next) => {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "public, max-age=300, s-maxage=300");
  next();
});

// ---------- Root / status ----------
app.get("/", (req, res) => {
  sendJSON(res, {
    ok: !!drivers.length,
    name: "f1-api",
    season: driversDB.season || constructorsDB.season || 2025,
    counts: { drivers: drivers.length, constructors: constructors.length, teams: teamsWithKey.length },
    endpoints: [
      "/api/drivers", "/api/drivers/:slug", "/api/standings",
      "/api/constructors", "/api/constructors/:teamKey", "/api/constructors/standings",
      "/api/teams", "/api/teams/:teamKey", "/api/teams/summary"
    ]
  });
});

app.get("/status", (req, res) => {
  sendJSON(res, { ok: true, ts: new Date().toISOString() });
});

// ---------- Drivers ----------
app.get("/api/drivers", (req, res) => {
  let list = drivers.slice();
  const { team, minPoints, maxPoints } = req.query;

  if (team) list = list.filter(d => String(d.teamKey).toLowerCase() === String(team).toLowerCase());
  if (minPoints != null) list = list.filter(d => Number(d.points) >= Number(minPoints));
  if (maxPoints != null) list = list.filter(d => Number(d.points) <= Number(maxPoints));

  sendJSON(res, list);
});

app.get("/api/drivers/:slug", (req, res) => {
  const slug = String(req.params.slug || "").toLowerCase();
  const d = byDriverSlug.get(slug);
  if (!d) return sendJSON(res.status(404), { error: "Driver not found", slug });
  sendJSON(res, d);
});

app.get("/api/standings", (req, res) => {
  const table = drivers
    .slice()
    .sort((a, b) => Number(a.pos) - Number(b.pos))
    .map(({ pos, driver, slug, nationality, team, teamKey, points }) => ({
      pos, driver, slug, nationality, team, teamKey, points
    }));
  sendJSON(res, { season: driversDB.season, standings: table });
});

// ---------- Constructors ----------
app.get("/api/constructors", (req, res) => {
  const { minPoints, maxPoints } = req.query;
  let list = constructors.slice();

  if (minPoints != null) list = list.filter(c => Number(c.points) >= Number(minPoints));
  if (maxPoints != null) list = list.filter(c => Number(c.points) <= Number(maxPoints));

  list.sort((a, b) => Number(a.pos ?? 999) - Number(b.pos ?? 999));

  sendJSON(res, { season: constructorsDB.season, constructors: list });
});

// alias -> /standings
app.get("/api/constructors/standings", (req, res) => {
  res.redirect(307, "/api/constructors");
});

app.get("/api/constructors/:teamKey", (req, res) => {
  const key = String(req.params.teamKey || "").toLowerCase();
  const row = byConstructorKey.get(key);
  if (!row) return sendJSON(res.status(404), { error: "Constructor not found", teamKey: key });
  sendJSON(res, row);
});

// ---------- Teams ----------
app.get("/api/teams", (req, res) => {
  const { q } = req.query;
  let list = teamsWithKey.slice();

  if (q) {
    const needle = String(q).toLowerCase();
    list = list.filter(t =>
      t.teamKey.includes(needle) ||
      String(t.name).toLowerCase().includes(needle)
    );
  }

  sendJSON(res, { season: 2025, teams: list });
});

app.get("/api/teams/:teamKey", (req, res) => {
  const key = String(req.params.teamKey || "").toLowerCase();
  const t = byTeamKeyFull.get(key);
  if (!t) return sendJSON(res.status(404), { error: "Team not found", teamKey: key });
  sendJSON(res, t);
});

app.get("/api/teams/summary", (req, res) => {
  const rows = teamsWithKey.map(t => ({
    teamKey: t.teamKey,
    name: t.name,
    season_position: t["2025_season"]?.season_position ?? null,
    season_points: t["2025_season"]?.season_points ?? null,
  })).sort((a, b) => Number(a.season_position ?? 999) - Number(b.season_position ?? 999));

  sendJSON(res, { season: 2025, teams: rows });
});

// ---------- 404 ----------
app.use((req, res) => {
  sendJSON(res.status(404), { error: "Not found" });
});

// ---------- Start ----------
app.listen(PORT, "0.0.0.0", () => {
  console.log(`F1 API listening on :${PORT}`);
});
