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
    room,
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

  const song = restaurant.songs.find(s => s.id === Number(songId));

  if (!song) {
    return res.status(404).json({ ok: false, error: "Canción no encontrada" });
  }

  const voter = (req.body?.voter || "Alguien").trim();

  song.votes += 1;

  const io = req.app.get("io");

  // Actualizar ranking
  io.to(room).emit("votes:update", {
    room,
    songs: restaurant.songs
  });

  // Notificar quién votó
  io.to(room).emit("vote:notification", {
    room,
    voter,
    songTitle: song.title
  });

  res.json({ ok: true });
});

export default router;