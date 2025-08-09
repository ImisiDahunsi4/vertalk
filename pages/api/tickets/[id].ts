import type { NextApiRequest, NextApiResponse } from "next";
import { getRedis } from "@/lib/redis";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).json({ message: "Method Not Allowed" });
  const id = typeof req.query.id === "string" ? req.query.id : "";
  if (!id) return res.status(400).json({ message: "Missing id" });

  try {
    const client = await getRedis();
    const reply = await client.sendCommand(["JSON.GET", `ticket:${id}`]);
    if (!reply) return res.status(404).json({ message: "Not Found" });
    const doc = JSON.parse(reply);
    return res.status(200).json({ ticket: doc });
  } catch (err: any) {
    console.error("/api/tickets/[id] error", err);
    return res.status(500).json({ message: "Internal Server Error" });
  }
}
