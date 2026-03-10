let spotifyTokenCache = {
  accessToken: "",
  expiresAt: 0,
};

async function getSpotifyAccessToken() {
  const now = Date.now();

  if (spotifyTokenCache.accessToken && now < spotifyTokenCache.expiresAt) {
    return spotifyTokenCache.accessToken;
  }

  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("Faltan credenciales de Spotify en .env");
  }

  const basic = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

  const resp = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "client_credentials",
    }),
  });

  if (!resp.ok) {
    const txt = await resp.text();
    throw new Error(`Spotify token error: ${txt}`);
  }

  const data = await resp.json();

  spotifyTokenCache = {
    accessToken: data.access_token,
    expiresAt: now + (Number(data.expires_in || 3600) - 60) * 1000,
  };

  return spotifyTokenCache.accessToken;
}

export async function searchSpotifyTracks(query) {
  const q = String(query || "").trim();
  if (!q) return [];

  const token = await getSpotifyAccessToken();

  const url = new URL("https://api.spotify.com/v1/search");
  url.searchParams.set("q", q);
  url.searchParams.set("type", "track");
  url.searchParams.set("limit", "12");
  url.searchParams.set("market", "GT");

  const resp = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!resp.ok) {
    const txt = await resp.text();
    throw new Error(`Spotify search error: ${txt}`);
  }

  const data = await resp.json();
  const items = data?.tracks?.items || [];

  return items.map((track) => ({
    spotifyTrackId: track.id,
    title: track.name || "",
    artist: (track.artists || []).map((a) => a.name).join(", "),
    album: track.album?.name || "",
    artwork: track.album?.images?.[0]?.url || "",
    durationMs: Number(track.duration_ms || 0),
    previewUrl: track.preview_url || "",
    externalUrl: track.external_urls?.spotify || "",
  }));
}