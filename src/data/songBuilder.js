import { library } from "./library.js";

function shuffle(arr){
  const a = [...arr];
  for(let i=a.length-1;i>0;i--){
    const j = Math.floor(Math.random()*(i+1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function normalizeId(s){
  const v = String(s || "").trim();
  return /^[a-zA-Z0-9_-]{11}$/.test(v) ? v : "";
}

export function buildSongsFromGenres({ genres = [], total = 40 } = {}){
  const allGenres = Object.keys(library);

  const pickedGenres = (Array.isArray(genres) && genres.length)
    ? genres.filter(g => allGenres.includes(g))
    : allGenres;

  const pools = pickedGenres.map((g) => {
    const songs = Array.isArray(library[g]) ? library[g] : [];
    return { genre: g, songs: shuffle(songs) };
  });

  const result = [];
  let safety = 0;

  while(result.length < total && safety < 9999){
    safety++;
    const available = pools.filter(p => p.songs.length > 0);
    if(!available.length) break;

    const p = available[Math.floor(Math.random() * available.length)];
    const s = p.songs.shift();

    const youtubeId = normalizeId(s.youtubeId);
    if(!youtubeId) continue;

    result.push({
      id: result.length + 1,
      genre: p.genre,
      artist: s.artist || "",
      title: s.title || "",
      youtubeId,
      votes: 0,

      // ✅ NUEVO
      playCount: 0,          // incrementa cuando suena o se bloquea
      lastPlayedAt: 0,       // timestamp
      cooldownUntil: 0,      // timestamp: 30min
      blocked: false,        // true si link falla
      blockReason: ""        // "PENDIENTE DE LINK CORRECTO"
    });
  }

  return result;
}