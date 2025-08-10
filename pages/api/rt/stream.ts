import type { NextApiRequest, NextApiResponse } from "next";
import { getRedis } from "@/lib/redis";

/**
 * API route to read events from a call's Redis Stream.
 * @param req GET request with query params: { callId: string, start?: string, end?: string, count?: number }
 * @param res
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method Not Allowed" });
  }

  const { callId, start = "-", end = "+", count = "50" } = req.query;

  if (!callId || typeof callId !== "string") {
    return res.status(400).json({ message: "Missing or invalid callId" });
  }

  try {
    const client = await getRedis();
    const streamKey = `stream:call:${callId}`;

    const reply = await client.xRange(streamKey, start, end, {
      COUNT: parseInt(count as string, 10),
    });

    const events = reply.map((message) => ({
      id: message.id,
      event: JSON.parse(message.message.event),
    }));

    return res.status(200).json({ events });
  } catch (err: any) {
    console.error("/api/rt/stream error", err);
    // Return empty array if stream doesn't exist yet
    if (err.message?.includes("no such key")) {
      return res.status(200).json({ events: [] });
    }
    return res.status(500).json({ message: "Internal Server Error" });
  }
}