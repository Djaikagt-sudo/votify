import express from "express";
import crypto from "crypto";
import QRCode from "qrcode";
import { createRestaurant } from "../data/store.js";
import { library } from "../data/library.js";

const router = express.Router();

function getPublicBaseUrl(req) {
  // Render / proxies: usar forwarded headers primero
  const proto = (req.headers["x-forwarded-proto"] || req.protocol || "http")
    .split(",")[0]
    .trim();

  const host = (req.headers["x-forwarded-host"] || req.headers.host || req.get("host"))
    .split(",")[0]
    .trim();

  return `${proto}://${host}`;
}

router.post("/", async (req, res) => {
  try {
    const { name, genres } = req.body;

    if (!name || !Array.isArray(genres) || genres.length === 0) {
      return res
        .status(400)
        .json({ ok: false, error: "Nombre y géneros requeridos" });
    }

    let songs = [];
    for (const g of genres) {
      if (library[g]) songs = songs.concat(library[g]);
    }

    if (songs.length === 0) {
      return res
        .status(400)
        .json({ ok: false, error: "No hay canciones en esos géneros" });
    }

    const id = crypto.randomUUID();
    const restaurant = createRestaurant({ id, name, songs });

    // ✅ Base URL real detrás de proxy (Render)
    const baseUrl = getPublicBaseUrl(req);

    const votePath = `/r/${id}`;
    const tvPath = `/tv/${id}`;
    const apiStatePath = `/api/r/${id}/state`;

    const voteFull = `${baseUrl}${votePath}`;
    const tvFull = `${baseUrl}${tvPath}`;

    // ✅ QR como DataURL (sin depender de disco)
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
    return res.status(500).json({ ok: false, error: "Error creando restaurante" });
  }
});

export default router;