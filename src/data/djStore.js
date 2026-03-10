import crypto from "crypto";

const djRooms = new Map();

function ensureRoom(roomId) {
  const id = String(roomId || "").trim();
  if (!id) return null;

  if (!djRooms.has(id)) {
    djRooms.set(id, {
      id,
      name: `Votify Dj ${id.slice(0, 4)}`,
      requests: [],
      createdAt: new Date().toISOString(),
    });
  }

  return djRooms.get(id);
}

export function createDjRoom({ name }) {
  const id = crypto.randomUUID();

  const room = {
    id,
    name: String(name || "Votify Dj").trim(),
    requests: [],
    createdAt: new Date().toISOString(),
  };

  djRooms.set(id, room);
  return room;
}

export function getDjRoom(roomId) {
  return djRooms.get(String(roomId));
}

export function getDjRooms() {
  return [...djRooms.values()];
}

export function createDjRequest(roomId, payload = {}) {
  const room = ensureRoom(roomId);
  if (!room) return null;

  const request = {
    id: crypto.randomUUID(),
    roomId: room.id,
    customerName: String(payload.customerName || "Cliente").trim().slice(0, 30),
    spotifyTrackId: String(payload.spotifyTrackId || "").trim(),
    title: String(payload.title || "").trim(),
    artist: String(payload.artist || "").trim(),
    album: String(payload.album || "").trim(),
    artwork: String(payload.artwork || "").trim(),
    durationMs: Number(payload.durationMs || 0),
    previewUrl: String(payload.previewUrl || "").trim(),
    price: 20,
    currency: "GTQ",
    status: "pending",
    rejectionReason: "",
    paymentStatus: "unpaid",
    paymentUrl: "",
    stripeSessionId: "",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    acceptedAt: null,
    rejectedAt: null,
    paidAt: null,
    playedAt: null,
  };

  room.requests.unshift(request);
  return request;
}

export function getDjRequests(roomId) {
  const room = getDjRoom(roomId);
  if (!room) return [];
  return room.requests;
}

export function getDjRequest(roomId, requestId) {
  const room = getDjRoom(roomId);
  if (!room) return null;
  return room.requests.find((r) => String(r.id) === String(requestId)) || null;
}

export function acceptDjRequest(roomId, requestId) {
  const req = getDjRequest(roomId, requestId);
  if (!req) return null;

  req.status = "accepted_waiting_payment";
  req.updatedAt = new Date().toISOString();
  req.acceptedAt = new Date().toISOString();
  req.rejectionReason = "";

  return req;
}

export function rejectDjRequest(roomId, requestId, reason = "") {
  const req = getDjRequest(roomId, requestId);
  if (!req) return null;

  req.status = "rejected";
  req.updatedAt = new Date().toISOString();
  req.rejectedAt = new Date().toISOString();
  req.rejectionReason = String(reason || "No disponible").trim().slice(0, 120);

  return req;
}

export function attachPaymentLink(roomId, requestId, { paymentUrl, stripeSessionId }) {
  const req = getDjRequest(roomId, requestId);
  if (!req) return null;

  req.paymentUrl = String(paymentUrl || "");
  req.stripeSessionId = String(stripeSessionId || "");
  req.updatedAt = new Date().toISOString();

  return req;
}

export function markDjRequestPaidBySession(stripeSessionId) {
  const sid = String(stripeSessionId || "").trim();
  if (!sid) return null;

  for (const room of djRooms.values()) {
    const req = room.requests.find((r) => String(r.stripeSessionId) === sid);
    if (req) {
      req.status = "paid";
      req.paymentStatus = "paid";
      req.updatedAt = new Date().toISOString();
      req.paidAt = new Date().toISOString();
      return req;
    }
  }

  return null;
}

export function markDjRequestPlayed(roomId, requestId) {
  const req = getDjRequest(roomId, requestId);
  if (!req) return null;

  req.status = "played";
  req.updatedAt = new Date().toISOString();
  req.playedAt = new Date().toISOString();

  return req;
}