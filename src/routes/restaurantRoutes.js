import express from "express";
import QRCode from "qrcode";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

import { createRestaurant, getRestaurants } from "../data/store.js";

const router = express.Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

router.get("/", (req, res) => {
  res.json({ ok: true, restaurants: getRestaurants() });
});

router.post("/", async (req, res) => {
  const { name, genres } = req.body || {};

  const restaurant = createRestaurant({
    name,
    genres: Array.isArray(genres) ? genres : []
  });

  const proto = (req.headers["x-forwarded-proto"] || req.protocol || "http").toString();
  const host = req.get("host");
  const url = `${proto}://${host}/r/${restaurant.id}`;

  const qrDir = path.join(__dirname, "../../public/qrcodes");
  if (!fs.existsSync(qrDir)) fs.mkdirSync(qrDir, { recursive: true });

  const qrFile = path.join(qrDir, `${restaurant.id}.png`);
  await QRCode.toFile(qrFile, url);

  res.json({
    ok: true,
    ...restaurant,
    url,
    qrUrl: `/qrcodes/${restaurant.id}.png`
  });
});

export default router;