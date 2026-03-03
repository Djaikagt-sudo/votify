import crypto from "crypto";
import { buildSongsFromGenres } from "./songBuilder.js";

const restaurants = new Map();

/**
 * Crear sala con canciones ya cargadas desde géneros seleccionados (aleatorio).
 */
export function createRestaurant({ name, genres = [], totalSongs = 40 }){
  const id = crypto.randomUUID();

  const songs = buildSongsFromGenres({
    genres,
    total: Number(totalSongs) || 40
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

export function getRestaurant(id){
  return restaurants.get(id);
}

export function getRestaurants(){
  return [...restaurants.values()];
}

/**
 * Mover una canción al final después de reproducirse (para "no repetir" y rotación).
 * Resetea votos a 0 cuando baja, para que no se quede arriba.
 */
export function moveSongToBottomAfterPlayed(roomId, songId){
  const r = restaurants.get(roomId);
  if(!r) return null;

  const idx = r.songs.findIndex(s => String(s.id) === String(songId));
  if(idx < 0) return r;

  const [song] = r.songs.splice(idx, 1);
  song.votes = 0; // ✅ opcional: baja sin votos
  r.songs.push(song);

  return r;
}

/**
 * Votar canción
 */
export function voteSong(roomId, songId){
  const r = restaurants.get(roomId);
  if(!r) return null;

  const s = r.songs.find(x => String(x.id) === String(songId));
  if(!s) return r;

  s.votes = (s.votes || 0) + 1;
  return r;
}