import type { NextApiRequest, NextApiResponse } from "next";
import { getRedis } from "@/lib/redis";

function defaultCompany() {
  return {
    id: "default",
    name: "Broadway Tickets",
    vertical: "broadway",
    brandVoice: "Friendly, concise, helpful",
    welcomeMessage: "Hi. I'm Paula, Welcome to Broadway Shows! How are you feeling today?",
    functionsEnabled: ["suggestShows", "confirmDetails", "bookTickets"],
    domainData: {},
    updatedAt: Date.now(),
  };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const client = await getRedis();

    if (req.method === "GET") {
      const companyId = typeof req.query.companyId === "string" ? req.query.companyId : null;
      let active = await client.get("currentCompany");
      if (!active) active = "default";
      const id = companyId || active;

      const key = `company:${id}`;
      let docStr: string | null = null;
      try {
        docStr = await client.sendCommand(["JSON.GET", key]);
      } catch {}

      let company = docStr ? JSON.parse(docStr) : null;
      if (!company && id === "default") {
        company = defaultCompany();
      }
      if (!company) return res.status(404).json({ message: "Company not found" });
      return res.status(200).json({ company, activeCompanyId: active });
    }

    if (req.method === "POST") {
      const {
        id,
        name,
        vertical,
        welcomeMessage,
        brandVoice,
        functionsEnabled = [],
        domainData = {},
        makeActive = true,
      } = req.body || {};

      if (!id || !name || !vertical || !welcomeMessage || !brandVoice) {
        return res.status(400).json({ message: "Missing required fields" });
      }

      const companyDoc = {
        id,
        name,
        vertical,
        brandVoice,
        welcomeMessage,
        functionsEnabled,
        domainData,
        updatedAt: Date.now(),
      };

      await client.sendCommand(["JSON.SET", `company:${id}`, "$", JSON.stringify(companyDoc)]);
      if (makeActive) {
        await client.set("currentCompany", id);
      }
      return res.status(200).json({ ok: true, company: companyDoc, activeCompanyId: makeActive ? id : await client.get("currentCompany") });
    }

    return res.status(405).json({ message: "Method Not Allowed" });
  } catch (err: any) {
    console.error("/api/admin/company error", err);
    return res.status(500).json({ message: "Internal Server Error" });
  }
}
