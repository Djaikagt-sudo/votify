import express from "express";
import { getRestaurantById } from "../data/store.js";

const router = express.Router();

// helper: ordenar cola disponible
function getAvailableQueue(restaurant) {
  const now = Date.now();
  return restaurant.songs
    .filter((s) => !s.blockedUntil || s.blockedUntil < now)
    .sort((a, b) => {
      if (b.votes === a.votes) {
        // desempate: el que menos reciente fue
        return (a.lastPlayed || 0) - (b.lastPlayed || 0);
      }
      return b.votes - a.votes;
    });
}

// middleware: validar restaurante
router.use("/:rid", (req, res, next) => {
  const r = getRestaurantById(req.params.rid);
  if (!r) return res.status(404).json({ error: "Restaurante no encontrado" });
  req.restaurant = r;
  next();
});

// VER COLA
router.get("/:rid/songs/queue", (req, res) => {
  res.json(getAvailableQueue(req.restaurant));
});

// VOTAR
router.post("/:rid/songs/:songId/vote", (req, res) => {
  const songId = parseInt(req.params.songId);
  const r = req.restaurant;

  const song = r.songs.find((s) => s.id === songId);
  if (!song) return res.status(404).json({ error: "Canción no encontrada" });

  const now = Date.now();
  if (song.blockedUntil && song.blockedUntil > now) {
    return res.json({ success: false, message: "Canción bloqueada ⏳" });
  }

  song.votes += 1;
  res.json({ success: true, song });
});

// SIGUIENTE CANCIÓN (DJ AI)
router.get("/:rid/songs/next", (req, res) => {
  const r = req.restaurant;
  const now = Date.now();

  const available = r.songs.filter((s) => !s.blockedUntil || s.blockedUntil < now);
  if (available.length === 0) return res.json(null);

  const votedSongs = available.filter((s) => s.votes > 0);

  let nextSong;
  if (votedSongs.length > 0) {
    votedSongs.sort((a, b) => b.votes - a.votes);
    nextSong = votedSongs[0];
  } else {
    nextSong = available[Math.floor(Math.random() * available.length)];
  }

  // bloquear 45 minutos
  nextSong.blockedUntil = now + 45 * 60 * 1000;
  nextSong.lastPlayed = now;
  nextSong.votes = 0;

  res.json(nextSong);
});

// CURRENT (GET)
router.get("/:rid/current", (req, res) => {
  res.json(req.restaurant.current);
});

// CURRENT (POST) cuando inicia canción en TV
router.post("/:rid/current", (req, res) => {
  const r = req.restaurant;
  const { song, duration } = req.body;

  if (!song || !duration) {
    return res.status(400).json({ error: "song y duration requeridos" });
  }

  // Guardar estado actual
  r.current.currentSong = song;
  r.current.songStartTime = Date.now();
  r.current.songDuration = duration;

  // por seguridad: si viene una canción que existe, actualiza lastPlayed
  const realSong = r.songs.find((s) => s.id === song.id);
  if (realSong) {
    realSong.lastPlayed = Date.now();
    realSong.votes = 0;
  }

  res.json({ success: true });
});

export default router;