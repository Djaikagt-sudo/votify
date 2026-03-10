import express from "express";
import {
  getDjRoom,
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
  const room = getDjRoom(req.params.room);
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
    const room = getDjRoom(req.params.room);
    if (!room) {
      return res.status(404).json({ ok: false, error: "Sala DJ no existe" });
    }

    const q = String(req.query.q || "").trim();
    if (!q) return res.json({ ok: true, results: [] });

    const results = await searchSpotifyTracks(q);
    return res.json({ ok: true, results });
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message || "Error buscando en Spotify" });
  }
});

router.post("/:room/request", (req, res) => {
  const room = getDjRoom(req.params.room);
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
});

router.post("/:room/request/:requestId/accept", async (req, res) => {
  try {
    const { room, requestId } = req.params;

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
    return res.status(500).json({ ok: false, error: e.message || "No se pudo aceptar" });
  }
});

router.post("/:room/request/:requestId/reject", (req, res) => {
  const { room, requestId } = req.params;
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
});

router.post("/:room/request/:requestId/played", (req, res) => {
  const { room, requestId } = req.params;

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
});

router.get("/payment/confirm", (req, res) => {
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
});

router.get("/:room/request/:requestId", (req, res) => {
  const reqItem = getDjRequest(req.params.room, req.params.requestId);
  if (!reqItem) {
    return res.status(404).json({ ok: false, error: "Solicitud no existe" });
  }

  return res.json({ ok: true, request: reqItem });
});

export default router;