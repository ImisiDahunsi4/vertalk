import type { NextApiRequest, NextApiResponse } from "next";
import { getRedisSubscriber } from "@/lib/redis";

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).end("Method Not Allowed");
  const callId = typeof req.query.callId === "string" ? req.query.callId : "";
  if (!callId) return res.status(400).end("Missing callId");

  try {
    const subscriber = await getRedisSubscriber();
    const channel = `ch:call:${callId}`;

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("Connection", "keep-alive");

    // Send initial comment to open stream
    res.write(`: connected to ${channel}\n\n`);

    const onMessage = (message: string) => {
      res.write(`data: ${message}\n\n`);
    };

    await subscriber.subscribe(channel, onMessage);

    const keepAlive = setInterval(() => {
      res.write(`: keepalive ${Date.now()}\n\n`);
    }, 25000);

    req.on("close", async () => {
      clearInterval(keepAlive);
      try {
        await subscriber.unsubscribe(channel, onMessage);
      } catch {}
      res.end();
    });
  } catch (err: any) {
    console.error("SSE subscribe error", err);
    return res.status(500).end("SSE setup failed");
  }
}
