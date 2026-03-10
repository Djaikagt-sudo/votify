import express from "express";
import {
  ensureDjRoom,
  getDjRequests,
  createDjRequest,
  acceptDjRequest,
  rejectDjRequest,
  attachPaymentLink,
  markDjRequestPaidBySession,
  markDjRequestPlayed,
  getDjRequest,
} from "../data/djStore.js";
import { searchSpotifyTracks } from "../services/spotify.js";
import { createCardCheckoutSession } from "../services/payments.js";

const router = express.Router();

router.get("/:room/state", (req, res) => {
  const room = ensureDjRoom(req.params.room);
  if (!room) {
    return res.status(404).json({ ok: false, error: "Sala DJ no existe" });
  }

  return res.json({
    ok: true,
    room,
    qrUrl: `/qrcodes/dj-${room.id}.png`,
    requests: getDjRequests(room.id),
    stripePublicKey: process.env.STRIPE_PUBLIC_KEY || "",
  });
});

router.get("/:room/search", async (req, res) => {
  try {
    const room = ensureDjRoom(req.params.room);
    if (!room) {
      return res.status(404).json({ ok: false, error: "Sala DJ no existe" });
    }

    const q = String(req.query.q || "").trim();
    if (!q) return res.json({ ok: true, results: [] });

    const results = await searchSpotifyTracks(q);
    return res.json({ ok: true, results });
  } catch (e) {
    console.error("Spotify search error:", e);
    return res.status(500).json({ ok: false, error: e.message || "Error buscando en Spotify" });
  }
});

router.post("/:room/request", (req, res) => {
  try {
    const room = ensureDjRoom(req.params.room);
    if (!room) {
      return res.status(404).json({ ok: false, error: "Sala DJ no existe" });
    }

    const body = req.body || {};

    const request = createDjRequest(room.id, {
      customerName: body.customerName,
      spotifyTrackId: body.spotifyTrackId,
      title: body.title,
      artist: body.artist,
      album: body.album,
      artwork: body.artwork,
      durationMs: body.durationMs,
      previewUrl: body.previewUrl,
    });

    const io = req.app.get("io");
    if (io) {
      io.to(`dj:${room.id}`).emit("dj:requests:update", {
        roomId: room.id,
        requests: getDjRequests(room.id),
      });
    }

    return res.json({ ok: true, request });
  } catch (e) {
    console.error("Create DJ request error:", e);
    return res.status(500).json({ ok: false, error: e.message || "No se pudo crear la solicitud" });
  }
});

router.post("/:room/request/:requestId/accept", async (req, res) => {
  try {
    const { room, requestId } = req.params;

    ensureDjRoom(room);

    const accepted = acceptDjRequest(room, requestId);
    if (!accepted) {
      return res.status(404).json({ ok: false, error: "Solicitud no existe" });
    }

    const session = await createCardCheckoutSession({
      roomId: room,
      requestId,
      title: accepted.title,
      artist: accepted.artist,
      amount: accepted.price,
    });

    const updated = attachPaymentLink(room, requestId, {
      paymentUrl: session.url,
      stripeSessionId: session.id,
    });

    const io = req.app.get("io");
    if (io) {
      io.to(`dj:${room}`).emit("dj:requests:update", {
        roomId: room,
        requests: getDjRequests(room),
      });
    }

    return res.json({ ok: true, request: updated });
  } catch (e) {
    console.error("Accept DJ request error:", e);
    return res.status(500).json({ ok: false, error: e.message || "No se pudo aceptar" });
  }
});

router.post("/:room/request/:requestId/reject", (req, res) => {
  try {
    const { room, requestId } = req.params;
    ensureDjRoom(room);

    const reason = String(req.body?.reason || "No disponible").trim();

    const rejected = rejectDjRequest(room, requestId, reason);
    if (!rejected) {
      return res.status(404).json({ ok: false, error: "Solicitud no existe" });
    }

    const io = req.app.get("io");
    if (io) {
      io.to(`dj:${room}`).emit("dj:requests:update", {
        roomId: room,
        requests: getDjRequests(room),
      });
    }

    return res.json({ ok: true, request: rejected });
  } catch (e) {
    console.error("Reject DJ request error:", e);
    return res.status(500).json({ ok: false, error: e.message || "No se pudo rechazar" });
  }
});

router.post("/:room/request/:requestId/played", (req, res) => {
  try {
    const { room, requestId } = req.params;
    ensureDjRoom(room);

    const played = markDjRequestPlayed(room, requestId);
    if (!played) {
      return res.status(404).json({ ok: false, error: "Solicitud no existe" });
    }

    const io = req.app.get("io");
    if (io) {
      io.to(`dj:${room}`).emit("dj:requests:update", {
        roomId: room,
        requests: getDjRequests(room),
      });
    }

    return res.json({ ok: true, request: played });
  } catch (e) {
    console.error("Played DJ request error:", e);
    return res.status(500).json({ ok: false, error: e.message || "No se pudo marcar como tocada" });
  }
});

router.get("/payment/confirm", (req, res) => {
  try {
    const sessionId = String(req.query.session_id || "").trim();
    if (!sessionId) {
      return res.status(400).json({ ok: false, error: "Falta session_id" });
    }

    const paid = markDjRequestPaidBySession(sessionId);
    if (!paid) {
      return res.status(404).json({ ok: false, error: "Pago no encontrado" });
    }

    const io = req.app.get("io");
    if (io) {
      io.to(`dj:${paid.roomId}`).emit("dj:requests:update", {
        roomId: paid.roomId,
        requests: getDjRequests(paid.roomId),
      });
    }

    return res.json({ ok: true, request: paid });
  } catch (e) {
    console.error("Confirm payment error:", e);
    return res.status(500).json({ ok: false, error: e.message || "No se pudo confirmar el pago" });
  }
});

router.get("/:room/request/:requestId", (req, res) => {
  try {
    ensureDjRoom(req.params.room);

    const reqItem = getDjRequest(req.params.room, req.params.requestId);
    if (!reqItem) {
      return res.status(404).json({ ok: false, error: "Solicitud no existe" });
    }

    return res.json({ ok: true, request: reqItem });
  } catch (e) {
    console.error("Get DJ request error:", e);
    return res.status(500).json({ ok: false, error: e.message || "No se pudo leer la solicitud" });
  }
});

export default router;