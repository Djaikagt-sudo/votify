import express from "express";
import path from "path";
import { fileURLToPath } from "url";

import { getRestaurant, createRestaurant, deleteRestaurant } from "../data/store.js";
import { library } from "../data/library.js";

const router = express.Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function buildDemoGenres() {
  // excluye cualquier género que contenga "corrido" (corridos, corridos tumbados, etc)
  return Object.keys(library).filter((g) => !/corrido/i.test(g));
}

// ✅ DEMO automático (20 min)
router.get("/demo", (req, res) => {
  const demoGenres = buildDemoGenres();

  const restaurant = createRestaurant({
    name: "Votify Demo",
    genres: demoGenres,
    totalSongs: 40,
  });

  setTimeout(() => {
    deleteRestaurant(restaurant.id);
  }, 20 * 60 * 1000);

  return res.redirect(`/tv/${restaurant.id}`);
});

// Landing (si tu landing es index.html cámbialo aquí)
router.get("/", (req, res) => {
  return res.sendFile(path.join(__dirname, "../../public/landing.html"));
});

// Cliente votación
router.get("/r/:room", (req, res) => {
  const { room } = req.params;
  const restaurant = getRestaurant(room);

  if (!restaurant) return res.status(404).send("Restaurante no existe");

  return res.sendFile(path.join(__dirname, "../../public/index.html"));
});

// Pantalla TV
router.get("/tv/:room", (req, res) => {
  const { room } = req.params;
  const restaurant = getRestaurant(room);

  if (!restaurant) return res.status(404).send("Restaurante no existe");

  return res.sendFile(path.join(__dirname, "../../public/tv.html"));
});

// Login (si lo usas)
router.get("/login", (req, res) => {
  return res.sendFile(path.join(__dirname, "../../public/login.html"));
});

export default router;