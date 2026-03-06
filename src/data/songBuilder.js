import { library } from "./library.js";

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function normalizeId(value) {
  const v = String(value || "").trim();
  return /^[a-zA-Z0-9_-]{11}$/.test(v) ? v : "";
}

export function buildSongsFromGenres({ genres = [] } = {}) {
  const allGenres = Object.keys(library);

  const pickedGenres =
    Array.isArray(genres) && genres.length
      ? genres.filter((g) => allGenres.includes(g))
      : allGenres;

  const result = [];
  let idCounter = 1;

  for (const genre of pickedGenres) {
    const songs = Array.isArray(library[genre]) ? shuffle(library[genre]) : [];

    for (const song of songs) {
      const youtubeId = normalizeId(song.youtubeId);
      if (!youtubeId) continue;

      result.push({
        id: idCounter++,
        genre,
        artist: song.artist || "",
        title: song.title || "",
        youtubeId,
        votes: 0,
        playCount: 0,
        lastPlayedAt: 0,
        cooldownUntil: 0,
        blocked: false,
        blockReason: ""
      });
    }
  }

  return result;
}