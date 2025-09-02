// src/types/pricing.ts

// --- Updated to match tbs.expenses ---
export interface PricingExpense {
  id: number; // serial4 in DB, so number
  snapshotId?: number | null; // int4 NULL in DB, so number | null
  label: string; // varchar(255) NOT NULL in DB
  amount: number; // numeric NOT NULL in DB
}

// --- Updated to match tbs.products (renamed to snapshotProducts in Drizzle schema) ---
export interface PricingProduct { // This type now specifically represents products associated with a snapshot
  id: number; // serial4 NOT NULL in DB
  snapshotId?: number | null; // int4 NULL in DB
  name: string; // varchar(255) NOT NULL in DB
  revenuePercentage: number; // numeric NOT NULL in DB
  expectedUnits: number; // int4 NOT NULL in DB
  costPerUnit?: number | null; // numeric NULL in DB
  // These fields are NOT stored in tbs.products, they are calculated or part of master_products
  // Add calculated fields if needed for frontend display, but they are not persisted here
  price?: number;
  totalRevenue?: number;
  profitPerUnit?: number;
  profitMargin?: number;
  // Added for consistency with `calculatePricing` and `handleLoadSnapshot`
  calculationMethod?: 'cost-plus' | 'value-based' | 'competitive' | 'dynamic';
  // NEW: Field to hold a suggested price from a calculation, separate from the manual price input
  suggestedPrice?: number;
}

// --- New type for master_products (if you use it on the frontend) ---
export interface MasterProduct {
  id: number;
  name: string;
  defaultCost?: number | null;
  defaultExpectedUnits?: number | null;
  defaultRevenuePercentage?: number | null;
}


// PricingSetup remains largely as it was, but expenses will be fetched separately
export interface PricingSetup {
  totalCost: number;
  useBreakdown: boolean;
  expenses: PricingExpense[]; // These will be fetched/saved separately for snapshots
  useMargin: boolean;
  targetProfit: number;
  targetMargin: number;
}

export interface CalculatedProduct extends PricingProduct {
  // These fields are results of calculation, not directly stored in tbs.products
  price: number;
  totalRevenue: number;
  profitPerUnit: number;
  profitMargin: number;
}

export interface PricingResults {
  actualCost: number;
  totalRevenue: number;
  calculatedProfit: number;
  actualTotalRevenue: number;
  calculatedProducts: CalculatedProduct[]; // These are calculated, not directly from DB
  inputs: PricingSetup & { products: PricingProduct[] }; // This structure is for frontend calculation inputs
}

// --- Updated to match tbs.snapshots (flat structure) ---
export interface PricingSnapshot {
  id: number; // serial4 NOT NULL in DB
  name: string; // varchar(255) NOT NULL in DB
  description?: string | null; // varchar(255) NULL in DB (assuming description is varchar)
  totalCost: string; // numeric NOT NULL in DB, often comes as string from pg
  useMargin: boolean; // bool DEFAULT false NULL in DB
  targetProfit?: string | null; // numeric NULL in DB, often comes as string from pg
  targetMargin?: string | null; // numeric NULL in DB, often comes as string from pg
  useBreakdown: boolean; // bool DEFAULT false NULL in DB
  createdAt: string; // timestamp DEFAULT CURRENT_TIMESTAMP NULL in DB, typically comes as ISO string
  products?: PricingProduct[]; // Products associated with this snapshot (fetched separately)
}

// WhatIfScenario and CompetitorPrice interfaces (re-added as they are used in PricingCalculator.tsx and other components)
export interface WhatIfScenario {
  id: string; // Unique identifier for the scenario
  name: string;
  description: string;
  changes: {
    costMultiplier?: number; // e.g., 1.1 for 10% increase
    volumeMultiplier?: number; // e.g., 0.9 for 10% decrease
    marginAdjustment?: number; // e.g., +5 for 5% increase in target margin
    // Add other relevant change parameters
  };
  results?: PricingResults; // To store the calculated results for this scenario
}

export interface CompetitorPrice {
  id?: number;
  productId: number; // Link to a PricingProduct
  competitorName: string;
  price: number;
  notes?: string;
}



// NEW: Financial Management Sub-tabs
export type FinancialSubTab = 'transactions' | 'import' | 'financials-reports';

// Corrected PricingTab to include all tabs, including the new financial-management parent tab
export type PricingTab =
  | 'setup'
  | 'products'
  | 'results'
  | 'scenarios'
  | 'competitors'
  | 'budget'
  | 'pricingchat'
  | 'snapshots'
  | 'projects'
  | 'financial-management'
  | 'tenders'
  | 'dashboard'
  | "suppliers";
  
// Tender-related types
export interface SupplierRow {
  supplierName: string;
  sku?: string;
  productName?: string;
  unit?: string;
  price: number; // supplier unit price
  currency?: string;
}


export interface TenderPricingState {
  supplierRows: SupplierRow[];
  tenderItems: TenderItem[];
  pricingMode: 'margin' | 'targetProfit';
  targetMarginPct: number;    // e.g., 25 means 25%
  targetProfitAbsolute: number; // currency
}


// add below your existing types

export type CatalogItem = {
  id: string;
  supplierName: string;
  sku?: string;
  productName: string;
  unit?: string;
  price: number;
  currency?: string;
};

export type TenderSupplierOption = {
  supplierName: string;
  sku?: string;
  unit?: string;
  price: number;
  sourceId: string; // links back to a CatalogItem.id
  score: number;    // fuzzy score (lower is better)
};

// extend TenderItem (non‑breaking; all optional)
export type TenderItem = {
  lineNo?: number | string;
  description: string;
  unit?: string;
  qty: number;
  mappedProductId?: number | null;
  costPerUnit?: number;

  // NEW (milestone 1)
  supplierOptions?: TenderSupplierOption[];
  chosenSourceId?: string;  // selected supplier item
};

// types/pricing.ts (or local to ProductsTab)
export type SupplierId = string;

export interface Supplier {
  id: SupplierId;
  name: string;
}

export interface SupplierProductRow {
  id: string;              // unique per supplier row (supplierId + sku)
  supplierId: SupplierId;
  sku: string;
  name: string;
  pack?: string;
  currency?: string;
  cost: number;
  lastUpdated?: string;
}

export interface CatalogProduct {          // merged across suppliers by key (sku or name)
  key: string;                          // sku preferred, else normalized name
  name: string;
  pack?: string;
  options: Array<{
    supplierId: SupplierId;
    cost: number;
    currency?: string;
    lastUpdated?: string;
  }>;
  chosenSupplierId?: SupplierId;         // if user overrides “best”
  qty: number;                          // user input
  included: boolean;                    // quick toggle
}