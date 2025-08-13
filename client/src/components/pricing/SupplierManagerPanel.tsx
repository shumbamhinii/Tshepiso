import React, { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Trash2, Plus, Save, X, Edit3 } from "lucide-react";
import type { CatalogItem } from "@/types/pricing";

export type SupplierManagerPanelProps = {
  catalogsBySupplier: Record<string, CatalogItem[]>;
  onUpsertItems: (supplier: string, items: CatalogItem[]) => void;
  onDeleteItem: (supplier: string, id: string) => void;
  onRenameSupplier?: (oldName: string, newName: string) => void;
  onMergeUpload?: (supplier: string, file: File) => void; // optional: reuse your parseFile outside
};

const uid = () => Math.random().toString(36).slice(2, 9);

export default function SupplierManagerPanel({
  catalogsBySupplier,
  onUpsertItems,
  onDeleteItem,
  onRenameSupplier,
  onMergeUpload
}: SupplierManagerPanelProps) {
  const suppliers = useMemo(
    () => Object.keys(catalogsBySupplier).sort((a,b)=>a.localeCompare(b)),
    [catalogsBySupplier]
  );

  const [activeSupplier, setActiveSupplier] = useState<string>(suppliers[0] || "");
  const [q, setQ] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Partial<CatalogItem> | null>(null);
  const [renaming, setRenaming] = useState(false);
  const [newSupplierName, setNewSupplierName] = useState("");

  const list = catalogsBySupplier[activeSupplier] || [];
  const filtered = q
    ? list.filter(it =>
        [it.productName, it.sku, it.unit].some(
          s => (s || "").toLowerCase().includes(q.toLowerCase())
        )
      )
    : list;

  const beginEdit = (row: CatalogItem) => {
    setEditingId(row.id);
    setDraft({ ...row });
  };
  const cancelEdit = () => {
    setEditingId(null);
    setDraft(null);
  };
  const saveEdit = () => {
    if (!editingId || !draft) return;
    const updated = list.map(it => (it.id === editingId ? { ...(it as any), ...draft } : it));
    onUpsertItems(activeSupplier, updated as any);
    setEditingId(null);
    setDraft(null);
  };

  const addRow = () => {
    const newRow: CatalogItem = {
      id: uid(),
      supplierName: activeSupplier || "Unknown Supplier",
      sku: "",
      productName: "",
      unit: "",
      price: 0,
      currency: "ZAR",
    };
    onUpsertItems(activeSupplier || "Unknown Supplier", [...list, newRow]);
    setEditingId(newRow.id);
    setDraft({ ...newRow });
  };

  const doRenameSupplier = () => {
    if (!onRenameSupplier || !newSupplierName.trim() || !activeSupplier) {
      setRenaming(false);
      return;
    }
    onRenameSupplier(activeSupplier, newSupplierName.trim());
    setActiveSupplier(newSupplierName.trim());
    setRenaming(false);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
      {/* Left: suppliers */}
      <Card className="p-4 lg:col-span-1">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-medium">Suppliers</h3>
          {activeSupplier && onRenameSupplier && (
            <Button variant="outline" size="sm" onClick={() => {
              setNewSupplierName(activeSupplier);
              setRenaming(true);
            }}>
              Rename
            </Button>
          )}
        </div>

        <div className="space-y-1 max-h-[55vh] overflow-auto">
          {suppliers.length ? suppliers.map(name => (
            <button
              key={name}
              onClick={() => setActiveSupplier(name)}
              className={`w-full text-left px-3 py-2 rounded-md border ${
                name === activeSupplier ? "bg-accent border-accent-foreground/10" : "bg-background"
              }`}
            >
              {name}
            </button>
          )) : <div className="text-sm text-muted-foreground">No suppliers yet — upload a list.</div>}
        </div>

        {renaming && (
          <div className="mt-4 space-y-2">
            <Label>New supplier name</Label>
            <Input value={newSupplierName} onChange={(e)=>setNewSupplierName(e.target.value)} />
            <div className="flex gap-2">
              <Button size="sm" onClick={doRenameSupplier}><Save className="w-4 h-4 mr-1" /> Save</Button>
              <Button variant="secondary" size="sm" onClick={()=>setRenaming(false)}><X className="w-4 h-4 mr-1" /> Cancel</Button>
            </div>
          </div>
        )}
      </Card>

      {/* Right: product table */}
      <Card className="p-4 lg:col-span-4">
        <div className="flex flex-wrap items-center gap-3 justify-between mb-3">
          <h3 className="font-medium">{activeSupplier || "No supplier selected"}</h3>
          <div className="flex items-center gap-2">
            <Input placeholder="Search in supplier…" value={q} onChange={(e)=>setQ(e.target.value)} />
            <Button onClick={addRow}><Plus className="w-4 h-4 mr-1" /> Add</Button>
            {onMergeUpload && (
              <label className="cursor-pointer">
                <span className="px-3 py-2 border rounded-md inline-block">Merge Upload</span>
                <input type="file" className="hidden" accept=".csv,.xlsx,.xls"
                  onChange={(e)=>{
                    const f = e.target.files?.[0];
                    if (f && activeSupplier) onMergeUpload(activeSupplier, f);
                    (e.target as HTMLInputElement).value = "";
                  }}/>
              </label>
            )}
          </div>
        </div>

        <div className="overflow-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-muted">
              <tr>
                <th className="p-2 text-left">SKU</th>
                <th className="p-2 text-left">Product</th>
                <th className="p-2 text-left">Unit</th>
                <th className="p-2 text-right">Price</th>
                <th className="p-2 text-left">Currency</th>
                <th className="p-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(row => {
                const isEditing = editingId === row.id;
                return (
                  <tr key={row.id} className="border-b last:border-0">
                    <td className="p-2">
                      {isEditing ? (
                        <Input value={draft?.sku || ""} onChange={(e)=>setDraft(d=>({...d!, sku:e.target.value}))}/>
                      ) : row.sku}
                    </td>
                    <td className="p-2">
                      {isEditing ? (
                        <Input value={draft?.productName || ""} onChange={(e)=>setDraft(d=>({...d!, productName:e.target.value}))}/>
                      ) : row.productName}
                    </td>
                    <td className="p-2">
                      {isEditing ? (
                        <Input value={draft?.unit || ""} onChange={(e)=>setDraft(d=>({...d!, unit:e.target.value}))}/>
                      ) : (row.unit || "")}
                    </td>
                    <td className="p-2 text-right">
                      {isEditing ? (
                        <Input type="number" inputMode="decimal"
                          value={String(draft?.price ?? row.price ?? 0)}
                          onChange={(e)=>setDraft(d=>({...d!, price: parseFloat(e.target.value || "0")}))}/>
                      ) : (row.price ?? 0).toFixed(2)}
                    </td>
                    <td className="p-2">
                      {isEditing ? (
                        <Input value={draft?.currency || row.currency || "ZAR"}
                          onChange={(e)=>setDraft(d=>({...d!, currency:e.target.value}))}/>
                      ) : (row.currency || "ZAR")}
                    </td>
                    <td className="p-2 text-right">
                      {!isEditing ? (
                        <div className="flex gap-2 justify-end">
                          <Button variant="secondary" size="sm" onClick={()=>beginEdit(row)}><Edit3 className="w-4 h-4 mr-1" /> Edit</Button>
                          <Button variant="destructive" size="sm" onClick={()=>onDeleteItem(activeSupplier, row.id)}><Trash2 className="w-4 h-4 mr-1" /> Delete</Button>
                        </div>
                      ) : (
                        <div className="flex gap-2 justify-end">
                          <Button size="sm" onClick={saveEdit}><Save className="w-4 h-4 mr-1" /> Save</Button>
                          <Button variant="secondary" size="sm" onClick={cancelEdit}><X className="w-4 h-4 mr-1" /> Cancel</Button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {!list.length && (
            <div className="p-6 text-center text-muted-foreground">
              {activeSupplier ? "This supplier has no items yet — upload/merge or add manually." : "Pick a supplier on the left."}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
