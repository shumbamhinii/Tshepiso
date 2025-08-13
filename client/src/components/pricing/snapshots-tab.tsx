// components/SnapshotsTab.tsx
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { PricingSnapshot } from "@/types/pricing";
import { Camera, Plus, Download, Upload, Trash2, Eye, Calendar, ClipboardList, Eraser } from "lucide-react";
import { useState } from "react";

interface SnapshotsTabProps {
  snapshots: PricingSnapshot[];
  onSnapshotsChange: (snapshots: PricingSnapshot[]) => void;
  onLoadSnapshot?: (snapshot: PricingSnapshot) => void;
  // ⬇️ extended: pass options (saveOnlyInStock) to parent
  onCreateSnapshot?: (
    name: string,
    description?: string,
    options?: { saveOnlyInStock: boolean }
  ) => void;
  onDeleteSnapshot: (snapshotId: number) => void;
  onSelectForQuotations: (snapshotId: number) => void;
  onClearSnapshot?: () => void;
}

export default function SnapshotsTab({
  snapshots,
  onSnapshotsChange,
  onLoadSnapshot,
  onCreateSnapshot,
  onDeleteSnapshot,
  onSelectForQuotations,
  onClearSnapshot
}: SnapshotsTabProps) {
  const [newSnapshot, setNewSnapshot] = useState({ name: "", description: "" });
  const [selectedSnapshot, setSelectedSnapshot] = useState<PricingSnapshot | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // ⬇️ NEW: default ON
  const [saveOnlyInStock, setSaveOnlyInStock] = useState<boolean>(true);

  const handleCreateSnapshot = () => {
    if (newSnapshot.name && onCreateSnapshot) {
      onCreateSnapshot(newSnapshot.name, newSnapshot.description, { saveOnlyInStock });
      setNewSnapshot({ name: "", description: "" });
    }
  };

  const removeSnapshot = (id: number) => {
    onDeleteSnapshot(id);
  };

  const exportSnapshot = (snapshot: PricingSnapshot) => {
    const dataStr = JSON.stringify(snapshot, null, 2);
    const dataUri = "data:application/json;charset=utf-8," + encodeURIComponent(dataStr);
    const exportFileDefaultName = `pricing-snapshot-${snapshot.name.replace(/\s+/g, "-")}.json`;

    const linkElement = document.createElement("a");
    linkElement.setAttribute("href", dataUri);
    linkElement.setAttribute("download", exportFileDefaultName);
    linkElement.click();
  };

  return (
    <div className="slide-in">
      {/* Header */}
      <div className="bg-card border-b border-border px-8 py-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-card-foreground">Snapshot Manager</h2>
            <p className="text-muted-foreground mt-1">Save and manage different pricing configurations</p>
          </div>
          <div className="flex items-center space-x-3">
            {onClearSnapshot && (
              <Button variant="outline" size="sm" onClick={onClearSnapshot}>
                <Eraser className="w-4 h-4 mr-2" />
                Clear Loaded Snapshot
              </Button>
            )}
            <Button variant="ghost" size="sm">
              <Upload className="w-4 h-4 mr-2" />
              Import Snapshot
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-8">
        <div className="max-w-6xl mx-auto space-y-8">
          {/* Create Snapshot */}
          <Card className="pricing-form-section">
            <CardHeader>
              <CardTitle className="flex items-center text-lg">
                <Plus className="w-5 h-5 mr-2 text-primary" />
                Create New Snapshot
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="snapshot-name">Snapshot Name</Label>
                  <Input
                    id="snapshot-name"
                    value={newSnapshot.name}
                    onChange={(e) => setNewSnapshot({ ...newSnapshot, name: e.target.value })}
                    placeholder="e.g., Q1 2024 Pricing"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="snapshot-description">Description</Label>
                  <Input
                    id="snapshot-description"
                    value={newSnapshot.description}
                    onChange={(e) => setNewSnapshot({ ...newSnapshot, description: e.target.value })}
                    placeholder="Brief description of this snapshot"
                    className="mt-1"
                  />
                </div>
              </div>

              {/* ⬇️ NEW: control */}
              <label className="inline-flex items-center gap-2">
                <input
                  type="checkbox"
                  className="h-4 w-4"
                  checked={saveOnlyInStock}
                  onChange={(e) => setSaveOnlyInStock(e.target.checked)}
                />
                <span>Save only in‑stock items (recommended)</span>
              </label>

              <Button onClick={handleCreateSnapshot} disabled={!newSnapshot.name}>
                <Camera className="w-4 h-4 mr-2" />
                Create Snapshot
              </Button>
            </CardContent>
          </Card>

          {/* Snapshots List */}
          {snapshots.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {snapshots.map((snapshot) => (
                <Card key={snapshot.id} className="pricing-form-section">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{snapshot.name}</CardTitle>
                      <Badge variant="secondary">
                        <Calendar className="w-3 h-3 mr-1" />
                        {new Date(snapshot.createdAt).toLocaleDateString()}
                      </Badge>
                    </div>
                    {snapshot.description && <CardDescription>{snapshot.description}</CardDescription>}
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">Products:</span>
                          <span className="ml-2 font-medium">{snapshot.productsCount || 0}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Revenue:</span>
                          <span className="ml-2 font-medium">R{(snapshot.revenue ?? 0).toFixed(2)}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Total Cost:</span>
                          <span className="ml-2 font-medium">R{(snapshot.totalCost ?? 0).toFixed(2)}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Target Profit:</span>
                          <span className="ml-2 font-medium">R{(snapshot.targetProfit ?? 0).toFixed(2)}</span>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2 justify-end">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="outline" size="sm" className="flex-1 min-w-[80px]">
                              <Eye className="w-4 h-4 mr-2" />
                              View
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                            <DialogHeader>
                              <DialogTitle>{snapshot.name}</DialogTitle>
                              <DialogDescription>
                                Created on {new Date(snapshot.createdAt).toLocaleDateString()}
                              </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4">
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="p-3 bg-muted rounded-lg">
                                  <div className="text-sm text-muted-foreground">Total Cost</div>
                                  <div className="text-lg font-bold">R{(snapshot.totalCost ?? 0).toFixed(2)}</div>
                                </div>
                                <div className="p-3 bg-muted rounded-lg">
                                  <div className="text-sm text-muted-foreground">Target Profit</div>
                                  <div className="text-lg font-bold">R{(snapshot.targetProfit ?? 0).toFixed(2)}</div>
                                </div>
                                <div className="p-3 bg-muted rounded-lg">
                                  <div className="text-sm text-muted-foreground">Target Margin</div>
                                  <div className="text-lg font-bold">{(snapshot.targetMargin ?? 0).toFixed(2)}%</div>
                                </div>
                              </div>

                              <div>
                                <h4 className="font-medium mb-2">Products (from this snapshot)</h4>
                                <div className="space-y-2">
                                  <p className="text-muted-foreground">
                                    Products for this snapshot will be loaded when you click "Load" or "Use for
                                    Quotations".
                                  </p>
                                </div>
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onLoadSnapshot && onLoadSnapshot(snapshot)}
                          className="flex-1 min-w-[80px]"
                        >
                          Load
                        </Button>

                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => onSelectForQuotations(snapshot.id)}
                          className="flex-1 min-w-[120px]"
                        >
                          <ClipboardList className="w-4 h-4 mr-2" />
                          Use for Quotations
                        </Button>

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => exportSnapshot(snapshot)}
                          className="flex-none w-10 h-10 p-0"
                        >
                          <Download className="w-4 h-4" />
                        </Button>

                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeSnapshot(snapshot.id)}
                          className="text-destructive hover:text-destructive flex-none w-10 h-10 p-0"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="border-dashed border-2 border-muted-foreground/25 bg-muted/10">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Camera className="w-12 h-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium text-muted-foreground mb-2">No snapshots saved yet</h3>
                <p className="text-sm text-muted-foreground">
                  Create your first snapshot to save your current pricing configuration
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
