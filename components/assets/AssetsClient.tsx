"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Plus, Pencil, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { PageHeader } from "@/components/design/PageHeader";
import { GradientText } from "@/components/design/GradientText";
import { formatINR } from "@/lib/utils";
import { toast } from "@/components/ui/use-toast";

type Category = {
  id: string;
  name: string;
  icon: string | null;
  growthRate: number;
  assets: Array<{
    id: string;
    name: string;
    value: number;
    notes: string | null;
    categoryId: string;
  }>;
  totalValue: number;
};

export function AssetsClient() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [addAssetOpen, setAddAssetOpen] = useState(false);
  const [addCatOpen, setAddCatOpen] = useState(false);
  const [editAsset, setEditAsset] = useState<Category["assets"][0] | null>(null);
  const [deleteAssetId, setDeleteAssetId] = useState<string | null>(null);

  const [importCategoryId, setImportCategoryId] = useState("");
  const [replaceCategory, setReplaceCategory] = useState(false);
  const [csvImporting, setCsvImporting] = useState(false);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const csvInputRef = useRef<HTMLInputElement>(null);

  const [assetForm, setAssetForm] = useState({
    name: "",
    categoryId: "",
    value: "",
    notes: "",
  });
  const [catForm, setCatForm] = useState({
    name: "",
    icon: "",
    growthRate: "0",
  });

  const load = useCallback((opts?: { showSpinner?: boolean }) => {
    const showSpinner = opts?.showSpinner !== false;
    if (showSpinner) setLoading(true);
    fetch("/api/categories")
      .then((r) => r.json())
      .then(setCategories)
      .finally(() => {
        if (showSpinner) setLoading(false);
      });
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (categories.length === 0 || importCategoryId) return;
    const mf = categories.find((c) => c.name === "Mutual Funds");
    setImportCategoryId(mf?.id ?? categories[0].id);
  }, [categories, importCategoryId]);

  async function submitAsset(e: React.FormEvent) {
    e.preventDefault();
    const url = editAsset ? `/api/assets/${editAsset.id}` : "/api/assets";
    const method = editAsset ? "PUT" : "POST";
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: assetForm.name,
        categoryId: assetForm.categoryId,
        value: Number(assetForm.value),
        notes: assetForm.notes || null,
      }),
    });
    if (!res.ok) {
      toast({ title: "Could not save asset", variant: "destructive" });
      return;
    }
    toast({ title: editAsset ? "Asset updated" : "Asset added" });
    setAddAssetOpen(false);
    setEditAsset(null);
    setAssetForm({ name: "", categoryId: "", value: "", notes: "" });
    load();
  }

  async function submitCategory(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: catForm.name,
        icon: catForm.icon || null,
        growthRate: Number(catForm.growthRate),
      }),
    });
    if (!res.ok) {
      toast({ title: "Could not add category", variant: "destructive" });
      return;
    }
    toast({ title: "Category added" });
    setAddCatOpen(false);
    setCatForm({ name: "", icon: "", growthRate: "0" });
    load();
  }

  async function updateGrowth(catId: string, growthRate: number) {
    await fetch(`/api/categories/${catId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ growthRate }),
    });
    load();
  }

  async function confirmDeleteAsset() {
    if (!deleteAssetId) return;
    await fetch(`/api/assets/${deleteAssetId}`, { method: "DELETE" });
    toast({ title: "Asset deleted" });
    setDeleteAssetId(null);
    load();
  }

  async function submitCsvImport() {
    if (!csvFile) {
      toast({ title: "Choose a CSV file", variant: "destructive" });
      return;
    }
    if (!importCategoryId) {
      toast({ title: "Select a category", variant: "destructive" });
      return;
    }
    setCsvImporting(true);
    try {
      const fd = new FormData();
      fd.set("file", csvFile);
      fd.set("categoryId", importCategoryId);
      fd.set("replaceCategory", replaceCategory ? "true" : "false");
      const res = await fetch("/api/assets/import-csv", {
        method: "POST",
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) {
        toast({
          title: "Import failed",
          description: data?.error ?? res.statusText,
          variant: "destructive",
        });
        return;
      }
      const extra =
        Array.isArray(data.errors) && data.errors.length > 0
          ? ` · ${data.errors.slice(0, 2).join("; ")}`
          : "";
      toast({
        title: "CSV imported",
        description: `${data.created} created${data.skipped ? `, ${data.skipped} skipped` : ""}${extra}`,
      });
      setCsvFile(null);
      if (csvInputRef.current) csvInputRef.current.value = "";
      load({ showSpinner: false });
    } finally {
      setCsvImporting(false);
    }
  }

  if (loading) return <p className="text-slate-500">Loading…</p>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
        <PageHeader
          label="Portfolio"
          description="Categories and holdings in INR — edit growth rates inline."
        >
          <>
            <GradientText>Assets</GradientText> & categories
          </>
        </PageHeader>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => setAddCatOpen(true)}>
            <Plus className="mr-1 h-4 w-4" />
            Add category
          </Button>
          <Button
            onClick={() => {
              setEditAsset(null);
              setAssetForm({
                name: "",
                categoryId: categories[0]?.id ?? "",
                value: "",
                notes: "",
              });
              setAddAssetOpen(true);
            }}
          >
            <Plus className="mr-1 h-4 w-4" />
            Add asset
          </Button>
        </div>
      </div>

      {categories.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Import from CSV</CardTitle>
            <p className="text-sm text-slate-500">
              Export holdings from Groww (or another broker) as CSV. Needs
              columns for name (e.g. scheme name) and value (e.g. current
              value). See README for details.
            </p>
          </CardHeader>
          <CardContent className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end">
            <input
              ref={csvInputRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e) => setCsvFile(e.target.files?.[0] ?? null)}
            />
            <div className="grid gap-2">
              <Label>File</Label>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => csvInputRef.current?.click()}
                >
                  <Upload className="mr-1 h-4 w-4" />
                  Choose CSV
                </Button>
                <span className="text-sm text-slate-600">
                  {csvFile ? csvFile.name : "No file selected"}
                </span>
              </div>
            </div>
            <div className="grid gap-2 min-w-[200px]">
              <Label>Category</Label>
              <Select
                value={importCategoryId}
                onValueChange={setImportCategoryId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.icon} {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={replaceCategory}
                onChange={(e) => setReplaceCategory(e.target.checked)}
                className="rounded border-slate-300"
              />
              Replace all assets in this category
            </label>
            <Button
              type="button"
              disabled={!csvFile || csvImporting}
              onClick={() => void submitCsvImport()}
            >
              {csvImporting ? "Importing…" : "Import"}
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {categories.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-slate-500">
            No categories yet. Seed the database or add a category.
          </CardContent>
        </Card>
      ) : (
        categories.map((cat) => (
          <Card key={cat.id}>
            <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <CardTitle className="flex items-center gap-2 text-lg">
                <span>{cat.icon ?? "•"}</span>
                {cat.name}
              </CardTitle>
              <div className="flex items-center gap-2 text-sm">
                <Label className="text-slate-500">Growth %</Label>
                <Input
                  className="h-8 w-20"
                  type="number"
                  defaultValue={cat.growthRate}
                  onBlur={(e) =>
                    updateGrowth(cat.id, Number(e.target.value) || 0)
                  }
                />
              </div>
            </CardHeader>
            <CardContent>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-slate-500">
                    <th className="pb-2 pr-4">Name</th>
                    <th className="pb-2 pr-4">Value</th>
                    <th className="pb-2 pr-4">Notes</th>
                    <th className="pb-2" />
                  </tr>
                </thead>
                <tbody>
                  {cat.assets.map((a) => (
                    <tr key={a.id} className="border-b border-slate-100">
                      <td className="py-2 pr-4 font-medium">{a.name}</td>
                      <td className="py-2 pr-4">{formatINR(a.value)}</td>
                      <td className="py-2 pr-4 text-slate-600">{a.notes ?? "—"}</td>
                      <td className="py-2 text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setEditAsset(a);
                            setAssetForm({
                              name: a.name,
                              categoryId: a.categoryId,
                              value: String(a.value),
                              notes: a.notes ?? "",
                            });
                            setAddAssetOpen(true);
                          }}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeleteAssetId(a.id)}
                        >
                          <Trash2 className="h-4 w-4 text-red-600" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="mt-3 text-sm font-medium text-slate-700">
                Category total: {formatINR(cat.totalValue)}
              </p>
            </CardContent>
          </Card>
        ))
      )}

      <Dialog open={addAssetOpen} onOpenChange={setAddAssetOpen}>
        <DialogContent>
          <form onSubmit={submitAsset}>
            <DialogHeader>
              <DialogTitle>{editAsset ? "Edit asset" : "Add asset"}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-3 py-4">
              <div>
                <Label>Name</Label>
                <Input
                  required
                  value={assetForm.name}
                  onChange={(e) =>
                    setAssetForm((s) => ({ ...s, name: e.target.value }))
                  }
                />
              </div>
              <div>
                <Label>Category</Label>
                <Select
                  value={assetForm.categoryId}
                  onValueChange={(v) =>
                    setAssetForm((s) => ({ ...s, categoryId: v }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.icon} {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Value (INR)</Label>
                <Input
                  required
                  type="number"
                  value={assetForm.value}
                  onChange={(e) =>
                    setAssetForm((s) => ({ ...s, value: e.target.value }))
                  }
                />
              </div>
              <div>
                <Label>Notes</Label>
                <Input
                  value={assetForm.notes}
                  onChange={(e) =>
                    setAssetForm((s) => ({ ...s, notes: e.target.value }))
                  }
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="submit">Save</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={addCatOpen} onOpenChange={setAddCatOpen}>
        <DialogContent>
          <form onSubmit={submitCategory}>
            <DialogHeader>
              <DialogTitle>Add category</DialogTitle>
            </DialogHeader>
            <div className="grid gap-3 py-4">
              <div>
                <Label>Name</Label>
                <Input
                  required
                  value={catForm.name}
                  onChange={(e) =>
                    setCatForm((s) => ({ ...s, name: e.target.value }))
                  }
                />
              </div>
              <div>
                <Label>Icon (emoji)</Label>
                <Input
                  value={catForm.icon}
                  onChange={(e) =>
                    setCatForm((s) => ({ ...s, icon: e.target.value }))
                  }
                />
              </div>
              <div>
                <Label>Annual growth %</Label>
                <Input
                  type="number"
                  value={catForm.growthRate}
                  onChange={(e) =>
                    setCatForm((s) => ({ ...s, growthRate: e.target.value }))
                  }
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="submit">Create</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteAssetId} onOpenChange={() => setDeleteAssetId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this asset?</AlertDialogTitle>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteAsset}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
