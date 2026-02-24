import express from "express";
import path from "path";
import { fileURLToPath } from "url";

import restaurantRoutes from "./routes/restaurantRoutes.js";
import restaurantPagesRoutes from "./routes/restaurantPagesRoutes.js";
import restaurantApiRoutes from "./routes/restaurantApiRoutes.js";

const app = express();
const PORT = process.env.PORT || 3000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// middlewares
app.use(express.json());
app.set("trust proxy", true);

// estáticos (tu public)
app.use(express.static(path.join(__dirname, "../public")));
app.use("/videos", express.static(path.join(__dirname, "../public/videos")));
app.use("/qrcodes", express.static(path.join(__dirname, "../public/qrcodes")));

// PÁGINAS (comensales / tv)
app.use("/", restaurantPagesRoutes);

// API
app.use("/api/restaurants", restaurantRoutes);
app.use("/api/r", restaurantApiRoutes);

// health
app.get("/health", (req, res) => res.json({ ok: true }));

app.listen(PORT, "0.0.0.0", () => {
  console.log("🔥 Servidor corriendo en puerto", PORT);
});