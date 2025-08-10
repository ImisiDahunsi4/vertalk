import type { NextApiRequest, NextApiResponse } from "next";
import { getRedis } from "@/lib/redis";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ message: "Method Not Allowed" });

  const { mode = "soft", companyId } = req.body || {};

  try {
    const client = await getRedis();

    if (mode === "soft") {
      await client.set("currentCompany", "default");
      return res.status(200).json({ ok: true, mode: "soft", activeCompanyId: "default" });
    }

    if (mode === "hard") {
      if (!companyId || typeof companyId !== "string") {
        return res.status(400).json({ message: "Missing companyId for hard reset" });
      }

      // Delete KB docs for this company (SCAN + DEL)
      let cursor = 0;
      do {
        const reply = await client.scan(cursor, { MATCH: `kb:${companyId}:*`, COUNT: 100 });
        cursor = reply.cursor;
        const keys = reply.keys;
        if (keys.length > 0) {
          await client.del(keys);
        }
      } while (cursor !== 0);

      // Delete company config
      try {
        await client.sendCommand(["JSON.DEL", `company:${companyId}`, "$"]);
      } catch {}

      // Point back to default
      await client.set("currentCompany", "default");

      return res.status(200).json({ ok: true, mode: "hard", activeCompanyId: "default" });
    }

    return res.status(400).json({ message: "Invalid mode" });
  } catch (err: any) {
    console.error("/api/admin/reset error", err);
    return res.status(500).json({ message: "Internal Server Error" });
  }
}
