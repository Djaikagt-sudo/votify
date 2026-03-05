import express from "express";
import path from "path";
import fs from "fs";
import QRCode from "qrcode";
import { fileURLToPath } from "url";

import { getRestaurant, createRestaurant, deleteRestaurant } from "../data/store.js";
import { library } from "../data/library.js";

const router = express.Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ✅ DEMO: crea sala automática SIN corridos + crea el PNG QR + abre la TV
router.get("/demo", async (req, res) => {
  try {
    // todos los géneros menos "corridos" (y cualquier key que tenga "corrido")
    const demoGenres = Object.keys(library).filter((g) => !/corrido/i.test(g));

    const restaurant = createRestaurant({
      name: "Votify Demo",
      genres: demoGenres,
      totalSongs: 40,
    });

    // URL para el QR (igual que admin)
    const proto = (req.headers["x-forwarded-proto"] || req.protocol || "http").toString();
    const host = req.get("host");
    const url = `${proto}://${host}/r/${restaurant.id}`;

    // Generar PNG en /public/qrcodes
    const qrDir = path.join(__dirname, "../../public/qrcodes");
    if (!fs.existsSync(qrDir)) fs.mkdirSync(qrDir, { recursive: true });

    const qrFile = path.join(qrDir, `${restaurant.id}.png`);
    await QRCode.toFile(qrFile, url);

    // ✅ (opcional) expirar demo en 20 min (no afecta tu app normal)
    setTimeout(() => {
      try {
        deleteRestaurant(restaurant.id);
        const f = path.join(qrDir, `${restaurant.id}.png`);
        if (fs.existsSync(f)) fs.unlinkSync(f);
      } catch (_) {}
    }, 20 * 60 * 1000);

    // Abrir directo TV (TV ya muestra el QR usando /qrcodes/<id>.png)
    return res.redirect(`/tv/${restaurant.id}`);
  } catch (e) {
    return res.status(500).send("Error creando demo");
  }
});

router.get("/r/:room", (req, res) => {
  const { room } = req.params;
  const restaurant = getRestaurant(room);

  if (!restaurant) {
    return res.status(404).send("Restaurante no existe");
  }

  return res.sendFile(path.join(__dirname, "../../public/index.html"));
});

router.get("/tv/:room", (req, res) => {
  const { room } = req.params;
  const restaurant = getRestaurant(room);

  if (!restaurant) {
    return res.status(404).send("Restaurante no existe");
  }

  return res.sendFile(path.join(__dirname, "../../public/tv.html"));
});

router.get("/votar", (req, res) => {
  return res.sendFile(path.join(__dirname, "../../public/index.html"));
});

router.get("/login", (req, res) => {
  return res.sendFile(path.join(__dirname, "../../public/login.html"));
});

export default router;