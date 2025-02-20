"use client";

import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useEffect, useState } from "react";
import { SoupWithLocation, getSoups, deleteSoup } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";

export function SoupTable() {
  const [data, setData] = useState<SoupWithLocation[]>([]);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  useEffect(() => {
    getSoups().then(setData);
  }, []);

  async function handleDelete(id: number) {
    if (confirm("Weet je zeker dat je deze soep wilt verwijderen?")) {
      setDeletingId(id);
      try {
        await deleteSoup(id);
        setData(data.filter((soup) => soup.id !== id));
      } catch (error) {
        console.error("Error deleting soup:", error);
        alert("Er is een fout opgetreden bij het verwijderen van de soep.");
      } finally {
        setDeletingId(null);
      }
    }
  }

  const columns: ColumnDef<SoupWithLocation>[] = [
    {
      accessorKey: "naam",
      header: "Soep",
    },
    {
      accessorKey: "vegetarisch",
      header: "Vegetarisch",
      cell: ({ row }) => {
        return row.getValue("vegetarisch") ? "Ja" : "Nee";
      },
    },
    {
      accessorKey: "datum",
      header: "Datum",
      cell: ({ row }) => {
        return new Date(row.getValue("datum")).toLocaleDateString("nl-NL");
      },
    },
    {
      id: "locations",
      header: "Locaties & Prijzen",
      cell: ({ row }) => {
        const soup = row.original;
        return (
          <div className="space-y-1">
            {soup.locaties.map((loc) => (
              <div key={loc.location.naam}>
                {loc.location.naam}: €{loc.prijs.toFixed(2)}
              </div>
            ))}
          </div>
        );
      },
    },
    {
      id: "actions",
      cell: ({ row }) => (
        <Button
          variant="ghost"
          size="icon"
          onClick={() => handleDelete(row.original.id)}
          disabled={deletingId === row.original.id}
        >
          <Trash2 className="h-4 w-4 text-red-500" />
        </Button>
      ),
    },
  ];

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <TableHead key={header.id}>
                  {header.isPlaceholder
                    ? null
                    : flexRender(
                        header.column.columnDef.header,
                        header.getContext()
                      )}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows?.length ? (
            table.getRowModel().rows.map((row) => (
              <TableRow
                key={row.id}
                data-state={row.getIsSelected() && "selected"}
              >
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={columns.length} className="h-24 text-center">
                Geen soepen gevonden.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
