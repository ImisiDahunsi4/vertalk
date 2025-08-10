import type { NextApiRequest, NextApiResponse } from "next";
import { getRedis } from "@/lib/redis";

/**
 * API route to publish a message to a call's channel and stream.
 * Useful for testing real-time functionality.
 * @param req POST request with body: { callId: string, event: any }
 * @param res
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method Not Allowed" });
  }

  const { callId, event } = req.body;
  if (!callId || !event) {
    return res.status(400).json({ message: "Missing callId or event in body" });
  }

  try {
    const client = await getRedis();
    const streamKey = `stream:call:${callId}`;
    const channel = `ch:call:${callId}`;
    const eventStr = JSON.stringify(event);

    // Use a pipeline to send commands efficiently
    const pipe = client.multi();
    pipe.xAdd(streamKey, "*", { event: eventStr });
    pipe.publish(channel, eventStr);
    await pipe.exec();

    return res.status(200).json({ ok: true, message: "Event published" });
  } catch (err: any) {
    console.error("/api/rt/publish error", err);
    return res.status(500).json({ message: "Internal Server Error" });
  }
}