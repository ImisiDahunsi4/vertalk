import type { NextApiRequest, NextApiResponse } from "next";
import { getRedis } from "@/lib/redis";
import { sanitizeSearchQuery } from "@/lib/redis";

function parseFTSearchReturn(reply: any): any[] {
  // reply: [total, key, [field, value, ...], key, [field, value, ...], ...]
  // We return JSON via RETURN 1 '$' (or previously AS doc). Accept both "$" and "doc" keys.
  if (!Array.isArray(reply)) return [];
  const out: any[] = [];
  for (let i = 1; i < reply.length; i += 2) {
    const fields = reply[i + 1];
    if (Array.isArray(fields)) {
      for (let j = 0; j < fields.length; j += 2) {
        if (fields[j] === "doc" || fields[j] === "$") {
          try {
            const parsed = JSON.parse(fields[j + 1]);
            out.push(parsed);
          } catch {}
        }
      }
    }
  }
  return out;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).json({ message: "Method Not Allowed" });
  try {
    const client = await getRedis();
    const q = typeof req.query.q === "string" ? req.query.q : "";

    // Build FT.SEARCH
    let results: any[] = [];
    if (q && q.trim().length > 0) {
      const safe = sanitizeSearchQuery(q);
      const query = safe.length > 0 ? `${safe}` : "*";
      const reply = await client.sendCommand([
        "FT.SEARCH",
        "idx:shows",
        query,
        "RETURN",
        "1",
        "$",
        "SORTBY",
        "date",
        "ASC",
        "LIMIT",
        "0",
        "50",
      ]);
      results = parseFTSearchReturn(reply);
    } else {
      const reply = await client.sendCommand([
        "FT.SEARCH",
        "idx:shows",
        "*",
        "RETURN",
        "1",
        "$",
        "SORTBY",
        "date",
        "ASC",
        "LIMIT",
        "0",
        "50",
      ]);
      results = parseFTSearchReturn(reply);
    }

    return res.status(200).json({ items: results });
  } catch (err: any) {
    console.error("/api/shows error", err);
    return res.status(200).json({ items: [] }); // graceful fallback for UI
  }
}
