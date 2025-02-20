"use client";

import { AddSoupDialog } from "@/components/AddSoupDialog";
import { SoupTable } from "@/components/SoupTable";

export default function Home() {
  return (
    <div className="container mx-auto py-10">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold">Soep administratie</h1>
        <AddSoupDialog />
      </div>
      <SoupTable />
    </div>
  );
}
