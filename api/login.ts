import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createSessionCookie } from "./_lib/auth";

export default function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Methode nicht erlaubt." });
    return;
  }

  const expected = process.env.SITE_PASSWORD;
  if (!expected) {
    res.status(500).json({ error: "SITE_PASSWORD ist auf dem Server nicht konfiguriert." });
    return;
  }

  const password = req.body?.password;
  if (typeof password !== "string" || password !== expected) {
    res.status(401).json({ error: "Falsches Passwort." });
    return;
  }

  res.setHeader("Set-Cookie", createSessionCookie());
  res.status(200).json({ ok: true });
}
