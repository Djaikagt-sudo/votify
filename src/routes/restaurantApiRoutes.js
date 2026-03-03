import express from "express";
import { getRestaurant, voteSong } from "../data/store.js";

const router = express.Router();

router.get("/:room/state", (req, res) => {
  const { room } = req.params;
  const restaurant = getRestaurant(room);

  if (!restaurant) {
    return res.status(404).json({ ok: false, error: "Restaurante no existe" });
  }

  return res.json({
    ok: true,
    id: restaurant.id,
    name: restaurant.name,
    genres: restaurant.genres,
    songs: restaurant.songs,
    qrUrl: `/qrcodes/${restaurant.id}.png`,
  });
});

router.post("/:room/vote/:songId", (req, res) => {
  const { room, songId } = req.params;

  // ✅ por si tu store usa ids numéricos
  const parsedSongId = Number.isNaN(Number(songId)) ? songId : Number(songId);

  const restaurant = voteSong(room, parsedSongId);

  if (!restaurant) {
    return res.status(404).json({ ok: false, error: "Restaurante no existe" });
  }

  // ✅ CLAVE: emitir actualización a todos en esa sala
  const io = req.app.get("io");
  if (io) {
    io.to(room).emit("votes:update", {
      room,
      songs: restaurant.songs,
    });
  }

  return res.json({ ok: true, songs: restaurant.songs });
});

export default router;