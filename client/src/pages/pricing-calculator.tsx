// pages/pricing-calculator.tsx
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import SidebarNavigation from "@/components/pricing/sidebar-navigation";
import SetupTab from "@/components/pricing/setup-tab";
import ProductsTab from "@/components/pricing/products-tab";
import ResultsTab from "@/components/pricing/results-tab";
import ScenariosTab from "@/components/pricing/scenarios-tab";
import CompetitorsTab from "@/components/pricing/competitors-tab";
import BudgetTab from "@/components/pricing/budget-tab";
import SnapshotsTab from "@/components/pricing/snapshots-tab";
import PricingChatbot from "@/components/pricing/PricingChatbot";
import ProjectsTab from "@/components/pricing/ProjectsTab";
import Dashboard from "@/components/pricing/Dashboard";
import FinancialManagementWrapper from "@/components/financials/FinancialManagementWrapper";
import { calculatePricing } from "@/lib/pricing-calculations";
import {
  PricingTab,
  PricingSetup,
  PricingProduct,
  PricingResults,
  PricingSnapshot,
  WhatIfScenario,
  CompetitorPrice,
  FinancialSubTab
} from "@/types/pricing";
import { useLocation } from "wouter";
import TenderManagementTab from "@/components/pricing/TenderManagementTab";

