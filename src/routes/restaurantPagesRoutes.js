import express from "express";
import path from "path";
import { fileURLToPath } from "url";

import { getRestaurant, createRestaurant, deleteRestaurant } from "../data/store.js";
import { library } from "../data/library.js";

const router = express.Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// helper: excluir corridos/corrido (cualquier key que contenga esa palabra)
function buildDemoGenres() {
  const keys = Object.keys(library);
  return keys.filter((g) => !/corrido/i.test(g)); // excluye "corridos", "corridosTumbados", etc
}

// ✅ DEMO: crea sala automática sin corridos, dura 20 minutos
router.get("/demo", (req, res) => {
  const demoGenres = buildDemoGenres();

  const restaurant = createRestaurant({
    name: "Votify Demo",
    genres: demoGenres,
    totalSongs: 40,
  });

  // expira en 20 min
  setTimeout(() => {
    deleteRestaurant(restaurant.id);
  }, 20 * 60 * 1000);

  // abre directo la TV (ahí se ve el QR y suena música)
  return res.redirect(`/tv/${restaurant.id}`);
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