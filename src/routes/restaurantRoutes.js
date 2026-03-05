import express from "express";
import QRCode from "qrcode";
import { createRestaurant, getRestaurants } from "../data/store.js";

const router = express.Router();

router.get("/", async (req, res) => {
  const restaurants = await getRestaurants();
  res.json({ ok: true, restaurants });
});

router.post("/", async (req, res) => {
  const { name, genres, totalSongs } = req.body || {};

  const restaurant = await createRestaurant({
    name,
    genres: Array.isArray(genres) ? genres : [],
    totalSongs: Number(totalSongs) || 40,
  });

  // ✅ si quedó vacío, avisar bien (y evitar sala inútil)
  if (!restaurant.songs || restaurant.songs.length === 0) {
    return res.status(400).json({
      ok: false,
      error:
        "No se cargaron canciones. Revisa que los géneros seleccionados coincidan con las llaves de tu library.js",
    });
  }

  const proto = (req.headers["x-forwarded-proto"] || req.protocol || "http").toString();
  const host = req.get("host");
  const voteUrl = `${proto}://${host}/r/${restaurant.id}`;

  // ✅ Render: NO guardes PNG en disco. Enviar como dataURL.
  const qrDataUrl = await QRCode.toDataURL(voteUrl, { margin: 1, scale: 8 });

  res.json({
    ok: true,
    ...restaurant,
    url: voteUrl,
    qrDataUrl
  });
});

export default router;