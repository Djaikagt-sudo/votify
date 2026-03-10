import express from "express";
import path from "path";
import fs from "fs";
import QRCode from "qrcode";
import { fileURLToPath } from "url";

import { createDjRoom, getDjRoom } from "../data/djStore.js";

const router = express.Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

router.get("/dj/demo", async (req, res) => {
  try {
    const room = createDjRoom({ name: "Votify Dj Demo" });

    const proto = (req.headers["x-forwarded-proto"] || req.protocol || "http").toString();
    const host = req.get("host");
    const clientUrl = `${proto}://${host}/dj/request/${room.id}`;

    const qrDir = path.join(__dirname, "../../public/qrcodes");
    if (!fs.existsSync(qrDir)) fs.mkdirSync(qrDir, { recursive: true });

    const qrFile = path.join(qrDir, `dj-${room.id}.png`);
    await QRCode.toFile(qrFile, clientUrl);

    return res.redirect(`/dj/admin/${room.id}`);
  } catch (e) {
    return res.status(500).send("No se pudo crear Votify Dj demo");
  }
});

router.get("/dj/admin/:room", (req, res) => {
  const room = getDjRoom(req.params.room);
  if (!room) return res.status(404).send("Sala DJ no existe");

  return res.sendFile(path.join(__dirname, "../../public/dj.html"));
});

router.get("/dj/request/:room", (req, res) => {
  const room = getDjRoom(req.params.room);
  if (!room) return res.status(404).send("Sala DJ no existe");

  return res.sendFile(path.join(__dirname, "../../public/dj-client.html"));
});

router.get("/dj/pay/success", (req, res) => {
  return res.sendFile(path.join(__dirname, "../../public/dj-pay-success.html"));
});

router.get("/dj/pay/cancel", (req, res) => {
  return res.sendFile(path.join(__dirname, "../../public/dj-pay-cancel.html"));
});

export default router;