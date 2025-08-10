import { useEffect, useMemo, useRef, useState } from "react";

type CompanyDoc = {
  id: string;
  name: string;
  vertical: "broadway" | "hotel" | "events" | "marketing" | string;
  brandVoice: string;
  welcomeMessage: string;
  functionsEnabled: string[];
  domainData: any;
  updatedAt?: number;
};

type ApiCompanyResponse = {
  company: CompanyDoc;
  activeCompanyId: string;
};

function Section({ title, children }: { title: string; children: any }) {
  return (
    <section style={{ border: "1px solid #e5e7eb", borderRadius: 8, padding: 16, marginBottom: 16 }}>
      <h2 style={{ marginTop: 0 }}>{title}</h2>
      {children}
    </section>
  );
}

function Input({ label, value, onChange, placeholder, required }: any) {
  return (
    <label style={{ display: "block", marginBottom: 12 }}>
      <div style={{ fontSize: 12, color: "#374151", marginBottom: 4 }}>{label}{required ? " *" : ""}</div>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        style={{ width: "100%", padding: 8, border: "1px solid #d1d5db", borderRadius: 6 }}
      />
    </label>
  );
}

function TextArea({ label, value, onChange, placeholder, rows = 6, required }: any) {
  return (
    <label style={{ display: "block", marginBottom: 12 }}>
      <div style={{ fontSize: 12, color: "#374151", marginBottom: 4 }}>{label}{required ? " *" : ""}</div>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        required={required}
        style={{ width: "100%", padding: 8, border: "1px solid #d1d5db", borderRadius: 6 }}
      />
    </label>
  );
}

function Checkbox({ label, checked, onChange }: any) {
  return (
    <label style={{ display: "inline-flex", alignItems: "center", gap: 8, marginRight: 12 }}>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span>{label}</span>
    </label>
  );
}

function Button({ children, onClick, variant = "primary", disabled }: any) {
  const bg = variant === "danger" ? "#ef4444" : variant === "secondary" ? "#6b7280" : "#2563eb";
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        background: disabled ? "#9ca3af" : bg,
        color: "white",
        padding: "8px 14px",
        borderRadius: 6,
        border: "none",
        cursor: disabled ? "not-allowed" : "pointer",
      }}
    >
      {children}
    </button>
  );
}

