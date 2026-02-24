app.post("/restaurants", async (req, res) => {
  const { name } = req.body;

  const restaurant = {
    id: crypto.randomUUID(),
    name,
    createdAt: new Date(),
  };

  restaurants.push(restaurant);

  // 🔥 generar QR
  const url = `http://localhost:3000/r/${restaurant.id}`;
  const qrPath = `public/qrcodes/${restaurant.id}.png`;

  await QRCode.toFile(qrPath, url);

  res.json({
    ...restaurant,
    qr: qrPath,
    url,
  });
});