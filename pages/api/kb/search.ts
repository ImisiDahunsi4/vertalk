import type { NextApiRequest, NextApiResponse } from "next";
import { getRedis, sanitizeSearchQuery } from "@/lib/redis";
import { embedText, float32ToBuffer } from "@/lib/embedding";
import { ensureKbIndex } from "@/lib/kb";

function parseFTSearchHashReturn(reply: any): any[] {
  if (!Array.isArray(reply)) return [];
  const out: any[] = [];
  for (let i = 1; i < reply.length; i += 2) {
    const fields = reply[i + 1];
    if (Array.isArray(fields)) {
      const obj: Record<string, any> = {};
      for (let j = 0; j < fields.length; j += 2) {
        const k = String(fields[j]);
        const v = fields[j + 1];
        obj[k] = typeof v === "string" ? v : v?.toString?.() ?? v;
      }
      out.push(obj);
    }
  }
  return out;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).json({ message: "Method Not Allowed" });

  const companyId = typeof req.query.companyId === "string" ? req.query.companyId : "default";
  const q = typeof req.query.q === "string" ? req.query.q : "";
  const type = typeof req.query.type === "string" ? req.query.type : "vector"; // vector | text
  const k = typeof req.query.k === "string" ? parseInt(req.query.k, 10) : 5;

  try {
    const client = await getRedis();
    await ensureKbIndex();

    let items: any[] = [];

    if (type === "vector") {
      const embedding = await embedText(q || "");
      const buf = float32ToBuffer(embedding);
      // Query filter for company and KNN
      const query = `(@companyId:{${companyId}})=>[KNN ${k} @vector $B]`;
      const reply = await client.sendCommand([
        "FT.SEARCH",
        "idx:kb",
        query,
        "PARAMS",
        "2",
        "B",
        buf as unknown as any,
        "RETURN",
        "3",
        "title",
        "chunk",
        "__vector_score",
        "SORTBY",
        "__vector_score",
        "ASC",
        "DIALECT",
        "2",
      ]);
      const docs = parseFTSearchHashReturn(reply);
      items = docs.map((d) => ({ title: d.title, chunk: d.chunk, score: parseFloat(d.__vector_score) }));
    } else {
      const safe = sanitizeSearchQuery(q || "");
      const query = `(@companyId:{${companyId}}) ${safe || "*"}`;
      const reply = await client.sendCommand([
        "FT.SEARCH",
        "idx:kb",
        query,
        "RETURN",
        "2",
        "title",
        "chunk",
        "LIMIT",
        "0",
        String(k),
      ]);
      const docs = parseFTSearchHashReturn(reply);
      items = docs.map((d) => ({ title: d.title, chunk: d.chunk }));
    }

    return res.status(200).json({ items });
  } catch (err: any) {
    console.error("/api/kb/search error", err);
    return res.status(500).json({ message: "Internal Server Error" });
  }
}
