import crypto from "crypto";
import { buildSongsFromGenres } from "./songBuilder.js";
import { Redis } from "@upstash/redis";

const USE_REDIS =
  !!process.env.UPSTASH_REDIS_REST_URL && !!process.env.UPSTASH_REDIS_REST_TOKEN;

const redis = USE_REDIS
  ? new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    })
  : null;

const restaurants = new Map();

const KEY = {
  restaurant: (id) => `votify:restaurant:${id}`,
  ids: `votify:restaurant:ids`,
};

async function redisSetRestaurant(r) {
  if (!redis) return;
  await redis.set(KEY.restaurant(r.id), r);
  await redis.sadd(KEY.ids, r.id);
}

async function redisGetRestaurant(id) {
  if (!redis) return null;
  const r = await redis.get(KEY.restaurant(id));
  return r || null;
}

async function redisGetAllRestaurants() {
  if (!redis) return [];
  const ids = (await redis.smembers(KEY.ids)) || [];
  if (!ids.length) return [];
  const arr = [];
  for (const id of ids) {
    const r = await redis.get(KEY.restaurant(id));
    if (r) arr.push(r);
  }
  return arr;
}

export async function createRestaurant({ name, genres = [], totalSongs = 40 }) {
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
  await redisSetRestaurant(restaurant);
  return restaurant;
}

export async function getRestaurant(id) {
  if (restaurants.has(id)) return restaurants.get(id);

  const r = await redisGetRestaurant(id);
  if (r) restaurants.set(id, r);
  return r;
}

export async function getRestaurants() {
  if (!redis) return [...restaurants.values()];

  // refresca cache desde redis
  const all = await redisGetAllRestaurants();
  restaurants.clear();
  for (const r of all) restaurants.set(r.id, r);
  return all;
}

export async function moveSongToBottomAfterPlayed(roomId, songId) {
  const r = await getRestaurant(roomId);
  if (!r) return null;

  const idx = r.songs.findIndex((s) => String(s.id) === String(songId));
  if (idx < 0) return r;

  const [song] = r.songs.splice(idx, 1);
  song.votes = 0;
  r.songs.push(song);

  restaurants.set(roomId, r);
  await redisSetRestaurant(r);
  return r;
}

export async function voteSong(roomId, songId) {
  const r = await getRestaurant(roomId);
  if (!r) return null;

  const s = r.songs.find((x) => String(x.id) === String(songId));
  if (!s) return r;

  s.votes = (s.votes || 0) + 1;

  restaurants.set(roomId, r);
  await redisSetRestaurant(r);
  return r;
}