export default function PricingCalculator() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<PricingTab>("setup");
  const [activeFinancialSubTab, setActiveFinancialSubTab] = useState<FinancialSubTab>("transactions");
  const [isCalculating, setIsCalculating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [loadingSnapshots, setLoadingSnapshots] = useState(true);
  const [errorSnapshots, setErrorSnapshots] = useState<string | null>(null);
  const [, setLocation] = useLocation();

  // Core pricing data states
  const [setup, setSetup] = useState<PricingSetup>({
    totalCost: 0,
    useBreakdown: false,
    expenses: [],
    useMargin: false,
    targetProfit: 0,
    targetMargin: 0
  });

  const [products, setProducts] = useState<PricingProduct[]>([]);
  const [results, setResults] = useState<PricingResults | null>(null);
  const [scenarios, setScenarios] = useState<WhatIfScenario[]>([]);
  const [competitorPrices, setCompetitorPrices] = useState<CompetitorPrice[]>([]);
  const [budgetItems, setBudgetItems] = useState<any[]>([]);
  const [snapshots, setSnapshots] = useState<PricingSnapshot[]>([]);

  // Load saved data from localStorage on initial render
  useEffect(() => {
    const savedData = localStorage.getItem("pricing-calculator-data");
    if (savedData) {
      try {
        const parsed = JSON.parse(savedData);
        setSetup({
          ...parsed.setup,
          totalCost: parseFloat(parsed.setup?.totalCost || 0) || 0,
          targetProfit: parseFloat(parsed.setup?.targetProfit || 0) || 0,
          targetMargin: parseFloat(parsed.setup?.targetMargin || 0) || 0
        } || setup);
        setProducts(parsed.products || []);
        setResults(parsed.results || null);
        setScenarios(parsed.scenarios || []);
        setCompetitorPrices(parsed.competitorPrices || []);
        setBudgetItems(parsed.budgetItems || []);
      } catch (error) {
        console.error("Error loading saved data from localStorage:", error);
      }
    }
  }, []);

  // Save data to localStorage whenever relevant states change
  useEffect(() => {
    const dataToSave = {
      setup,
      products,
      results,
      scenarios,
      competitorPrices,
      budgetItems
    };
    localStorage.setItem("pricing-calculator-data", JSON.stringify(dataToSave));
  }, [setup, products, results, scenarios, competitorPrices, budgetItems]);

  // Fetch snapshots
  const fetchSnapshots = async () => {
    setLoadingSnapshots(true);
    setErrorSnapshots(null);
    try {
      const response = await fetch(`/api/snapshots`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }
      const data: PricingSnapshot[] = await response.json();

      // For each snapshot, fetch its products to calculate total revenue for display
      const snapshotsWithRevenue = await Promise.all(
        data.map(async (s) => {
          const productsResponse = await fetch(`/api/snapshots/${s.id}/products`);
          let snapshotProducts: PricingProduct[] = [];
          if (productsResponse.ok) {
            const fetchedProducts = await productsResponse.json();
            snapshotProducts = fetchedProducts.map((p: any) => ({
              ...p,
              id: Number(p.id),
              expectedUnits: parseInt(p.expectedUnits as any) || 0,
              costPerUnit: parseFloat(p.costPerUnit as any) || 0,
              price: parseFloat(p.price as any) || 0,
              revenuePercentage: parseFloat(p.revenuePercentage as any) || 0
            }));
          } else {
            console.warn(`Could not fetch products for snapshot ID ${s.id}. Revenue will be 0.`);
          }

          const totalRevenue = snapshotProducts.reduce((sum, p) => sum + p.price * p.expectedUnits, 0);
          const totalProducts = snapshotProducts.length;

          return {
            ...s,
            id: Number(s.id),
            totalCost: parseFloat(s.totalCost as any) || 0,
            targetProfit: parseFloat(s.targetProfit as any) || 0,
            targetMargin: parseFloat(s.targetMargin as any) || 0,
            revenue: totalRevenue,
            productsCount: totalProducts
          };
        })
      );

      setSnapshots(snapshotsWithRevenue);
    } catch (err: any) {
      console.error("Failed to fetch snapshots:", err);
      setErrorSnapshots(err.message || "Failed to load snapshots.");
      toast({
        title: "Error loading snapshots",
        description: err.message || "Could not retrieve snapshots from the server.",
        variant: "destructive"
      });
    } finally {
      setLoadingSnapshots(false);
    }
  };

  useEffect(() => {
    fetchSnapshots();
  }, []);

  // CALCULATE (only in‑stock)
  const handleCalculate = async () => {
    const activeProducts = products
      .map((p) => ({
        ...p,
        expectedUnits: parseInt(p.expectedUnits as any) || 0,
        costPerUnit: parseFloat(p.costPerUnit as any) || 0,
        price: parseFloat((p as any).price as any) || 0,
        revenuePercentage: parseFloat(p.revenuePercentage as any) || 0
      }))
      .filter((p) => p.expectedUnits > 0);

    if (activeProducts.length === 0) {
      toast({
        title: "Nothing to calculate",
        description: "Set On‑hand Qty for at least one product (greater than 0).",
        variant: "destructive"
      });
      return;
    }

    setIsCalculating(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 300));
      const calculatedResults = calculatePricing(setup, activeProducts as any);
      setResults(calculatedResults);
      setActiveTab("results");
      toast({
        title: "Calculation complete",
        description: `Calculated ${activeProducts.length} in‑stock products.`
      });
    } catch (error: any) {
      toast({
        title: "Calculation failed",
        description: error.message || "There was an error calculating your pricing. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsCalculating(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 500));
      toast({
        title: "Changes saved",
        description: "Your pricing configuration has been saved successfully."
      });
    } catch (error: any) {
      toast({
        title: "Save failed",
        description: error.message || "There was an error saving your changes. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

const handleCreateSnapshot = async (name: string, description?: string) => {
  setIsSaving(true);
  try {
    // 0) Only in‑stock products, with parsed numeric fields
    const activeProducts = products
      .map(p => ({
        ...p,
        id: Number(p.id),
        expectedUnits: parseInt(p.expectedUnits as any) || 0,
        costPerUnit: parseFloat(p.costPerUnit as any) || 0,
        revenuePercentage: parseFloat(p.revenuePercentage as any) || 0,
      }))
      .filter(p => p.expectedUnits > 0);

    if (activeProducts.length === 0) {
      throw new Error("Nothing to save. Set On‑hand Qty (> 0) for at least one product.");
    }

    // 1) Create snapshot shell
    const snapshotPayload = {
      name,
      description,
      totalCost: (setup.totalCost || 0).toString(),
      useMargin: !!setup.useMargin,
      targetProfit: (setup.targetProfit || 0).toString(),
      targetMargin: (setup.targetMargin || 0).toString(),
      useBreakdown: !!setup.useBreakdown,
    };

    const snapshotResponse = await fetch("/api/snapshots", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(snapshotPayload),
    });
    if (!snapshotResponse.ok) {
      const errorData = await snapshotResponse.json();
      throw new Error(errorData.message || "Failed to create snapshot.");
    }
    const createdSnapshot = await snapshotResponse.json();
    const snapshotId = createdSnapshot.id;

    // 2) Calculate suggested prices for ONLY active items
    const { calculatedProducts } = calculatePricing(setup, activeProducts as any);
    const priceById = new Map<number, number>();
    (calculatedProducts || []).forEach((cp: any) => {
      // cp.id should correspond to original product id (we mapped id above)
      priceById.set(Number(cp.id), parseFloat(cp.price as any) || 0);
    });

    // 3) Save snapshot products (active only), using calculated price
    for (const p of activeProducts) {
      const payload = {
        name: p.name,
        revenuePercentage: (p.revenuePercentage || 0).toString(),
        expectedUnits: p.expectedUnits, // on‑hand
        costPerUnit: (p.costPerUnit || 0).toString(),
        price: (priceById.get(Number(p.id)) || 0).toString(),
        master_product_id: (p as any).master_product_id ?? null,
        notes: p.notes ?? "",
      };

      const pr = await fetch(`/api/snapshots/${snapshotId}/products`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!pr.ok) {
        const err = await pr.json().catch(() => ({}));
        console.error(`Failed to create product on snapshot ${snapshotId}`, err);
      }
    }

    // 4) Save expenses (unchanged)
    for (const expense of setup.expenses) {
      const expensePayload = {
        label: expense.label,
        amount: (expense.amount || 0).toString(),
      };
      const er = await fetch(`/api/snapshots/${snapshotId}/expenses`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(expensePayload),
      });
      if (!er.ok) {
        const err = await er.json().catch(() => ({}));
        console.error(`Failed to create expense for snapshot ${snapshotId}`, err);
      }
    }

    await fetchSnapshots();
    toast({ title: "Snapshot created", description: `Snapshot "${name}" has been saved with in‑stock items and calculated prices.` });
  } catch (error: any) {
    console.error("Error creating snapshot:", error);
    toast({
      title: "Error creating snapshot",
      description: error.message || "Could not save snapshot to the server.",
      variant: "destructive",
    });
  } finally {
    setIsSaving(false);
  }
};

  const handleDeleteSnapshot = async (snapshotId: number) => {
    setIsSaving(true);
    try {
      const response = await fetch(`/api/snapshots/${snapshotId}`, { method: "DELETE" });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Failed to delete snapshot (HTTP ${response.status})`);
      }
      toast({ title: "Snapshot deleted", description: "Snapshot has been removed successfully." });
      await fetchSnapshots();
    } catch (error: any) {
      console.error("Error deleting snapshot:", error);
      toast({
        title: "Snapshot deletion failed",
        description: error.message || "There was an error deleting the snapshot. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleLoadSnapshot = async (snapshot: PricingSnapshot) => {
    setIsSaving(true);
    try {
      setSetup({
        totalCost: parseFloat(snapshot.totalCost as any) || 0,
        expenses: [],
        useMargin: snapshot.useMargin,
        targetProfit: parseFloat(snapshot.targetProfit as any) || 0,
        targetMargin: parseFloat(snapshot.targetMargin as any) || 0,
        useBreakdown: snapshot.useBreakdown
      });

      const productsResponse = await fetch(`/api/snapshots/${snapshot.id}/products`);
      if (!productsResponse.ok) {
        const errorData = await productsResponse.json();
        throw new Error(errorData.message || `Failed to fetch products for snapshot (HTTP ${productsResponse.status})`);
      }
      const fetchedProducts: PricingProduct[] = await productsResponse.json();

      const parsedProducts = fetchedProducts.map((p) => ({
        ...p,
        id: Number(p.id),
        expectedUnits: parseInt(p.expectedUnits as any) || 0,
        costPerUnit: parseFloat(p.costPerUnit as any) || 0,
        price: parseFloat(p.price as any) || 0,
        revenuePercentage: parseFloat(p.revenuePercentage as any) || 0,
        master_product_id: Number(p.master_product_id) || null
      }));
      setProducts(parsedProducts);

      const recalculatedSetup: PricingSetup = {
        totalCost: parseFloat(snapshot.totalCost as any) || 0,
        expenses: [],
        useMargin: snapshot.useMargin,
        targetProfit: parseFloat(snapshot.targetProfit as any) || 0,
        targetMargin: parseFloat(snapshot.targetMargin as any) || 0,
        useBreakdown: snapshot.useBreakdown
      };

      const recalculatedResults = calculatePricing(recalculatedSetup, parsedProducts);
      setResults(recalculatedResults);

      toast({
        title: "Snapshot loaded",
        description: `Snapshot "${snapshot.name}" and its products have been loaded successfully.`
      });
      setActiveTab("products");
    } catch (error: any) {
      console.error("Error loading snapshot and products:", error);
      toast({
        title: "Snapshot load failed",
        description: error.message || "There was an error loading the snapshot and its products. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleClearSnapshot = () => {
    setSetup({
      totalCost: 0,
      useBreakdown: false,
      expenses: [],
      useMargin: false,
      targetProfit: 0,
      targetMargin: 0
    });
    setProducts([]);
    setResults(null);
    toast({ title: "Snapshot Cleared", description: "The pricing calculator has been reset." });
  };

  const handleRunScenario = (scenario: WhatIfScenario) => {
    if (!results) {
      toast({
        title: "No base results",
        description: "Please calculate your pricing first before running scenarios.",
        variant: "destructive"
      });
      return;
    }

    const modifiedSetup = { ...setup };
    const modifiedProducts = products.map((p) => ({
      ...p,
      costPerUnit: (parseFloat(p.costPerUnit as any) || 0) * (scenario.changes.costMultiplier || 1),
      expectedUnits: Math.round((parseInt(p.expectedUnits as any) || 0) * (scenario.changes.volumeMultiplier || 1))
    }));

    if (scenario.changes.marginAdjustment) {
      modifiedSetup.targetMargin = (parseFloat(setup.targetMargin as any) || 0) + scenario.changes.marginAdjustment;
    }

    const scenarioResults = calculatePricing(modifiedSetup, modifiedProducts as any);
    const updatedScenario = { ...scenario, results: scenarioResults };
    setScenarios(scenarios.map((s) => (s.id === scenario.id ? updatedScenario : s)));

    toast({ title: "Scenario calculated", description: `Scenario "${scenario.name}" has been calculated successfully.` });
  };

  const handleSelectSnapshotForQuotations = async (snapshotId: number) => {
  setIsSaving(true);
  try {
    const selectedSnapshot = snapshots.find((s) => s.id === snapshotId);
    if (!selectedSnapshot) throw new Error("Selected snapshot not found.");

    const productsResponse = await fetch(`/api/snapshots/${snapshotId}/products`);
    if (!productsResponse.ok) {
      const errorData = await productsResponse.json();
      throw new Error(errorData.message || `Failed to fetch products for quotation snapshot (HTTP ${productsResponse.status})`);
    }
    const fetchedProducts = await productsResponse.json();

    // Map to what Quotations page expects; use stored price directly.
    const productsForQuotations = fetchedProducts.map((p: any) => ({
      ...p,
      id: Number(p.id),
      expectedUnits: parseInt(p.expectedUnits as any) || 0,
      costPerUnit: parseFloat(p.costPerUnit as any) || 0,
      price: parseFloat(p.price as any) || 0, // <-- this is the snapshot's frozen selling price
      revenuePercentage: parseFloat(p.revenuePercentage as any) || 0
    }));

    localStorage.setItem("selectedQuotationSnapshotId", String(snapshotId));
    localStorage.setItem("selectedQuotationProducts", JSON.stringify(productsForQuotations));

    toast({ title: "Snapshot selected for quotations", description: "Navigating to quotations screen..." });
    setLocation("/quotations");
  } catch (error: any) {
    console.error("Error selecting snapshot for quotations:", error);
    toast({
      title: "Error selecting snapshot for quotations",
      description: error.message || "Could not prepare snapshot for quotations. Please try again.",
      variant: "destructive"
    });
  } finally {
    setIsSaving(false);
  }
};



  const handleTabChange = (mainTab: PricingTab, subTab?: FinancialSubTab) => {
    if (mainTab === "financial-management") {
      if (activeTab === "financial-management" && !subTab) {
        setActiveTab("setup");
        setActiveFinancialSubTab("transactions");
      } else {
        setActiveTab("financial-management");
        setActiveFinancialSubTab(subTab || "transactions");
      }
    } else {
      setActiveTab(mainTab);
      setActiveFinancialSubTab("transactions");
    }
  };

  // Simple handlers for Dashboard
  const handleExportDashboardPdf = () =>
    toast({ title: "Export initiated", description: "Your dashboard PDF is being generated." });

  const handleRefreshDashboard = () => {
    // lightweight "refresh": re-run a calc if products exist
    if (products.length) {
      handleCalculate();
    } else {
      toast({ title: "Nothing to refresh", description: "No products loaded yet." });
    }
  };

  const renderActiveTab = () => {
    switch (activeTab) {
      case "setup":
        return (
          <SetupTab
            setup={setup}
            onSetupChange={setSetup}
            onCalculate={handleCalculate}
            isCalculating={isCalculating}
          />
        );
      case "products":
        return <ProductsTab products={products} onProductsChange={setProducts} />;
      case "results":
        return (
          <ResultsTab
            results={results}
            onApplyPrices={() =>
              toast({ title: "Prices applied", description: "Your pricing report is being generated." })
            }
            onExportPdf={() =>
              toast({ title: "Export initiated", description: "Your pricing report is being generated." })
            }
          />
        );
      case "scenarios":
        return (
          <ScenariosTab
            scenarios={scenarios}
            onScenariosChange={setScenarios}
            onRunScenario={handleRunScenario}
            baseResults={results}
          />
        );
      case "tenders":
        return (
          <TenderManagementTab
            products={products}
            defaultMarginPct={Number(setup.targetMargin) || 0}
            onUseMargin={(pct: any) => setSetup((s) => ({ ...s, useMargin: true, targetMargin: pct }))}
          />
        );
      case "competitors":
        return (
          <CompetitorsTab
            products={products}
            competitorPrices={competitorPrices}
            onCompetitorPricesChange={setCompetitorPrices}
          />
        );
      case "budget":
        return <BudgetTab budgetItems={budgetItems} onBudgetItemsChange={setBudgetItems} />;
      case "pricingchat":
        return <PricingChatbot />;
      case "projects":
        return <ProjectsTab />;
      case "snapshots":
        if (loadingSnapshots) return <div className="p-8 text-center text-muted-foreground">Loading snapshots...</div>;
        if (errorSnapshots) return <div className="p-8 text-center text-destructive">Error: {errorSnapshots}</div>;
        return (
          <SnapshotsTab
            snapshots={snapshots}
            onSnapshotsChange={setSnapshots}
            onLoadSnapshot={handleLoadSnapshot}
            onCreateSnapshot={handleCreateSnapshot}
            onDeleteSnapshot={handleDeleteSnapshot}
            onSelectForQuotations={handleSelectSnapshotForQuotations}
            onClearSnapshot={handleClearSnapshot}
          />
        );
      case "financial-management":
        return (
          <FinancialManagementWrapper
            activeSubTab={activeFinancialSubTab}
            onSubTabChange={setActiveFinancialSubTab}
          />
        );

      // 🔥 NEW: Dashboard tab
      case "dashboard":
        return (
          <Dashboard
            results={results}
            products={products}
            onExportPdf={handleExportDashboardPdf}
            onRefresh={handleRefreshDashboard}
          />
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen flex bg-background">
      <SidebarNavigation
        activeTab={activeTab}
        onTabChange={handleTabChange}
        onSave={handleSave}
        isSaving={isSaving}
        onBack={() => {
          console.log("Attempting to navigate back to home page...");
          setLocation("/");
        }}
        activeFinancialSubTab={activeFinancialSubTab}
      />

      <main className="flex-1 overflow-auto">{renderActiveTab()}</main>
    </div>
  );
}
