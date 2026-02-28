import express from "express";
import { getRestaurant } from "../data/store.js";

const router = express.Router();

/**
 * GET estado sala
 */
router.get("/:room/state", (req, res) => {
  const { room } = req.params;
  const restaurant = getRestaurant(room);

  if (!restaurant) {
    return res.status(404).json({ ok: false, error: "Restaurante no existe" });
  }

  res.json({
    ok: true,
    room,
    name: restaurant.name,
    songs: restaurant.songs,
    current: restaurant.current,
  });
});

/**
 * POST voto
 */
router.post("/:room/vote/:songId", (req, res) => {
  const { room, songId } = req.params;
  const restaurant = getRestaurant(room);

  if (!restaurant) {
    return res.status(404).json({ ok: false, error: "Restaurante no existe" });
  }

  const song = restaurant.songs.find((s) => s.id === Number(songId));

  if (!song) {
    return res.status(404).json({ ok: false, error: "Canción no encontrada" });
  }

  const voteCooldownMs = 45 * 60 * 1000;
  const now = Date.now();

  if (song.lastPlayedAt && now - song.lastPlayedAt < voteCooldownMs) {
    return res.status(400).json({
      ok: false,
      error: "Esta canción está bloqueada por 45 min después de sonar.",
    });
  }

  song.votes += 1;

  // Socket broadcast
  const io = req.app.get("io");
  io.to(room).emit("votes:update", {
    room,
    songs: restaurant.songs,
  });

  res.json({ ok: true, song });
});

export default router;