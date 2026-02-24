import express from "express";
const router = express.Router();

/* =========================
   LISTA DE VIDEOS MP4
   (nombres EXACTOS carpeta /public/videos)
========================= */

export let songs = [
  { id: 1, title: "Blessd - Condenado al Exito II ", file: "condenadoalexito.mp4", votes: 0, lastPlayed: null, blockedUntil: null },
  { id: 2, title: "Codiciado - Vamos Aclarando Muchas Cosas", file: "vamosaclarandomuchascosas.mp4", votes: 0, lastPlayed: null, blockedUntil: null },
  { id: 3, title: "Daddy Yankee - Reggaeton Viejo Mix", file: "daddy001.mp4", votes: 0, lastPlayed: null, blockedUntil: null },
  { id: 4, title: "IA - Entre tu y yo ", file: "entretuyyoia.mp4", votes: 0, lastPlayed: null, blockedUntil: null },
  { id: 5, title: "Blessd & Anuel AA - Yogurcito", file: "yogurcitoremix.mp4", votes: 0, lastPlayed: null, blockedUntil: null }
];

/* =========================
   VER COLA (solo disponibles)
========================= */
router.get("/queue", (req,res)=>{

  const now = Date.now();

  const available = songs
    .filter(s => !s.blockedUntil || s.blockedUntil < now)
    .sort((a,b)=> b.votes - a.votes);

  res.json(available);
});

/* =========================
   VOTAR
========================= */

router.post("/:id/vote",(req,res)=>{

  const song = songs.find(s=>s.id==req.params.id);

  if(!song){
    return res.status(404).json({error:"Canción no encontrada"});
  }

  const now = Date.now();

  if(song.blockedUntil && song.blockedUntil > now){
    return res.json({message:"Canción bloqueada ⏳"});
  }

  song.votes++;

  res.json(song);
});

/* =========================
   SIGUIENTE CANCIÓN (DJ AI)
========================= */

router.get("/next",(req,res)=>{

  const now = Date.now();

  // canciones disponibles
  let available = songs.filter(
    s => !s.blockedUntil || s.blockedUntil < now
  );

  if(available.length === 0){
    return res.json(null);
  }

  let nextSong;

  /* 🔥 SI HAY VOTOS */
  const votedSongs = available.filter(s=>s.votes>0);

  if(votedSongs.length>0){
    votedSongs.sort((a,b)=>b.votes-a.votes);
    nextSong = votedSongs[0];
  }
  else{
    /* 🎲 SIN VOTOS → RANDOM */
    const randomIndex =
      Math.floor(Math.random()*available.length);

    nextSong = available[randomIndex];
  }

  /* bloquear 45 minutos */
  nextSong.blockedUntil = now + (45*60*1000);
  nextSong.votes = 0;

  res.json(nextSong);
});

export default router;