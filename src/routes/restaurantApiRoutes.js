import express from "express";
import { getRestaurant, voteSong } from "../data/store.js";

const router = express.Router();

// Estado de la sala (cliente y TV lo consumen)
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
    // ✅ QR dinámico (no archivo)
    qrUrl: `/qr/${restaurant.id}.png`,
  });
});

// Votar por canción
router.post("/:room/vote/:songId", (req, res) => {
  const { room, songId } = req.params;

  // si ya estás mandando deviceId desde el frontend, lo tomamos del body o header
  const deviceId =
    (req.body && req.body.deviceId) ||
    req.headers["x-device-id"] ||
    req.query.deviceId;

  const result = voteSong(room, songId, deviceId);

  if (!result || result.ok === false) {
    const code = result?.code || 400;
    return res.status(code).json({ ok: false, error: result?.error || "Error" });
  }

  return res.json({ ok: true, songs: result.restaurant.songs });
});

export default router;