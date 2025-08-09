import type { NextApiRequest, NextApiResponse } from "next";
import { getRedis } from "@/lib/redis";
import { shows as staticShows } from "@/data/shows";

// Utilities
function slugify(input: string) {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method Not Allowed" });
  }

  try {
    const client = await getRedis();

    // 1) Create/verify RediSearch index for JSON shows
    // Doc: JSON indexing schema (FT.CREATE ON JSON)
    // https://github.com/redis/docs/blob/main/content/operate/oss_and_stack/stack-with-enterprise/release-notes/redisearch/redisearch-2.2-release-notes.md#_snippet_4
    const list = (await client.sendCommand(["FT._LIST"])) as unknown as string[];
    const hasIndex = Array.isArray(list) && list.includes("idx:shows");

    if (!hasIndex) {
      try {
        await client.sendCommand([
          "FT.CREATE",
          "idx:shows",
          "ON",
          "JSON",
          "PREFIX",
          "1",
          "show:",
          "SCHEMA",
          "$.title",
          "AS",
          "title",
          "TEXT",
          "$.description",
          "AS",
          "description",
          "TEXT",
          "$.theatre",
          "AS",
          "theatre",
          "TEXT",
          "$.venue",
          "AS",
          "venue",
          "TEXT",
          "$.price",
          "AS",
          "price",
          "NUMERIC",
          "SORTABLE",
          "$.date",
          "AS",
          "date",
          "NUMERIC",
          "SORTABLE",
        ]);
      } catch (e: any) {
        // If index already exists due to race, ignore
        if (!/Index already exists/i.test(String(e?.message))) {
          throw e;
        }
      }
    }

    // 2) Seed JSON documents and suggestions
    // Node-redis JSON.SET usage via sendCommand
    // https://github.com/redis/node-redis/blob/master/packages/json/README.md#_snippet_0

    for (const s of staticShows) {
      const slug = slugify(s.title);
      const doc = {
        title: s.title,
        description: s.description,
        img: s.img,
        theatre: s.theatre,
        venue: s.venue,
        price: Number(s.price),
        date: typeof (s as any).date === "number" ? (s as any).date : new Date(s.date).getTime(),
        slug,
      };

      await client.sendCommand([
        "JSON.SET",
        `show:${slug}`,
        "$",
        JSON.stringify(doc),
      ]);

      // Suggestions dictionary for auto-complete
      // https://github.com/redis/docs/blob/main/content/operate/oss_and_stack/stack-with-enterprise/search/_index.md#_snippet_0
      await client.sendCommand(["FT.SUGADD", "sug:shows", s.title, "1"]);
    }

    return res.status(200).json({ ok: true, indexed: true, count: staticShows.length });
  } catch (err: any) {
    console.error("Seed error", err);
    return res.status(500).json({ message: "Seed failed", error: String(err?.message || err) });
  }
}
