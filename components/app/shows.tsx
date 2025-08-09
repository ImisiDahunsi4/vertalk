import React from "react";
import type { AppShow } from "@/lib/types/show.type";

interface ShowsComponentProps {
  showList: Array<AppShow>;
}

function ShowsComponent({ showList = [] }: ShowsComponentProps) {
  return (
    <div className="flex gap-8 py-4">
      {showList.map((show) => (
        <div key={show.title}>
          <img
            className="h-auto my-4 w-full rounded-lg object-cover transition-all hover:scale-105 aspect-[3/4]"
            src={show.img}
            alt={show.title}
          />
          <h2 className="text-xl font-bold">{show.title}</h2>
          <p className="text-gray-500 font-bold"> {show.theatre}</p>
          {/* <p className="text-gray-500">{show.date.toLocaleString()}</p> */}
          <p className="text-gray-500">$ {show.price}</p>
        </div>
      ))}
    </div>
  );
}

export { ShowsComponent };
