"use client";

import { useState } from "react";
import { HeaderList } from "./components/header-list";
import { CreateHeader } from "./components/create-header";
import { EditHeader } from "./components/edit-header";
import { Tag } from "lucide-react";

export default function RfidTaggingPage() {
  const [view, setView] = useState<"list" | "create" | "edit">("list");
  const [selectedId, setSelectedId] = useState<number | null>(null);

  return (
    <div className="flex flex-col gap-6 p-8 max-w-7xl mx-auto w-full bg-background">
      <div className="flex items-center gap-3 mb-2">
        <div className="bg-primary p-2 rounded-lg shadow-sm">
          <Tag className="h-6 w-6 text-white" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-foreground leading-tight">
            RFID Tagging Module
          </h2>
          <p className="text-xs text-muted-foreground font-medium">
            Inventory Management System
          </p>
        </div>
      </div>

      {view === "list" && (
        <HeaderList 
          onCreateNew={() => setView("create")} 
          onEdit={(id) => {
            setSelectedId(id);
            setView("edit");
          }}
        />
      )}
      {view === "create" && (
        <CreateHeader 
          onCancel={() => setView("list")} 
          onSuccess={(newId) => {
            if (newId) {
              setSelectedId(newId);
              setView("edit");
            } else {
              setView("list");
            }
          }} 
        />
      )}
      {view === "edit" && selectedId && (
        <EditHeader
          headerId={selectedId}
          onCancel={() => {
            setView("list");
            setSelectedId(null);
          }}
          onSuccess={() => {
            setView("list");
            setSelectedId(null);
          }}
        />
      )}
    </div>
  );
}
