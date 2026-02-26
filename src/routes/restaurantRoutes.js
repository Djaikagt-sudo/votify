import express from "express";
import crypto from "crypto";
import QRCode from "qrcode";
import { createRestaurant } from "../data/store.js";
import { library } from "../data/library.js";

const router = express.Router();

router.post("/", async (req, res) => {
  try {
    const { name, genres } = req.body;

    if (!name || !Array.isArray(genres) || genres.length === 0) {
      return res.status(400).json({ ok: false, error: "Nombre y géneros requeridos" });
    }

    let songs = [];
    for (const g of genres) {
      if (library[g]) songs = songs.concat(library[g]);
    }

    if (songs.length === 0) {
      return res.status(400).json({ ok: false, error: "No hay canciones en esos géneros" });
    }

    const id = crypto.randomUUID();

    const restaurant = createRestaurant({ id, name, songs });

    // ✅ Base URL “real”
    // En producción: PUBLIC_BASE_URL=https://votify.tudominio.com
    const baseUrl =
      process.env.PUBLIC_BASE_URL ||
      `${req.protocol}://${req.get("host")}`;

    const votePath = `/r/${id}`;
    const tvPath = `/tv/${id}`;
    const apiStatePath = `/api/r/${id}/state`;

    const voteFull = `${baseUrl}${votePath}`;
    const tvFull = `${baseUrl}${tvPath}`;

    // ✅ QR como DataURL (estable en hostings sin disco persistente)
    const qrDataUrl = await QRCode.toDataURL(voteFull, {
      errorCorrectionLevel: "M",
      margin: 2,
      scale: 8,
    });

    return res.json({
      ok: true,
      restaurant: {
        id: restaurant.id,
        name: restaurant.name,
        urls: {
          vote: votePath,
          tv: tvPath,
          apiState: apiStatePath,
        },
        urlsFull: {
          vote: voteFull,
          tv: tvFull,
        },
        qrDataUrl,
      },
    });
  } catch (err) {
    console.error("ERROR creando restaurante:", err);
    res.status(500).json({ ok: false, error: "Error creando restaurante" });
  }
});

export default router;