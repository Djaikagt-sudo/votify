// src/data/store.js
// Store único en memoria (multi-restaurante)

export const store = {
  restaurants: new Map(), // key: rid -> restaurant
};

export function createRestaurant({ id, name, songs }) {
  const restaurant = {
    id,
    name,
    createdAt: new Date().toISOString(),
    songs: songs.map((s, i) => ({
      id: i + 1,
      title: s.title,
      artist: s.artist,
      youtubeId: s.youtubeId,
      votes: 0,
      lastPlayedAt: 0, // para información extra si la quieres luego
    })),
    current: {
      currentSongId: null,
      songStartTime: 0,
    },
  };

  store.restaurants.set(id, restaurant);
  return restaurant;
}

export function getRestaurant(id) {
  return store.restaurants.get(id) || null;
}

/**
 * ✅ Cuando una canción terminó:
 * - votes = 0 para que baje del top
 * - se mueve al final del array para que quede abajo
 */
export function moveSongToBottomAfterPlayed(roomId, songId) {
  const restaurant = getRestaurant(roomId);
  if (!restaurant) return null;

  const idx = restaurant.songs.findIndex((s) => Number(s.id) === Number(songId));
  if (idx === -1) return null;

  const song = restaurant.songs[idx];

  // 1) bajar del top
  song.votes = 0;

  // 2) marcar como reproducida (opcional)
  song.lastPlayedAt = Date.now();

  // 3) mover al final del array
  restaurant.songs.splice(idx, 1);
  restaurant.songs.push(song);

  // 4) guardar current (opcional)
  restaurant.current.currentSongId = song.id;
  restaurant.current.songStartTime = Date.now();

  return restaurant;
}