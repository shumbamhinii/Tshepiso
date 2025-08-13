import React, { useMemo, useState } from "react";
import Fuse from "fuse.js";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Download } from "lucide-react";

type CatalogRow = {
  id: string;
  supplierName: string;
  sku?: string;
  productName: string;
  unit?: string;
  price: number;
  currency?: string;
};

type Props = {
  catalogsBySupplier: Record<string, CatalogRow[]>;
};

const canon = (s: any) =>
  String(s ?? "")
    .toLowerCase()
    .replace(/[×x]/g, " ")
    .replace(/[*\-_/(),.]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

export default function AllCatalogsView({ catalogsBySupplier }: Props) {
  const [q, setQ] = useState("");
  const [supplierFilter, setSupplierFilter] = useState<string>("");

  const suppliers = useMemo(
    () => Object.keys(catalogsBySupplier).sort((a, b) => a.localeCompare(b)),
    [catalogsBySupplier]
  );

  const allRows: CatalogRow[] = useMemo(() => {
    const out: CatalogRow[] = [];
    for (const s of Object.keys(catalogsBySupplier)) {
      (catalogsBySupplier[s] || []).forEach((r) =>
        out.push({
          id: r.id,
          supplierName: r.supplierName || s,
          sku: r.sku || "",
          productName: r.productName || "",
          unit: r.unit || "",
          price: Number(r.price || 0),
          currency: r.currency || "ZAR",
        })
      );
    }
    return out;
  }, [catalogsBySupplier]);

  const fuse = useMemo(() => {
    if (!allRows.length) return null;
    return new Fuse(
      allRows.map((r) => ({ ...r, _key: `${r.supplierName}|${r.sku}|${r.productName}` })),
      {
        threshold: 0.5,
        distance: 200,
        ignoreLocation: true,
        keys: [
          { name: "productName", weight: 0.65 } as any,
          { name: "sku", weight: 0.25 } as any,
          { name: "supplierName", weight: 0.1 } as any,
        ],
      }
    );
  }, [allRows]);

  const filtered = useMemo(() => {
    let rows = allRows;
    if (supplierFilter) {
      rows = rows.filter((r) => r.supplierName === supplierFilter);
    }
    if (q.trim() && fuse) {
      const r = fuse.search(canon(q), { limit: 2000 }); // generous cap
      const ids = new Set(r.map((x) => x.item.id));
      rows = rows.filter((x) => ids.has(x.id));
    }
    return rows;
  }, [allRows, supplierFilter, q, fuse]);

  const exportCSV = () => {
    const header = "Supplier,SKU,Product,Unit,Price,Currency";
    const lines = filtered.map((r) =>
      [
        r.supplierName,
        r.sku || "",
        JSON.stringify(r.productName ?? "").replace(/"/g, '""'),
        r.unit || "",
        (r.price ?? 0).toFixed(2),
        r.currency || "ZAR",
      ].join(",")
    );
    const csv = [header, ...lines].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "all_products.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Card className="p-4 space-y-4">
      <div className="flex flex-wrap items-end gap-3 justify-between">
        <div className="space-y-2">
          <Label className="text-sm">Search all products</Label>
          <div className="flex gap-2">
            <Input
              placeholder="Search by product, SKU, supplier…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="min-w-[260px]"
            />
            <select
              className="border rounded px-3 py-2 bg-background"
              value={supplierFilter}
              onChange={(e) => setSupplierFilter(e.target.value)}
            >
              <option value="">All suppliers</option>
              {suppliers.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <div className="text-xs text-muted-foreground">
            {filtered.length.toLocaleString()} of {allRows.length.toLocaleString()} items
            {supplierFilter ? ` · ${supplierFilter}` : ""}
          </div>
        </div>
        <Button variant="secondary" onClick={exportCSV}>
          <Download className="w-4 h-4 mr-2" />
          Export
        </Button>
      </div>

      <div className="overflow-auto">
        <table className="min-w-full text-xs md:text-sm">
          <thead className="sticky top-0 bg-background border-b">
            <tr>
              <th className="text-left p-2">Supplier</th>
              <th className="text-left p-2">SKU</th>
              <th className="text-left p-2">Product</th>
              <th className="text-left p-2">Unit</th>
              <th className="text-right p-2">Price</th>
              <th className="text-left p-2">Currency</th>
            </tr>
          </thead>
          <tbody className="[&>tr:nth-child(even)]:bg-muted/30">
            {filtered.map((r) => (
              <tr key={r.id} className="border-b last:border-0">
                <td className="p-2">{r.supplierName}</td>
                <td className="p-2">{r.sku || ""}</td>
                <td className="p-2">{r.productName}</td>
                <td className="p-2">{r.unit || ""}</td>
                <td className="p-2 text-right">{(r.price ?? 0).toFixed(2)}</td>
                <td className="p-2">{r.currency || "ZAR"}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {!allRows.length && (
          <div className="p-6 text-center text-muted-foreground">
            No products yet — upload supplier lists to populate your catalog.
          </div>
        )}
      </div>
    </Card>
  );
}
