import { shows } from "@/data/shows";
import { Message, MessageTypeEnum } from "@/lib/types/conversation.type";
import { vapi } from "@/lib/vapi.sdk";
import React, { useEffect } from "react";
import { ShowsComponent } from "./shows";
import { Ticket } from "./ticket";
import type { AppShow } from "@/lib/types/show.type";

function Display() {
  const [showList, setShowList] = React.useState<Array<AppShow>>([]);

  const [status, setStatus] = React.useState<"show" | "confirm" | "ticket">(
    "show"
  );

  const [selectedShow, setSelectedShow] = React.useState<AppShow | null>(null);

  const [confirmDetails, setConfirmDetails] = React.useState<{}>();

  useEffect(() => {
    const onMessageUpdate = (message: Message) => {
      if (
        message.type === MessageTypeEnum.FUNCTION_CALL &&
        message.functionCall.name === "suggestShows"
      ) {
        setStatus("show");
        // Fetch from Redis-backed API; graceful fallback to static
        (async () => {
          try {
            const resp = await fetch(`/api/shows`);
            const json = await resp.json();
            const items: AppShow[] = Array.isArray(json?.items) ? json.items : [];
            const titles = items.map((s) => s.title);
            if (items.length > 0) {
              vapi.send({
                type: MessageTypeEnum.ADD_MESSAGE,
                message: {
                  role: "system",
                  content: `Here is the list of suggested shows: ${JSON.stringify(
                    titles
                  )}`,
                },
              });
              setShowList(items);
            } else {
              vapi.send({
                type: MessageTypeEnum.ADD_MESSAGE,
                message: {
                  role: "system",
                  content: `Here is the list of suggested shows: ${JSON.stringify(
                    shows.map((s) => s.title)
                  )}`,
                },
              });
              setShowList(shows as unknown as AppShow[]);
            }
          } catch (e) {
            console.warn("/api/shows failed, using static data", e);
            vapi.send({
              type: MessageTypeEnum.ADD_MESSAGE,
              message: {
                role: "system",
                content: `Here is the list of suggested shows: ${JSON.stringify(
                  shows.map((s) => s.title)
                )}`,
              },
            });
            setShowList(shows as unknown as AppShow[]);
          }
        })();
      } else if (
        message.type === MessageTypeEnum.FUNCTION_CALL &&
        (message.functionCall.name === "confirmDetails" ||
          message.functionCall.name === "bookTickets")
      ) {
        const params = message.functionCall.parameters;

        setConfirmDetails(params);
        console.log("parameters", params);

        const pool: AppShow[] = (showList?.length ? showList : (shows as unknown as AppShow[]));
        const result = pool.find(
          (show) => show.title.toLowerCase() == String(params.show || "").toLowerCase()
        );
        setSelectedShow(result ?? (pool[0] as any));

        setStatus(
          message.functionCall.name === "confirmDetails" ? "confirm" : "ticket"
        );
      }
    };

    const reset = () => {
      setStatus("show");
      setShowList([]);
      setSelectedShow(null);
    };

    vapi.on("message", onMessageUpdate);
    vapi.on("call-end", reset);
    return () => {
      vapi.off("message", onMessageUpdate);
      vapi.off("call-end", reset);
    };
  }, []);

  return (
    <>
      {showList.length > 0 && status == "show" ? (
        <ShowsComponent showList={showList} />
      ) : null}
      {status !== "show" ? (
        <Ticket
          type={status}
          show={
            (selectedShow ?? (showList[0] as AppShow) ?? (shows[0] as unknown as AppShow))
          }
          params={confirmDetails}
        />
      ) : null}
    </>
  );
}

export { Display };
