import { useEffect, useMemo, useState } from "react";
import { Inter } from "next/font/google";
import { Assistant } from "@/components/app/assistant";

const inter = Inter({ subsets: ["latin"] });

type Company = {
  id: string;
  name: string;
  vertical: string;
  welcomeMessage: string;
};

function getCopy(company?: Company) {
  const vertical = company?.vertical || "broadway";
  const name = company?.name || "Our";
  switch (vertical) {
    case "hotel":
      return {
        heading: `Welcome to ${name} Assistant`,
        subheading:
          "Talk with Paula to explore rooms, amenities, availability, and book your stay.",
      };
    case "events":
      return {
        heading: `Welcome to ${name} Assistant`,
        subheading:
          "Talk with Paula to plan events, compare venues and packages, and get a quote.",
      };
    case "marketing":
      return {
        heading: `Welcome to ${name} Assistant`,
        subheading:
          "Talk with Paula to explore services, industries, and tailored marketing plans.",
      };
    case "broadway":
    default:
      return {
        heading: "Welcome to Broadway Show Assistant",
        subheading:
          "Talk with Paula to explore upcoming shows and book tickets.",
      };
  }
}

export default function Home() {
  const [company, setCompany] = useState<Company | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/admin/company");
        if (res.ok) {
          const data = await res.json();
          setCompany(data.company as Company);
        }
      } catch {
        // ignore
      }
    })();
  }, []);

  const { heading, subheading } = useMemo(() => getCopy(company ?? undefined), [company]);

  return (
    <main
      className={`flex min-h-screen flex-col items-center justify-between p-12 ${inter.className}`}
    >
      <div className="text-center">
        <h1 className="text-3xl">{heading}</h1>
        <p className="text-slate-600">{subheading}</p>
        <div className="mt-4">
          <a
            href="/admin"
            className="inline-block bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
          >
            Open Admin
          </a>
        </div>
      </div>
      <Assistant />
    </main>
  );
}
