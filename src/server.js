import "dotenv/config";

import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import http from "http";
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

// ===== CORS ORIGIN (para Socket.IO) =====
// En producción define: CORS_ORIGIN=https://votify.tudominio.com
// Puedes poner varios separados por coma:
// CORS_ORIGIN=https://votify.tudominio.com,https://www.votify.tudominio.com
const allowedOrigins = (process.env.CORS_ORIGIN || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

// Si no defines CORS_ORIGIN, permite todos (útil en local), pero en producción DEBES definirlo.
const io = new Server(server, {
  cors: {
    origin: allowedOrigins.length ? allowedOrigins : true,
    methods: ["GET", "POST"],
    credentials: true,
  },
});

// ===== SOCKET.IO =====
io.on("connection", (socket) => {
  console.log("📡 Cliente conectado:", socket.id);

  socket.on("room:join", ({ room }) => {
    if (!room) return;
    socket.join(room);
    console.log(`🟢 Cliente unido a sala ${room}`);
  });

  // ✅ TV -> server: inició canción (para sincronizar clientes)
  socket.on("song:start", ({ room, songId, startedAt, durationSec }) => {
    if (!room) return;
    io.to(room).emit("song:update", {
      room,
      songId,
      startedAt,
      durationSec,
    });
  });

  // ✅ TV -> server: terminó canción (mover abajo + votos 0)
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

// para usar io en rutas
app.set("io", io);

// ===== ESTÁTICOS =====
app.use(express.static(path.join(__dirname, "../public")));

// (Opcional) seguir sirviendo qrcodes si algún día decides guardarlos en archivos.
// Si tu hosting no tiene disco persistente, esto NO es confiable a largo plazo.
app.use("/qrcodes", express.static(path.join(__dirname, "../public/qrcodes")));

// ✅ Admin corto
app.get("/admin", (req, res) => {
  res.sendFile(path.join(__dirname, "../public/admin.html"));
});

// ===== PÁGINAS =====
app.use("/", restaurantPagesRoutes);

// ===== API =====
app.use("/api/restaurants", restaurantRoutes);
app.use("/api/r", restaurantApiRoutes);

// ===== HEALTH =====
app.get("/health", (req, res) => res.json({ ok: true }));

server.listen(PORT, "0.0.0.0", () => {
  console.log("🔥 Servidor corriendo en puerto", PORT);
});