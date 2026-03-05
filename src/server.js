import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import QRCode from "qrcode";

import restaurantPagesRoutes from "./routes/restaurantPagesRoutes.js";
import restaurantApiRoutes from "./routes/restaurantApiRoutes.js";

const app = express();
app.use(express.json());

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ✅ Servir estáticos desde /public
app.use(express.static(path.join(__dirname, "../public")));

// ✅ QR dinámico (NO depende de /public/qrcodes)
app.get("/qr/:room.png", async (req, res) => {
  try {
    const { room } = req.params;

    // link que abrirá el usuario al escanear
    const url = `${req.protocol}://${req.get("host")}/r/${room}`;

    res.setHeader("Content-Type", "image/png");

    const png = await QRCode.toBuffer(url, {
      width: 420,
      margin: 1,
      errorCorrectionLevel: "M",
    });

    return res.send(png);
  } catch (e) {
    return res.status(500).send("QR error");
  }
});

// ✅ Páginas (/ , /demo, /tv/:room, /r/:room ...)
app.use("/", restaurantPagesRoutes);

// ✅ API (/api/:room/state, /api/:room/vote/:songId)
app.use("/api", restaurantApiRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🔥 Servidor corriendo en puerto ${PORT}`);
});