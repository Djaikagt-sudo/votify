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

  const deviceId =
    req.headers["x-device-id"] ||
    req.headers["x-votify-device"] ||
    req.body?.deviceId ||
    "";

  const result = voteSong(room, songId, deviceId);

  if (!result || !result.restaurant) {
    return res.status(404).json({ ok: false, error: "Restaurante no existe" });
  }

  if (result.status !== 200) {
    return res.status(result.status).json({ ok: false, error: result.error || "No se pudo votar" });
  }

  // emitir actualización a todos en esa sala
  const io = req.app.get("io");
  if (io) {
    io.to(room).emit("votes:update", {
      room,
      songs: result.restaurant.songs,
    });
  }

  return res.json({ ok: true, songs: result.restaurant.songs });
});

export default router;