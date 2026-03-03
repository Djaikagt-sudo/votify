import "dotenv/config";

import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import http from "http";
import crypto from "crypto";
import { Server } from "socket.io";

import restaurantRoutes from "./routes/restaurantRoutes.js";
import restaurantPagesRoutes from "./routes/restaurantPagesRoutes.js";
import restaurantApiRoutes from "./routes/restaurantApiRoutes.js";

import { moveSongToBottomAfterPlayed } from "./data/store.js";

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3000;

// ====== __dirname fix (ES modules) ======
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// =====================================================
// 🔥 MIDDLEWARES
// =====================================================
app.use(express.json());
app.set("trust proxy", true);

// =====================================================
// ✅ ARCHIVOS ESTÁTICOS (SOLO UNA VEZ)
// =====================================================
app.use(express.static(path.join(__dirname, "../public"), { index: false }));
app.use("/qrcodes", express.static(path.join(__dirname, "../public/qrcodes")));

// =====================================================
// 🏠 LANDING PAGE (HOME)
// =====================================================
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "../public/landing.html"));
});
// =====================================================
// ✅ ADMIN USERS
// =====================================================
const ADMIN_USERS = [
  { email: "djaika.gt@gmail.com", password: "2212" },
  { email: "pruebas@gmail.com", password: "1234" },
];

const ADMIN_SECRET = process.env.ADMIN_SECRET || "dev_secret_change_me";
const sessions = new Map();
const SESSION_MS = 1000 * 60 * 60 * 12; // 12 horas

// =====================================================
// 🔐 AUTH HELPERS
// =====================================================
function parseCookies(req) {
  const header = req.headers.cookie || "";
  const out = {};
  header.split(";").forEach((part) => {
    const [k, ...v] = part.trim().split("=");
    if (!k) return;
    out[k] = decodeURIComponent(v.join("=") || "");
  });
  return out;
}

function signToken(token) {
  const h = crypto.createHmac("sha256", ADMIN_SECRET).update(token).digest("hex");
  return `${token}.${h}`;
}

function verifySignedToken(signed) {
  if (!signed) return null;
  const idx = signed.lastIndexOf(".");
  if (idx < 0) return null;

  const token = signed.slice(0, idx);
  const sig = signed.slice(idx + 1);

  const expected = crypto.createHmac("sha256", ADMIN_SECRET).update(token).digest("hex");

  try {
    if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) {
      return null;
    }
  } catch {
    return null;
  }

  return token;
}

function setAuthCookie(res, signedToken) {
  const isProd = process.env.NODE_ENV === "production";
  res.setHeader("Set-Cookie", [
    `votify_admin=${encodeURIComponent(signedToken)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${Math.floor(
      SESSION_MS / 1000
    )}${isProd ? "; Secure" : ""}`,
  ]);
}

function clearAuthCookie(res) {
  const isProd = process.env.NODE_ENV === "production";
  res.setHeader("Set-Cookie", [
    `votify_admin=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${isProd ? "; Secure" : ""}`,
  ]);
}

function isAuthed(req) {
  const cookies = parseCookies(req);
  const token = verifySignedToken(cookies.votify_admin);
  if (!token) return false;

  const sess = sessions.get(token);
  if (!sess) return false;
  if (Date.now() > sess.expiresAt) {
    sessions.delete(token);
    return false;
  }
  return true;
}

function requireAdmin(req, res, next) {
  if (isAuthed(req)) return next();
  if (req.path.startsWith("/api/")) {
    return res.status(401).json({ ok: false, error: "No autorizado" });
  }
  return res.redirect("/login.html");
}

// =====================================================
// 🔥 SOCKET.IO
// =====================================================
const io = new Server(server, {
  cors: { origin: true, credentials: true },
  transports: ["websocket", "polling"],
  pingInterval: 25000,
  pingTimeout: 60000,
});

io.on("connection", (socket) => {
  console.log("📡 Cliente conectado:", socket.id);

  socket.on("room:join", ({ room }) => {
    if (!room) return;
    socket.join(room);
  });

  socket.on("song:start", ({ room, songId, startedAt, durationSec }) => {
    if (!room) return;
    io.to(room).emit("song:update", { room, songId, startedAt, durationSec });
  });

  socket.on("song:ended", ({ room, songId }) => {
    if (!room || !songId) return;

    const restaurant = moveSongToBottomAfterPlayed(room, songId);
    if (!restaurant) return;

    io.to(room).emit("votes:update", { room, songs: restaurant.songs });
  });

  socket.on("disconnect", () => {
    console.log("🔴 Cliente desconectado:", socket.id);
  });
});

app.set("io", io);

// =====================================================
// 🏠 LANDING PAGE (HOME) — SIEMPRE /
// =====================================================
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "../public/landing.html"));
});

// =====================================================
// 🔐 LOGIN API
// =====================================================
app.post("/api/admin/login", (req, res) => {
  const { email, password } = req.body || {};
  const e = String(email || "").toLowerCase().trim();
  const p = String(password || "");

  const user = ADMIN_USERS.find((u) => u.email.toLowerCase() === e);
  if (!user) return res.status(401).json({ ok: false });

  try {
    if (!crypto.timingSafeEqual(Buffer.from(p), Buffer.from(String(user.password)))) {
      return res.status(401).json({ ok: false });
    }
  } catch {
    return res.status(401).json({ ok: false });
  }

  const token = crypto.randomBytes(24).toString("hex");
  sessions.set(token, {
    createdAt: Date.now(),
    expiresAt: Date.now() + SESSION_MS,
    email: e,
  });

  setAuthCookie(res, signToken(token));
  return res.json({ ok: true });
});

app.post("/api/admin/logout", (req, res) => {
  const cookies = parseCookies(req);
  const token = verifySignedToken(cookies.votify_admin);
  if (token) sessions.delete(token);
  clearAuthCookie(res);
  return res.json({ ok: true });
});

// =====================================================
// 🔐 ADMIN PAGE PROTECTION
// =====================================================
app.get("/admin", requireAdmin, (req, res) => {
  res.sendFile(path.join(__dirname, "../public/admin.html"));
});

app.get("/admin.html", requireAdmin, (req, res) => {
  res.sendFile(path.join(__dirname, "../public/admin.html"));
});

// =====================================================
// 📄 PAGES & API
// =====================================================
// ✅ OJO: sin "/" aquí. Así no se pelea con app.get("/") de la landing.
app.use(restaurantPagesRoutes);

app.use("/api/restaurants", requireAdmin, restaurantRoutes);
app.use("/api/r", restaurantApiRoutes);

// =====================================================
// ❤️ HEALTH CHECK
// =====================================================
app.get("/health", (req, res) => {
  res.json({ ok: true });
});

// =====================================================
// 🚀 START SERVER
// =====================================================
server.listen(PORT, "0.0.0.0", () => {
  console.log("🔥 Servidor corriendo en puerto", PORT);
});