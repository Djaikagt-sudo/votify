import crypto from "crypto";

// Canciones base (se copian a cada restaurante)
export const baseSongs = [
  { id: 1, title: "Blessd - Condenado al Exito II", file: "condenadoalexito.mp4" },
  { id: 2, title: "Codiciado - Vamos Aclarando Muchas Cosas", file: "vamosaclarandomuchascosas.mp4" },
  { id: 3, title: "Daddy Yankee - Reggaeton Viejo Mix", file: "daddy001.mp4" },
  { id: 4, title: "IA - Entre tu y yo", file: "entretuyyoia.mp4" },
  { id: 5, title: "Blessd & Anuel AA - Yogurcito", file: "yogurcitoremix.mp4" },
];

export const restaurants = []; // memoria (luego lo pasas a DB si quieres)

export function cloneSongs() {
  return baseSongs.map((s) => ({
    ...s,
    votes: 0,
    lastPlayed: null,
    blockedUntil: null,
  }));
}

export function createRestaurant(name) {
  const id = crypto.randomUUID();

  const restaurant = {
    id,
    name,
    createdAt: new Date().toISOString(),
    songs: cloneSongs(),
    current: {
      currentSong: null,
      songStartTime: 0,
      songDuration: 0,
    },
  };

  restaurants.push(restaurant);
  return restaurant;
}

export function getRestaurantById(id) {
  return restaurants.find((r) => r.id === id) || null;
}