import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { getRestaurant } from "../data/store.js";

const router = express.Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

router.get("/login", (req, res) => {
  return res.sendFile(path.join(__dirname, "../../public/login.html"));
});

export default router;