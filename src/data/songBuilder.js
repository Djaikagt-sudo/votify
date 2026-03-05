import { library } from "./library.js";

// genera canciones a partir de géneros, tolerando mayúsculas/minúsculas
export function buildSongsFromGenres({ genres = [], total = 40 }) {
  const want = (genres || []).map(g => String(g || "").trim()).filter(Boolean);

  const libKeys = Object.keys(library || {});
  const keyMap = new Map();
  // mapa lower -> key real
  for (const k of libKeys) keyMap.set(k.toLowerCase(), k);

  const pools = [];

  for (const g of want) {
    const realKey = keyMap.get(g.toLowerCase());
    if (!realKey) continue;

    const arr = Array.isArray(library[realKey]) ? library[realKey] : [];
    for (const s of arr) {
      if (!s) continue;
      pools.push({
        id: s.id ?? `${realKey}-${Math.random().toString(36).slice(2)}`,
        title: s.title || s.name || "Sin título",
        artist: s.artist || "",
        youtubeId: s.youtubeId || s.youtube || s.yt || "",
        genre: realKey,
        votes: 0,
        playCount: 0,
        lastPlayedAt: 0,
        cooldownUntil: 0
      });
    }
  }

  // quitar vacíos y duplicados por youtubeId
  const seen = new Set();
  const unique = [];
  for (const s of pools) {
    const key = String(s.youtubeId || "").trim();
    if (!key) continue;
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(s);
  }

  // shuffle simple
  for (let i = unique.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [unique[i], unique[j]] = [unique[j], unique[i]];
  }

  return unique.slice(0, Math.max(1, Number(total) || 40));
}