// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";
import { getRedis } from "@/lib/redis";

function genId(prefix = "id") {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<any>
) {
  try {
    if (req.method === "POST") {
      const { message } = req.body;

      const { type = "function-call", functionCall = {}, call } = message;
      console.log("payload message", message);

      // Initialize Redis lazily; do not block if unavailable
      let client: any = null;
      try {
        client = await getRedis();
      } catch (e) {
        console.warn("Redis unavailable, continuing without it", e);
      }

      const callId = call?.id || call?.sid || call?.callId || genId("call");

      if (client) {
        const now = Date.now();
        const callDoc = {
          id: callId,
          status: "active",
          startedAt: now,
          lastMessageAt: now,
        };
        try {
          await client.sendCommand([
            "JSON.SET",
            `call:${callId}`,
            "$",
            JSON.stringify(callDoc),
          ]);
        } catch {}
      }

      if (type === "function-call") {
        const name = functionCall?.name;
        const parameters = functionCall?.parameters || {};

        if (client) {
          const event = {
            t: Date.now(),
            type: "function-call",
            name,
            parameters,
          };
          try {
            await client.sendCommand([
              "XADD",
              `stream:call:${callId}`,
              "*",
              "event",
              JSON.stringify(event),
            ]);
            await client.publish(`ch:call:${callId}`, JSON.stringify(event));
          } catch (e) {
            console.warn("Failed to write stream/publish", e);
          }

          // Persist ticket lifecycle events
          if (name === "confirmDetails" || name === "bookTickets") {
            const ticketId = parameters?.ticketId || genId("ticket");
            const ticketDoc = {
              id: ticketId,
              callId,
              showTitle: parameters?.show,
              date: parameters?.date,
              location: parameters?.location,
              numberOfTickets: parameters?.numberOfTickets,
              status: name === "bookTickets" ? "booked" : "pending",
              createdAt: Date.now(),
            };
            try {
              await client.sendCommand([
                "JSON.SET",
                `ticket:${ticketId}`,
                "$",
                JSON.stringify(ticketDoc),
              ]);
              await client.publish(
                `ch:call:${callId}`,
                JSON.stringify({ t: Date.now(), type: "ticket", ticket: ticketDoc })
              );
            } catch (e) {
              console.warn("Failed to persist ticket", e);
            }
          }
        }

        if (name === "suggestShows") {
          return res.status(201).json({
            result:
              "You can see the upcoming shows on the screen. Select which ones you want to choose.",
          });
        }

        return res.status(201).json({ data: functionCall?.parameters });
      }

      return res.status(201).json({});
    }

    return res.status(404).json({ message: "Not Found" });
  } catch (err) {
    return res.status(500).json({ message: "Internal Server Error" });
  }
}
