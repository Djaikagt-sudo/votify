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

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ===== MIDDLEWARES =====
app.use(express.json());
app.set("trust proxy", true);

// =====================================================
// ✅ ADMIN USERS (SOLO VOS LOS EDITÁS AQUÍ)
// =====================================================
const ADMIN_USERS = [
  { email: "djaika.gt@gmail.com", password: "2212" },
  { email: "pruebas@gmail.com", password: "1234" },
];

// Secret para firmar cookies/sesión (ponelo en Render)
const ADMIN_SECRET = process.env.ADMIN_SECRET || "dev_secret_change_me";

// sesiones en memoria (se reinician si reinicia el server)
const sessions = new Map(); // token -> { createdAt, expiresAt, email }
const SESSION_MS = 1000 * 60 * 60 * 12; // 12 horas

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
  if (!signed || typeof signed !== "string") return null;
  const idx = signed.lastIndexOf(".");
  if (idx < 0) return null;
  const token = signed.slice(0, idx);
  const sig = signed.slice(idx + 1);
  const expected = crypto.createHmac("sha256", ADMIN_SECRET).update(token).digest("hex");
  try {
    const a = Buffer.from(sig, "utf8");
    const b = Buffer.from(expected, "utf8");
    if (a.length !== b.length) return null;
    if (!crypto.timingSafeEqual(a, b)) return null;
  } catch (_) {
    return null;
  }
  return token;
}

function setAuthCookie(res, signedToken) {
  const isProd = process.env.NODE_ENV === "production";
  res.setHeader("Set-Cookie", [
    `votify_admin=${encodeURIComponent(
      signedToken
    )}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${Math.floor(SESSION_MS / 1000)}${
      isProd ? "; Secure" : ""
    }`,
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
  const signed = cookies.votify_admin;
  const token = verifySignedToken(signed);
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
// Socket.IO
// =====================================================
const allowedOrigins = (process.env.CORS_ORIGIN || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

const io = new Server(server, {
  cors: {
    origin: allowedOrigins.length ? allowedOrigins : true,
    methods: ["GET", "POST"],
    credentials: true,
  },
  transports: ["websocket", "polling"],
  pingInterval: 25000,
  pingTimeout: 60000,
});

io.on("connection", (socket) => {
  console.log("📡 Cliente conectado:", socket.id);

  socket.on("room:join", ({ room }) => {
    if (!room) return;
    socket.join(room);
    console.log(`🟢 Cliente unido a sala ${room}`);
  });

  socket.on("song:start", ({ room, songId, startedAt, durationSec }) => {
    if (!room) return;
    io.to(room).emit("song:update", {
      room,
      songId,
      startedAt,
      durationSec,
    });
  });

  socket.on("song:ended", ({ room, songId }) => {
    if (!room || !songId) return;
    const restaurant = moveSongToBottomAfterPlayed(room, songId);
    if (!restaurant) return;

    io.to(room).emit("votes:update", {
      room,
      songs: restaurant.songs,
    });
  });

  socket.on("disconnect", () => {
    console.log("🔴 Cliente desconectado:", socket.id);
  });
});

app.set("io", io);

// =====================================================
// ✅ LOGIN API (correo + contraseña, solo los de ADMIN_USERS)
// =====================================================
app.post("/api/admin/login", (req, res) => {
  const { email, password } = req.body || {};
  const e = String(email || "").trim().toLowerCase();
  const p = String(password || "");

  if (!e || !p) {
    return res.status(400).json({ ok: false, error: "Email y contraseña requeridos" });
  }

  // buscar usuario (email case-insensitive)
  const user = ADMIN_USERS.find((u) => u.email.toLowerCase() === e);
  if (!user) {
    return res.status(401).json({ ok: false, error: "Credenciales incorrectas" });
  }

  // comparar password de forma segura
  const a = Buffer.from(p, "utf8");
  const b = Buffer.from(String(user.password), "utf8");
  if (a.length !== b.length) {
    return res.status(401).json({ ok: false, error: "Credenciales incorrectas" });
  }
  try {
    if (!crypto.timingSafeEqual(a, b)) {
      return res.status(401).json({ ok: false, error: "Credenciales incorrectas" });
    }
  } catch (_) {
    return res.status(401).json({ ok: false, error: "Credenciales incorrectas" });
  }

  // ok -> sesión
  const token = crypto.randomBytes(24).toString("hex");
  sessions.set(token, { createdAt: Date.now(), expiresAt: Date.now() + SESSION_MS, email: e });

  const signed = signToken(token);
  setAuthCookie(res, signed);

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
// PÁGINAS PROTEGIDAS
// =====================================================
app.get("/admin", requireAdmin, (req, res) => {
  res.sendFile(path.join(__dirname, "../public/admin.html"));
});
app.get("/admin.html", requireAdmin, (req, res) => {
  res.sendFile(path.join(__dirname, "../public/admin.html"));
});

// ===== ESTÁTICOS =====
app.use(express.static(path.join(__dirname, "../public")));
app.use("/qrcodes", express.static(path.join(__dirname, "../public/qrcodes")));

// ===== PÁGINAS =====
app.use("/", restaurantPagesRoutes);

// ===== API =====
app.use("/api/restaurants", requireAdmin, restaurantRoutes);
app.use("/api/r", restaurantApiRoutes);

// ===== HEALTH =====
app.get("/health", (req, res) => res.json({ ok: true }));

server.listen(PORT, "0.0.0.0", () => {
  console.log("🔥 Servidor corriendo en puerto", PORT);
});