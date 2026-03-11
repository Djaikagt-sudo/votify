export async function createCardCheckoutSession({ roomId, requestId, title, artist, amount = 20 }) {
  const baseUrl = process.env.VOTIFY_BASE_URL || "https://www.votifygt.com";

  const paymentUrl =
    `${baseUrl}/dj-paypal.html` +
    `?room=${encodeURIComponent(roomId)}` +
    `&request=${encodeURIComponent(requestId)}` +
    `&title=${encodeURIComponent(title || "")}` +
    `&artist=${encodeURIComponent(artist || "")}` +
    `&amount=${encodeURIComponent(amount)}`;

  return {
    id: `paypal_${Date.now()}`,
    url: paymentUrl,
  };
}