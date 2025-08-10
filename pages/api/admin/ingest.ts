import type { NextApiRequest, NextApiResponse } from "next";
import { ingestInputs, type IngestInput } from "@/lib/kb";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method Not Allowed" });
  }

  try {
    const { companyId, inputs } = req.body || {};
    if (!companyId || !Array.isArray(inputs) || inputs.length === 0) {
      return res.status(400).json({ message: "Missing companyId or inputs[]" });
    }
    const valid: IngestInput[] = [];
    for (const it of inputs) {
      if (it && typeof it.title === "string" && typeof it.text === "string" && it.text.trim().length > 0) {
        valid.push({ title: it.title, text: it.text, source: it.source || "manual" });
      }
    }
    if (valid.length === 0) return res.status(400).json({ message: "No valid inputs" });

    const result = await ingestInputs(companyId, valid);
    return res.status(200).json({ ok: true, ...result });
  } catch (err: any) {
    console.error("/api/admin/ingest error", err);
    return res.status(500).json({ message: "Internal Server Error" });
  }
}
