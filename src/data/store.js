import crypto from "crypto";
import { buildSongsFromGenres } from "./songBuilder.js";

const restaurants = new Map();
const votesByRoom = new Map(); // roomId -> Map(deviceId -> Map(songId -> playCountVotado))

const COOLDOWN_MS = 30 * 60 * 1000;

function getRoomVoteMap(roomId) {
  if (!votesByRoom.has(roomId)) votesByRoom.set(roomId, new Map());
  return votesByRoom.get(roomId);
}
function getDeviceVoteMap(roomId, deviceId) {
  const roomMap = getRoomVoteMap(roomId);
  if (!roomMap.has(deviceId)) roomMap.set(deviceId, new Map());
  return roomMap.get(deviceId);
}

export function createRestaurant({ name, genres = [], totalSongs = 40 }) {
  const id = crypto.randomUUID();

  const songs = buildSongsFromGenres({
    genres,
    total: Number(totalSongs) || 40,
  });

  const restaurant = {
    id,
    name: (name || "Votify").trim(),
    genres,
    songs,
    createdAt: new Date().toISOString(),
  };

  restaurants.set(id, restaurant);
  return restaurant;
}

export function getRestaurant(id) {
  return restaurants.get(id);
}

export function getRestaurants() {
  return [...restaurants.values()];
}

// ✅ BORRAR sala (para demo expirado)
export function deleteRestaurant(roomId) {
  const id = String(roomId);
  votesByRoom.delete(id);
  return restaurants.delete(id);
}

export function moveSongToBottomAfterPlayed(roomId, songId) {
  const r = restaurants.get(roomId);
  if (!r) return null;

  const idx = r.songs.findIndex((s) => String(s.id) === String(songId));
  if (idx < 0) return r;

  const [song] = r.songs.splice(idx, 1);

  song.votes = 0;
  song.playCount = Number(song.playCount || 0) + 1;
  song.lastPlayedAt = Date.now();
  song.cooldownUntil = Date.now() + COOLDOWN_MS;

  r.songs.push(song);
  return r;
}

export function blockSongAndMoveBottom(roomId, songId, reason = "PENDIENTE DE LINK CORRECTO") {
  const r = restaurants.get(roomId);
  if (!r) return null;

  const idx = r.songs.findIndex((s) => String(s.id) === String(songId));
  if (idx < 0) return r;

  const [song] = r.songs.splice(idx, 1);

  song.blocked = true;
  song.blockReason = reason;
  song.votes = 0;
  song.playCount = Number(song.playCount || 0) + 1;
  song.lastPlayedAt = Date.now();
  song.cooldownUntil = Date.now() + COOLDOWN_MS;

  r.songs.push(song);
  return r;
}

export function voteSong(roomId, songId, deviceId) {
  const r = restaurants.get(roomId);
  if (!r) return { ok: false, code: 404, error: "Restaurante no existe" };

  const s = r.songs.find((x) => String(x.id) === String(songId));
  if (!s) return { ok: false, code: 404, error: "Canción no existe" };

  if (s.blocked) {
    return { ok: false, code: 409, error: s.blockReason || "PENDIENTE DE LINK CORRECTO" };
  }

  const now = Date.now();
  const until = Number(s.cooldownUntil || 0);
  if (until && now < until) {
    const mins = Math.max(1, Math.ceil((until - now) / 60000));
    return { ok: false, code: 429, error: `Bloqueada ${mins} min` };
  }

  const dev = String(deviceId || "").trim();
  if (!dev) return { ok: false, code: 400, error: "Falta deviceId" };

  const devMap = getDeviceVoteMap(roomId, dev);
  const lastVotedCycle = devMap.get(String(songId));
  const currentCycle = Number(s.playCount || 0);

  if (Number(lastVotedCycle) === currentCycle) {
    return { ok: false, code: 409, error: "Ya votaste por esta canción" };
  }

  s.votes = (s.votes || 0) + 1;
  devMap.set(String(songId), currentCycle);

  return { ok: true, restaurant: r };
}