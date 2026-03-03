import express from "express";
import { getRestaurant, voteSong } from "../data/store.js";

const router = express.Router();

/**
 * GET /api/r/:room/state
 */
router.get("/:room/state", (req, res) => {
  const { room } = req.params;
  const restaurant = getRestaurant(room);

  if(!restaurant){
    return res.status(404).json({ ok:false, error:"Restaurante no existe" });
  }

  return res.json({
    ok: true,
    id: restaurant.id,
    name: restaurant.name,
    genres: restaurant.genres,
    songs: restaurant.songs,
    qrUrl: `/qrcodes/${restaurant.id}.png`
  });
});

/**
 * POST /api/r/:room/vote/:songId
 */
router.post("/:room/vote/:songId", (req, res) => {
  const { room, songId } = req.params;

  const restaurant = voteSong(room, songId);
  if(!restaurant){
    return res.status(404).json({ ok:false, error:"Restaurante no existe" });
  }

  return res.json({ ok:true, songs: restaurant.songs });
});

export default router;