import type { VercelRequest, VercelResponse } from "@vercel/node";
import { clearSessionCookie } from "./_lib/auth";

export default function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Methode nicht erlaubt." });
    return;
  }

  res.setHeader("Set-Cookie", clearSessionCookie());
  res.status(200).json({ ok: true });
}
