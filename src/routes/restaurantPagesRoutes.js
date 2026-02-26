import express from "express";
import path from "path";
import { getRestaurant } from "../data/store.js";

const router = express.Router();

router.get("/r/:room", (req, res) => {
  const { room } = req.params;
  const restaurant = getRestaurant(room);

  if (!restaurant) {
    return res.status(404).send("Restaurante no existe");
  }

  // sirve tu cliente
  return res.sendFile(path.join(process.cwd(), "public", "index.html"));
});

router.get("/tv/:room", (req, res) => {
  const { room } = req.params;
  const restaurant = getRestaurant(room);

  if (!restaurant) {
    return res.status(404).send("Restaurante no existe");
  }

  // sirve tu TV
  return res.sendFile(path.join(process.cwd(), "public", "tv.html"));
});

export default router;