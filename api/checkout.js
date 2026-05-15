// Vercel serverless function: charges a card via Square Payments API.
//
// Expects POST { source_id, product_key, buyer_email_address, verification_token }.
// `source_id` is a card token produced by Square's Web Payments SDK on the client.
//
// Required Vercel environment variables:
//   SQUARE_ACCESS_TOKEN  — Square Personal Access Token (production or sandbox)
//   SQUARE_LOCATION_ID   — Square location ID
//   SQUARE_ENV           — "production" (default) or "sandbox"

const PRODUCTS = {
  intro_call: { name: "Intro Call — $20 Deposit",       price_cents: 2000  },
  private_1:  { name: "Private Training — 1 Session",   price_cents: 8500  },
  private_5:  { name: "Private Training — 5-Pack",      price_cents: 40000 },
  private_10: { name: "Private Training — 10-Pack",     price_cents: 75000 },
  gift_50:    { name: "qmtk Gift Card — $50",           price_cents: 5000  },
  gift_100:   { name: "qmtk Gift Card — $100",          price_cents: 10000 },
  gift_200:   { name: "qmtk Gift Card — $200",          price_cents: 20000 },
};

const SQUARE_BASE = {
  sandbox: "https://connect.squareupsandbox.com",
  production: "https://connect.squareup.com",
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const env = process.env.SQUARE_ENV === "sandbox" ? "sandbox" : "production";
  const token = process.env.SQUARE_ACCESS_TOKEN;
  const locationId = process.env.SQUARE_LOCATION_ID;

  if (!token || !locationId) {
    return res.status(500).json({ error: "Server is missing Square credentials. Contact noah@qmtk.org." });
  }

  const body = req.body || {};
  const { source_id, product_key, buyer_email_address, verification_token } = body;

  if (!source_id || !product_key) {
    return res.status(400).json({ error: "Missing card token or product." });
  }

  const product = PRODUCTS[product_key];
  if (!product) {
    return res.status(400).json({ error: "Unknown product." });
  }

  if (buyer_email_address && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(buyer_email_address)) {
    return res.status(400).json({ error: "Please enter a valid email address." });
  }

  const payload = {
    source_id,
    idempotency_key: globalThis.crypto.randomUUID(),
    amount_money: { amount: product.price_cents, currency: "USD" },
    location_id: locationId,
    note: `qmtk.org · ${product.name}`,
  };
  if (buyer_email_address) payload.buyer_email_address = buyer_email_address;
  if (verification_token) payload.verification_token = verification_token;

  try {
    const r = await fetch(`${SQUARE_BASE[env]}/v2/payments`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "Square-Version": "2024-12-19",
      },
      body: JSON.stringify(payload),
    });
    const data = await r.json();

    if (!r.ok) {
      const sqErr = data?.errors?.[0];
      const code = sqErr?.code || "PAYMENT_FAILED";
      const detail = sqErr?.detail || "Payment could not be completed. Please try a different card.";
      console.error("Square /v2/payments error:", JSON.stringify(data));
      return res.status(402).json({ error: detail, code });
    }

    return res.status(200).json({
      ok: true,
      payment_id: data.payment?.id || null,
      receipt_url: data.payment?.receipt_url || null,
      amount_cents: data.payment?.amount_money?.amount || product.price_cents,
      product_name: product.name,
    });
  } catch (err) {
    console.error("Network error calling Square:", err);
    return res.status(502).json({ error: "Could not reach payment processor. Please try again." });
  }
}