export default function AdminPage() {
  const [loading, setLoading] = useState(false);
  const [activeCompanyId, setActiveCompanyId] = useState<string>("default");
  const [company, setCompany] = useState<CompanyDoc>({
    id: "default",
    name: "Broadway Tickets",
    vertical: "broadway",
    brandVoice: "Friendly, concise, helpful",
    welcomeMessage: "Hi. I'm Paula, Welcome to Broadway Shows! How are you feeling today?",
    functionsEnabled: ["suggestShows", "confirmDetails", "bookTickets"],
    domainData: {},
  });

  // Knowledge ingestion state
  const [ingestTitle, setIngestTitle] = useState("");
  const [ingestText, setIngestText] = useState("");
  const [ingestQueue, setIngestQueue] = useState<{ title: string; text: string }[]>([]);
  const [ingestMessages, setIngestMessages] = useState<string[]>([]);
  const eventSourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/admin/company`);
        if (res.ok) {
          const json: ApiCompanyResponse = await res.json();
          setCompany(json.company);
          setActiveCompanyId(json.activeCompanyId);
        }
      } catch (e) {
        console.error(e);
      }
    })();
  }, []);

  // Validation that enforces structure per vertical
  const verticalErrors = useMemo(() => {
    const errs: string[] = [];
    if (!company.id) errs.push("Company ID is required");
    if (!company.name) errs.push("Company name is required");
    if (!company.vertical) errs.push("Vertical is required");
    if (!company.brandVoice) errs.push("Brand voice is required");
    if (!company.welcomeMessage) errs.push("Welcome message is required");

    const dd = company.domainData || {};
    if (company.vertical === "hotel") {
      if (!dd.propertyName) errs.push("Hotel: propertyName is required");
      if (!Array.isArray(dd.locations) || dd.locations.length === 0) errs.push("Hotel: at least one location is required");
      if (!Array.isArray(dd.roomTypes) || dd.roomTypes.length === 0) errs.push("Hotel: at least one room type is required");
      if (!Array.isArray(dd.amenities) || dd.amenities.length === 0) errs.push("Hotel: at least one amenity is required");
      if (!dd.policies || !dd.policies.checkIn || !dd.policies.checkOut) errs.push("Hotel: policies.checkIn and policies.checkOut required");
    } else if (company.vertical === "events") {
      if (!Array.isArray(dd.eventTypes) || dd.eventTypes.length === 0) errs.push("Events: at least one event type is required");
      if (!Array.isArray(dd.venues) || dd.venues.length === 0) errs.push("Events: at least one venue is required");
      if (!Array.isArray(dd.packages) || dd.packages.length === 0) errs.push("Events: at least one package is required");
    } else if (company.vertical === "marketing") {
      if (!Array.isArray(dd.services) || dd.services.length === 0) errs.push("Marketing: at least one service is required");
      if (!Array.isArray(dd.industries) || dd.industries.length === 0) errs.push("Marketing: at least one industry is required");
    }

    return errs;
  }, [company]);

  const isValid = verticalErrors.length === 0;

  const saveCompany = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/company", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...company, makeActive: true }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || "Failed to save company");
      setActiveCompanyId(json.activeCompanyId);
      alert("Company saved and set active");
    } catch (e: any) {
      alert(e.message || "Failed to save");
    } finally {
      setLoading(false);
    }
  };

  const addToIngestQueue = () => {
    if (!ingestTitle || !ingestText) return;
    setIngestQueue((prev) => [...prev, { title: ingestTitle, text: ingestText }]);
    setIngestTitle("");
    setIngestText("");
  };

  const startIngestion = async () => {
    if (ingestQueue.length === 0) return;
    setIngestMessages([]);
    // open SSE for progress
    if (eventSourceRef.current) eventSourceRef.current.close();
    const es = new EventSource(`/api/rt/subscribe?callId=${encodeURIComponent(`ingest:${company.id}`)}`);
    es.onmessage = (ev) => {
      if (ev.data.startsWith("keepalive")) return;
      try {
        const msg = JSON.parse(ev.data);
        setIngestMessages((prev) => [...prev, JSON.stringify(msg)]);
      } catch {}
    };
    es.onerror = () => {
      es.close();
    };
    eventSourceRef.current = es;

    try {
      const res = await fetch("/api/admin/ingest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyId: company.id, inputs: ingestQueue }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || "Failed to ingest");
      alert(`Ingested ${json.processed} items`);
      setIngestQueue([]);
    } catch (e: any) {
      alert(e.message || "Failed to ingest");
    }
  };

  const testSearch = async (query: string, type: "vector" | "text") => {
    const res = await fetch(`/api/kb/search?companyId=${encodeURIComponent(company.id)}&q=${encodeURIComponent(query)}&type=${type}&k=5`);
    const json = await res.json();
    return json.items || [];
  };

  const resetSoft = async () => {
    const res = await fetch("/api/admin/reset", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mode: "soft" }) });
    const json = await res.json();
    if (res.ok) {
      setActiveCompanyId(json.activeCompanyId);
      alert("Reset to default (soft)");
    } else {
      alert(json.message || "Failed to reset");
    }
  };

  const resetHard = async () => {
    if (!confirm("This will delete the custom company KB and config. Continue?")) return;
    const res = await fetch("/api/admin/reset", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mode: "hard", companyId: company.id }) });
    const json = await res.json();
    if (res.ok) {
      setActiveCompanyId(json.activeCompanyId);
      alert("Hard reset complete; active set to default");
    } else {
      alert(json.message || "Failed to hard reset");
    }
  };

  // Render vertical-specific domainData form controls
  const DomainForm = () => {
    const dd = company.domainData || {};

    const setDD = (next: any) => setCompany((c) => ({ ...c, domainData: next }));

    if (company.vertical === "hotel") {
      const [locations, roomTypes, amenities] = [dd.locations || [], dd.roomTypes || [], dd.amenities || []];
      return (
        <>
          <Input label="Property Name" required value={dd.propertyName || ""} onChange={(v: string) => setDD({ ...dd, propertyName: v })} />
          <Input label="Locations (comma-separated)" required value={locations.join(", ")} onChange={(v: string) => setDD({ ...dd, locations: v.split(/\s*,\s*/).filter(Boolean) })} />
          <Input label="Room Types (comma-separated)" required value={roomTypes.join(", ")} onChange={(v: string) => setDD({ ...dd, roomTypes: v.split(/\s*,\s*/).filter(Boolean) })} />
          <Input label="Amenities (comma-separated)" required value={amenities.join(", ")} onChange={(v: string) => setDD({ ...dd, amenities: v.split(/\s*,\s*/).filter(Boolean) })} />
          <Input label="Policy: Check-in" required value={dd.policies?.checkIn || ""} onChange={(v: string) => setDD({ ...dd, policies: { ...(dd.policies || {}), checkIn: v } })} />
          <Input label="Policy: Check-out" required value={dd.policies?.checkOut || ""} onChange={(v: string) => setDD({ ...dd, policies: { ...(dd.policies || {}), checkOut: v } })} />
          <Input label="Policy: Cancellation" value={dd.policies?.cancellation || ""} onChange={(v: string) => setDD({ ...dd, policies: { ...(dd.policies || {}), cancellation: v } })} />
        </>
      );
    }
    if (company.vertical === "events") {
      const [eventTypes, venues, packages] = [dd.eventTypes || [], dd.venues || [], dd.packages || []];
      return (
        <>
          <Input label="Event Types (comma-separated)" required value={eventTypes.join(", ")} onChange={(v: string) => setDD({ ...dd, eventTypes: v.split(/\s*,\s*/).filter(Boolean) })} />
          <Input label="Venues (comma-separated)" required value={venues.join(", ")} onChange={(v: string) => setDD({ ...dd, venues: v.split(/\s*,\s*/).filter(Boolean) })} />
          <Input label="Packages (comma-separated)" required value={packages.join(", ")} onChange={(v: string) => setDD({ ...dd, packages: v.split(/\s*,\s*/).filter(Boolean) })} />
          <TextArea label="Pricing Rules (JSON)" value={dd.pricingRules ? JSON.stringify(dd.pricingRules, null, 2) : ""} onChange={(v: string) => {
            try { setDD({ ...dd, pricingRules: JSON.parse(v) }); } catch { /* ignore */ }
          }} />
        </>
      );
    }
    if (company.vertical === "marketing") {
      const [services, industries] = [dd.services || [], dd.industries || []];
      return (
        <>
          <Input label="Services (comma-separated)" required value={services.join(", ")} onChange={(v: string) => setDD({ ...dd, services: v.split(/\s*,\s*/).filter(Boolean) })} />
          <Input label="Industries (comma-separated)" required value={industries.join(", ")} onChange={(v: string) => setDD({ ...dd, industries: v.split(/\s*,\s*/).filter(Boolean) })} />
          <TextArea label="Case Studies (one per line)" value={(dd.caseStudies || []).join("\n")} onChange={(v: string) => setDD({ ...dd, caseStudies: v.split(/\n/).filter(Boolean) })} />
        </>
      );
    }

    // Default/broadway: keep minimal
    return <div style={{ color: "#6b7280", fontSize: 12 }}>No additional fields required for this vertical.</div>;
  };

  return (
    <div style={{ maxWidth: 980, margin: "20px auto", padding: "0 16px" }}>
      <h1 style={{ marginBottom: 8 }}>Admin: Assistant Configuration</h1>
      <div style={{ color: "#6b7280", marginBottom: 16 }}>Active Company: <strong>{activeCompanyId}</strong></div>

      <Section title="Company Profile">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Input label="Company ID" required value={company.id} onChange={(v: string) => setCompany({ ...company, id: v })} />
          <Input label="Company Name" required value={company.name} onChange={(v: string) => setCompany({ ...company, name: v })} />
          <label style={{ display: "block" }}>
            <div style={{ fontSize: 12, color: "#374151", marginBottom: 4 }}>Vertical *</div>
            <select
              value={company.vertical}
              onChange={(e) => setCompany({ ...company, vertical: e.target.value })}
              style={{ width: "100%", padding: 8, border: "1px solid #d1d5db", borderRadius: 6 }}
            >
              <option value="broadway">Broadway</option>
              <option value="hotel">Hotel</option>
              <option value="events">Events</option>
              <option value="marketing">Marketing</option>
            </select>
          </label>
          <Input label="Brand Voice" required value={company.brandVoice} onChange={(v: string) => setCompany({ ...company, brandVoice: v })} />
        </div>
        <TextArea label="Welcome Message" required value={company.welcomeMessage} onChange={(v: string) => setCompany({ ...company, welcomeMessage: v })} />
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 12, color: "#374151", marginBottom: 6 }}>Functions Enabled</div>
          {[
            "suggestShows",
            "confirmDetails",
            "bookTickets",
            // Future vertical-specific tools can be toggled here
          ].map((f) => (
            <Checkbox
              key={f}
              label={f}
              checked={company.functionsEnabled.includes(f)}
              onChange={(checked: boolean) =>
                setCompany((c) => ({
                  ...c,
                  functionsEnabled: checked
                    ? Array.from(new Set([...(c.functionsEnabled || []), f]))
                    : (c.functionsEnabled || []).filter((x) => x !== f),
                }))
              }
            />
          ))}
        </div>
        <Section title="Domain Data (by vertical)">
          <DomainForm />
        </Section>
        {verticalErrors.length > 0 && (
          <div style={{ color: "#b91c1c", marginBottom: 12 }}>
            {verticalErrors.map((e, idx) => (
              <div key={idx}>• {e}</div>
            ))}
          </div>
        )}
        <div style={{ display: "flex", gap: 8 }}>
          <Button onClick={saveCompany} disabled={!isValid || loading}>Save & Set Active</Button>
        </div>
      </Section>

      <Section title="Knowledge Ingestion">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Input label="Title" value={ingestTitle} onChange={setIngestTitle} placeholder="e.g., FAQs" />
          <div />
        </div>
        <TextArea label="Text" value={ingestText} onChange={setIngestText} rows={8} placeholder="Paste knowledge text here..." />
        <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
          <Button variant="secondary" onClick={addToIngestQueue} disabled={!ingestTitle || !ingestText}>Add to Queue</Button>
          <Button onClick={startIngestion} disabled={ingestQueue.length === 0}>Start Ingestion</Button>
        </div>
        {ingestQueue.length > 0 && (
          <div style={{ fontSize: 12, color: "#374151", marginBottom: 12 }}>Queued items: {ingestQueue.length}</div>
        )}
        <div>
          <div style={{ fontSize: 12, color: "#374151", marginBottom: 6 }}>Ingestion Progress</div>
          <pre style={{ background: "#f9fafb", padding: 12, borderRadius: 6, maxHeight: 240, overflow: "auto" }}>
            {ingestMessages.join("\n") || "(no messages yet)"}
          </pre>
        </div>
      </Section>

      <Section title="Test Knowledge Search">
        <TestSearch companyId={company.id} onSearch={testSearch} />
      </Section>

      <Section title="Reset to Default">
        <div style={{ display: "flex", gap: 8 }}>
          <Button variant="secondary" onClick={resetSoft}>Reset to Default (Soft)</Button>
          <Button variant="danger" onClick={resetHard}>Hard Reset (Delete Company KB & Config)</Button>
        </div>
      </Section>
    </div>
  );
}

function TestSearch({ companyId, onSearch }: { companyId: string; onSearch: (q: string, type: "vector" | "text") => Promise<any[]> }) {
  const [q, setQ] = useState("");
  const [items, setItems] = useState<any[]>([]);
  const [mode, setMode] = useState<"vector" | "text">("vector");

  const run = async () => {
    const res = await onSearch(q, mode);
    setItems(res);
  };

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 140px 120px", gap: 8, alignItems: "center" }}>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search query..." style={{ width: "100%", padding: 8, border: "1px solid #d1d5db", borderRadius: 6 }} />
        <select value={mode} onChange={(e) => setMode(e.target.value as any)} style={{ padding: 8, border: "1px solid #d1d5db", borderRadius: 6 }}>
          <option value="vector">Vector</option>
          <option value="text">Text</option>
        </select>
        <Button onClick={run}>Search</Button>
      </div>
      <div style={{ marginTop: 12 }}>
        {items.length === 0 ? (
          <div style={{ color: "#6b7280", fontSize: 12 }}>(no results)</div>
        ) : (
          <div style={{ display: "grid", gap: 12 }}>
            {items.map((it, idx) => (
              <div key={idx} style={{ border: "1px solid #e5e7eb", borderRadius: 6, padding: 12 }}>
                <div style={{ fontWeight: 600 }}>{it.title || "(untitled)"}</div>
                {typeof it.score === "number" && (
                  <div style={{ color: "#6b7280", fontSize: 12 }}>score: {it.score.toFixed(4)}</div>
                )}
                <div style={{ whiteSpace: "pre-wrap", marginTop: 6 }}>{it.chunk}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
