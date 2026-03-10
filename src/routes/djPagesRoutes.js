import express from "express";
import path from "path";
import fs from "fs";
import QRCode from "qrcode";
import { fileURLToPath } from "url";

import { createDjRoom, ensureDjRoom } from "../data/djStore.js";

const router = express.Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

router.get("/dj/demo", async (req, res) => {
  try {
    const room = createDjRoom({ name: "Votify Dj Demo" });

    const proto = (req.headers["x-forwarded-proto"] || req.protocol || "https").toString();
    const host = req.get("host");
    const clientUrl = `${proto}://${host}/dj/request/${room.id}`;

    const qrDir = path.join(__dirname, "../../public/qrcodes");
    if (!fs.existsSync(qrDir)) fs.mkdirSync(qrDir, { recursive: true });

    const qrFile = path.join(qrDir, `dj-${room.id}.png`);
    await QRCode.toFile(qrFile, clientUrl);

    return res.redirect(`/dj/admin/${room.id}`);
  } catch (e) {
    console.error("Error creando dj demo:", e);
    return res.status(500).send("No se pudo crear Votify Dj demo");
  }
});

router.get("/dj/admin/:room", async (req, res) => {
  try {
    const roomId = String(req.params.room || "").trim();
    if (!roomId) return res.status(400).send("Sala inválida");

    ensureDjRoom(roomId);

    const qrDir = path.join(__dirname, "../../public/qrcodes");
    if (!fs.existsSync(qrDir)) fs.mkdirSync(qrDir, { recursive: true });

    const proto = (req.headers["x-forwarded-proto"] || req.protocol || "https").toString();
    const host = req.get("host");
    const clientUrl = `${proto}://${host}/dj/request/${roomId}`;
    const qrFile = path.join(qrDir, `dj-${roomId}.png`);

    if (!fs.existsSync(qrFile)) {
      await QRCode.toFile(qrFile, clientUrl);
    }

    return res.sendFile(path.join(__dirname, "../../public/dj.html"));
  } catch (e) {
    console.error("Error abriendo dj admin:", e);
    return res.status(500).send("No se pudo abrir la sala DJ");
  }
});

router.get("/dj/request/:room", async (req, res) => {
  try {
    const roomId = String(req.params.room || "").trim();
    if (!roomId) return res.status(400).send("Sala inválida");

    ensureDjRoom(roomId);

    const qrDir = path.join(__dirname, "../../public/qrcodes");
    if (!fs.existsSync(qrDir)) fs.mkdirSync(qrDir, { recursive: true });

    const proto = (req.headers["x-forwarded-proto"] || req.protocol || "https").toString();
    const host = req.get("host");
    const clientUrl = `${proto}://${host}/dj/request/${roomId}`;
    const qrFile = path.join(qrDir, `dj-${roomId}.png`);

    if (!fs.existsSync(qrFile)) {
      await QRCode.toFile(qrFile, clientUrl);
    }

    return res.sendFile(path.join(__dirname, "../../public/dj-client.html"));
  } catch (e) {
    console.error("Error abriendo dj client:", e);
    return res.status(500).send("No se pudo abrir la sala DJ");
  }
});

router.get("/dj/pay/success", (req, res) => {
  return res.sendFile(path.join(__dirname, "../../public/dj-pay-success.html"));
});

router.get("/dj/pay/cancel", (req, res) => {
  return res.sendFile(path.join(__dirname, "../../public/dj-pay-cancel.html"));
});

export default router;