import express from "express";
import { broadcastQueue } from "../server.js";
const router = express.Router();

import { songs } from "./songs.js";

router.post("/:id", (req, res) => {
  const songId = parseInt(req.params.id);

  const song = songs.find(s => s.id === songId);

  if (!song) {
    return res.status(404).json({ error: "Canción no encontrada" });
  }

  song.votes += 1;

broadcastQueue();
  res.json({
    message: "Voto agregado",
    song,
  });
});

export default router;