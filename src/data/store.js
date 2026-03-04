import crypto from "crypto";
import { buildSongsFromGenres } from "./songBuilder.js";

const restaurants = new Map();

// vote ledger: roomId -> songId -> Set(deviceId)
const voteLedger = new Map();

function getLedgerSet(roomId, songId){
  const rid = String(roomId);
  const sid = String(songId);

  let byRoom = voteLedger.get(rid);
  if(!byRoom){
    byRoom = new Map();
    voteLedger.set(rid, byRoom);
  }

  let set = byRoom.get(sid);
  if(!set){
    set = new Set();
    byRoom.set(sid, set);
  }

  return set;
}

function clearLedger(roomId, songId){
  const rid = String(roomId);
  const sid = String(songId);
  const byRoom = voteLedger.get(rid);
  if(!byRoom) return;
  byRoom.delete(sid);
}

export function createRestaurant({ name, genres = [], totalSongs = 40 }){
  const id = crypto.randomUUID();

  const songs = buildSongsFromGenres({
    genres,
    total: Number(totalSongs) || 40
  }).map((s) => ({
    ...s,
    votes: Number(s?.votes || 0),
    playCount: Number(s?.playCount || 0),
    lastPlayedAt: Number(s?.lastPlayedAt || 0),
    cooldownUntil: Number(s?.cooldownUntil || 0),
  }));

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

export function getRestaurant(id){
  return restaurants.get(id);
}

export function getRestaurants(){
  return [...restaurants.values()];
}

export function moveSongToBottomAfterPlayed(roomId, songId){
  const r = restaurants.get(roomId);
  if(!r) return null;

  const idx = r.songs.findIndex(s => String(s.id) === String(songId));
  if(idx < 0) return r;

  const [song] = r.songs.splice(idx, 1);

  const now = Date.now();
  song.votes = 0;
  song.playCount = Number(song.playCount || 0) + 1;
  song.lastPlayedAt = now;
  song.cooldownUntil = now + (30 * 60 * 1000); // 30 min

  // reiniciar votos por dispositivo para el nuevo ciclo
  clearLedger(roomId, songId);

  r.songs.push(song);
  return r;
}

/**
 * Reglas:
 * - 1 voto por canción por dispositivo (por ciclo de reproducción)
 * - si la canción ya sonó: cooldown 30 min (no se puede votar)
 */
export function voteSong(roomId, songId, deviceId){
  const r = restaurants.get(roomId);
  if(!r) return { restaurant: null, status: 404, error: "Restaurante no existe" };

  const sid = Number.isNaN(Number(songId)) ? songId : Number(songId);
  const s = r.songs.find(x => String(x.id) === String(sid));
  if(!s) return { restaurant: r, status: 404, error: "Canción no existe" };

  const dev = String(deviceId || "").trim();
  if(!dev) return { restaurant: r, status: 400, error: "deviceId requerido" };

  const now = Date.now();
  const lockUntil = Number(s.cooldownUntil || 0);
  if(lockUntil && now < lockUntil){
    const remainingMs = lockUntil - now;
    const mins = Math.max(1, Math.ceil(remainingMs / 60000));
    return { restaurant: r, status: 429, error: `Esta canción está bloqueada. Intenta en ${mins} min.` };
  }

  const set = getLedgerSet(roomId, sid);
  if(set.has(dev)){
    return { restaurant: r, status: 409, error: "Ya votaste esta canción en este dispositivo" };
  }

  set.add(dev);
  s.votes = (s.votes || 0) + 1;

  return { restaurant: r, status: 200, error: null };
}