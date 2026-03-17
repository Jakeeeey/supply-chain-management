"use client";

import { Pencil } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";

import { EngineTypeApiRow } from "../types";

interface EngineTypeTableProps {
  data: EngineTypeApiRow[];
  loading: boolean;
  search: string;
  onEdit: (row: EngineTypeApiRow) => void;
}

export function EngineTypeTable({ data, loading, search, onEdit }: EngineTypeTableProps) {
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Description</TableHead>
            <TableHead className="w-20 text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <TableRow key={i}>
                <TableCell>
                  <Skeleton className="h-5 w-8" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-5 w-40" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-5 w-64" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-5 w-8 ml-auto" />
                </TableCell>
              </TableRow>
            ))
          ) : data.length === 0 ? (
            <TableRow>
              <TableCell colSpan={4} className="h-24 text-center">
                {search
                  ? "No engine types match your search."
                  : "No engine types found."}
              </TableCell>
            </TableRow>
          ) : (
            data.map((row) => (
              <TableRow key={row.id}>
                <TableCell className="font-medium">{row.name}</TableCell>
                <TableCell className="text-muted-foreground">
                  {row.description || "-"}
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onEdit(row)}
                  >
                    <Pencil className="mr-2 h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
