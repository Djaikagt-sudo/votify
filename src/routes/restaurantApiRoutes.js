import express from "express";
import { getRestaurant, voteSong } from "../data/store.js";

const router = express.Router();

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

router.post("/:room/vote/:songId", (req, res) => {
  const { room, songId } = req.params;

  const deviceId =
    req.headers["x-device-id"] ||
    req.body?.deviceId ||
    req.body?.device ||
    "";

  const voterName = String(req.body?.name || "").trim().slice(0, 24);

  const out = voteSong(room, songId, deviceId);

  if(!out.ok){
    return res.status(out.code || 400).json({ ok:false, error: out.error || "No se pudo votar" });
  }

  const io = req.app.get("io");
  if(io){
    // ✅ actualiza lista de votos como siempre
    io.to(room).emit("votes:update", { room, songs: out.restaurant.songs });

    // ✅ toast para TV: "Juan votó por Gasolina"
    const song = out.restaurant.songs.find(s => String(s.id) === String(songId));
    const safeName = voterName || "Alguien";
    const title = song?.title || "una canción";
    const artist = song?.artist || "";
    io.to(room).emit("vote:toast", {
      room,
      name: safeName,
      songTitle: title,
      songArtist: artist
    });
  }

  return res.json({ ok:true, songs: out.restaurant.songs });
});

export default router;