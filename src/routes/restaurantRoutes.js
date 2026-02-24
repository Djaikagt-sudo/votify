import express from "express";
import path from "path";
import QRCode from "qrcode";

import { createRestaurant, restaurants } from "../data/store.js";

const router = express.Router();

router.post("/", async (req, res) => {
  try {
    const { name } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: "name requerido" });
    }

    const restaurant = createRestaurant(name.trim());

    // URL base (sirve para LAN / producción también)
    const baseUrl = `${req.protocol}://${req.get("host")}`;

    // URL del QR para comensales
    const url = `${baseUrl}/r/${restaurant.id}`;
    const qrDir = path.join("public", "qrcodes");
    const qrPath = path.join(qrDir, `${restaurant.id}.png`);

    await QRCode.toFile(qrPath, url);

    res.json({
      ...restaurant,
      url,
      qr: `/qrcodes/${restaurant.id}.png`,
      tvUrl: `${baseUrl}/tv/${restaurant.id}`,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error creando restaurante" });
  }
});

router.get("/", (req, res) => {
  res.json(restaurants);
});

export default router;