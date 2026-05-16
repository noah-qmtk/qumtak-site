// One-time endpoint: registers qmtk.org as an Apple Pay domain for the Square seller.
// Visit https://qmtk.org/api/register-applepay once after deploy. Idempotent — safe to re-call.
//
// Requires the same Vercel env vars as /api/checkout (SQUARE_ACCESS_TOKEN, SQUARE_ENV).

const SQUARE_BASE = {
  sandbox: "https://connect.squareupsandbox.com",
  production: "https://connect.squareup.com",
};

export default async function handler(req, res) {
  const env = process.env.SQUARE_ENV === "sandbox" ? "sandbox" : "production";
  const token = process.env.SQUARE_ACCESS_TOKEN;
  if (!token) {
    return res.status(500).json({ error: "Square access token not configured." });
  }

  const domain = req.query?.domain || "qmtk.org";

  try {
    const r = await fetch(`${SQUARE_BASE[env]}/v2/apple-pay/domains`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "Square-Version": "2024-12-19",
      },
      body: JSON.stringify({ domain_name: domain }),
    });
    const data = await r.json();
    if (!r.ok) {
      const err = data?.errors?.[0];
      // Already-registered is fine — surface that as success
      if (err?.code === "BAD_REQUEST" && /already/i.test(err?.detail || "")) {
        return res.status(200).json({ ok: true, already_registered: true, domain });
      }
      console.error("Apple Pay registration failed:", JSON.stringify(data));
      return res.status(400).json({ error: err?.detail || "Could not register domain.", code: err?.code });
    }
    return res.status(200).json({ ok: true, domain, env });
  } catch (err) {
    console.error("Network error registering Apple Pay domain:", err);
    return res.status(502).json({ error: "Could not reach Square." });
  }
}
