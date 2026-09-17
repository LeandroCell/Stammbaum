import type { VercelRequest, VercelResponse } from "@vercel/node";
import { requireSession } from "./_lib/auth";
import { getTree, saveTree } from "./_lib/db";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!requireSession(req, res)) return;

  if (req.method === "GET") {
    try {
      const tree = await getTree();
      res.status(200).json(tree);
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : "Serverfehler beim Laden." });
    }
    return;
  }

  if (req.method === "PUT") {
    const { people, families } = req.body ?? {};
    if (!Array.isArray(people) || !Array.isArray(families)) {
      res.status(400).json({ error: "Ungültiger Anfrage-Body: people/families müssen Arrays sein." });
      return;
    }
    try {
      await saveTree(people, families);
      res.status(200).json({ ok: true });
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : "Serverfehler beim Speichern." });
    }
    return;
  }

  res.status(405).json({ error: "Methode nicht erlaubt." });
}
