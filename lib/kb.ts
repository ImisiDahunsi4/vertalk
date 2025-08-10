import { getRedis } from "@/lib/redis";
import { EMBEDDING_DIM, embedText, float32ToBuffer } from "@/lib/embedding";

export type IngestInput = { title: string; text: string; source?: string };

export function chunkText(text: string, maxLen = 800): string[] {
  const out: string[] = [];
  let i = 0;
  while (i < text.length) {
    out.push(text.slice(i, i + maxLen));
    i += maxLen;
  }
  return out;
}

export async function ensureKbIndex(): Promise<void> {
  const client = await getRedis();
  const list = await client.sendCommand(["FT._LIST"]);
  const names: string[] = Array.isArray(list) ? list.map((x) => x.toString()) : [];
  if (names.includes("idx:kb")) return;
  // Create an index over HASH docs with key prefix kb:
  // Fields: companyId TAG, title TEXT, chunk TEXT, vector VECTOR HNSW
  await client.sendCommand([
    "FT.CREATE",
    "idx:kb",
    "ON",
    "HASH",
    "PREFIX",
    "1",
    "kb:",
    "SCHEMA",
    "companyId",
    "TAG",
    "title",
    "TEXT",
    "chunk",
    "TEXT",
    "vector",
    "VECTOR",
    "HNSW",
    "6",
    "TYPE",
    "FLOAT32",
    "DIM",
    EMBEDDING_DIM.toString(),
    "DISTANCE_METRIC",
    "COSINE",
  ]);
}

export async function ingestInputs(companyId: string, inputs: IngestInput[], onProgress?: (evt: any) => Promise<void> | void) {
  const client = await getRedis();
  await ensureKbIndex();

  const total = inputs.length;
  let processed = 0;

  for (const input of inputs) {
    const chunks = chunkText(input.text);
    for (const chunk of chunks) {
      const embedding = await embedText(chunk);
      const buf = float32ToBuffer(embedding);
      const docId = `kb:${companyId}:${Date.now()}:${Math.random().toString(36).slice(2, 8)}`;
      await client.hSet(docId, {
        companyId,
        title: input.title,
        chunk,
        source: input.source || "manual",
        createdAt: Date.now().toString(),
        vector: buf as unknown as any,
      } as any);
    }
    processed++;
    const evt = { type: "ingest-progress", companyId, processed, total, t: Date.now() };
    // Publish to existing SSE channel convention so UI can reuse /api/rt/subscribe
    await client.publish(`ch:call:ingest:${companyId}`, JSON.stringify(evt));
    await client.sendCommand([
      "XADD",
      `stream:call:ingest:${companyId}`,
      "*",
      "event",
      JSON.stringify(evt),
    ]);
    if (onProgress) await onProgress(evt);
  }

  const doneEvt = { type: "ingest-complete", companyId, processed: total, total, t: Date.now() };
  await client.publish(`ch:call:ingest:${companyId}`, JSON.stringify(doneEvt));
  await client.sendCommand([
    "XADD",
    `stream:call:ingest:${companyId}`,
    "*",
    "event",
    JSON.stringify(doneEvt),
  ]);

  return { processed: total };
}
