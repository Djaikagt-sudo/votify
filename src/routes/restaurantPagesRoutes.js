import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { getRestaurantById } from "../data/store.js";

const router = express.Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Comensales: /r/:rid
router.get("/r/:rid", (req, res) => {
  const { rid } = req.params;
  const r = getRestaurantById(rid);
  if (!r) return res.status(404).send("Restaurante no existe");

  // sirve el index.html de public
  res.sendFile(path.join(__dirname, "../../public/index.html"));
});

// TV: /tv/:rid
router.get("/tv/:rid", (req, res) => {
  const { rid } = req.params;
  const r = getRestaurantById(rid);
  if (!r) return res.status(404).send("Restaurante no existe");

  res.sendFile(path.join(__dirname, "../../public/tv.html"));
});

export default router;