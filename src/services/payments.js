import Stripe from "stripe";

const stripeKey = process.env.STRIPE_SECRET_KEY || "";
const stripe = stripeKey ? new Stripe(stripeKey) : null;

export async function createCardCheckoutSession({ roomId, requestId, title, artist, amount = 20 }) {
  if (!stripe) {
    throw new Error("Falta STRIPE_SECRET_KEY en .env");
  }

  const baseUrl = process.env.VOTIFY_BASE_URL || "http://localhost:3000";

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    payment_method_types: ["card"],
    line_items: [
      {
        price_data: {
          currency: "gtq",
          product_data: {
            name: `Complacencia: ${title} - ${artist}`,
            description: `Votify Dj | Sala ${roomId}`,
          },
          unit_amount: Math.round(Number(amount) * 100),
        },
        quantity: 1,
      },
    ],
    success_url: `${baseUrl}/dj/pay/success?session_id={CHECKOUT_SESSION_ID}&room=${encodeURIComponent(roomId)}&request=${encodeURIComponent(requestId)}`,
    cancel_url: `${baseUrl}/dj/pay/cancel?room=${encodeURIComponent(roomId)}&request=${encodeURIComponent(requestId)}`,
    metadata: {
      roomId: String(roomId),
      requestId: String(requestId),
    },
  });

  return session;
}