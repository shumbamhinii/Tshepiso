// @shared/schema.ts
import { pgTable, serial, text, varchar, numeric, date, integer, boolean, timestamp, unique } from 'drizzle-orm/pg-core';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { z } from 'zod';

// --- Existing tbs.expenses definition ---
export const expenses = pgTable("expenses", {
  id: serial("id").primaryKey(),
  snapshotId: integer("snapshot_id").references(() => snapshots.id, { onDelete: 'cascade' }),
  label: varchar("label", { length: 255 }).notNull(),
  amount: numeric("amount").notNull(),
}, (table) => ({
  schema: 'tbs', // Specify the schema name
}));

// --- Existing tbs.master_products definition ---
export const masterProducts = pgTable("master_products", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  defaultCost: numeric("default_cost"),
  defaultExpectedUnits: integer("default_expected_units"),
  defaultRevenuePercentage: numeric("default_revenue_percentage"),
}, (table) => ({
  uniqueName: unique("master_products_name_key").on(table.name),
  schema: 'tbs', // Specify the schema name
}));

// --- Existing tbs.products definition (linked to snapshots) ---
export const snapshotProducts = pgTable("products", { // Renamed to snapshotProducts in Drizzle for clarity
  id: serial("id").primaryKey(),
  snapshotId: integer("snapshot_id").references(() => snapshots.id, { onDelete: 'cascade' }),
  name: varchar("name", { length: 255 }).notNull(),
  revenuePercentage: numeric("revenue_percentage").notNull().default(0),
  expectedUnits: integer("expected_units").notNull().default(0),
  costPerUnit: numeric("cost_per_unit").notNull().default(0),
  price: numeric("price").notNull().default(0),
  master_product_id: integer("master_product_id").references(() => masterProducts.id),
}, (table) => ({
  schema: 'tbs', // Specify the schema name
}));

// --- Existing tbs.snapshots definition ---
export const snapshots = pgTable("snapshots", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  totalCost: numeric("total_cost").notNull().default(0),
  useMargin: boolean("use_margin").default(false).notNull(),
  targetProfit: numeric("target_profit").notNull().default(0),
  targetMargin: numeric("target_margin").notNull().default(0),
  useBreakdown: boolean("use_breakdown").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  isArchived: boolean("is_archived").default(false),
}, (table) => ({
  schema: 'tbs', // Specify the schema name
}));

// --- NEW: Clients table definition ---
export const clients = pgTable("clients", {
  client_id: serial("client_id").primaryKey(),
  client_name: varchar("client_name", { length: 255 }).notNull(),
  contact_person: varchar("contact_person", { length: 255 }),
  email: varchar("email", { length: 255 }),
  phone: varchar("phone", { length: 50 }),
  address: text("address"), // Ensure this is TEXT
  createdAt: timestamp("created_at").defaultNow().notNull(), // Ensure this is TIMESTAMP and NOT NULL
});

// --- NEW: Projects table definition ---
export const projects = pgTable("projects", {
  project_id: serial("project_id").primaryKey(),
  client_id: integer("client_id").references(() => clients.client_id, { onDelete: 'cascade' }).notNull(),
  project_name: varchar("project_name", { length: 255 }).notNull(),
  description: text("description"),
  project_type: varchar("project_type", { length: 255 }).notNull(), // MODIFIED: Added .notNull()
  project_value: numeric("project_value"),
  project_start_date: date("project_start_date"),
  project_end_date: date("project_end_date"),
  budget: numeric("budget"),
  status: varchar("status", { length: 50 }).default('active').notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// --- NEW: Service Catalog table definition ---
export const serviceCatalog = pgTable("service_catalog", {
  service_id: serial("service_id").primaryKey(),
  service_name: varchar("service_name", { length: 255 }).notNull(),
  description: text("description"),
  unit_price: numeric("unit_price").notNull(),
  is_active: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// --- NEW: Project Components table definition ---
export const projectComponents = pgTable("project_components", {
  component_id: serial("component_id").primaryKey(),
  project_id: integer("project_id").references(() => projects.project_id, { onDelete: 'cascade' }).notNull(),
  service_id: integer("service_id").references(() => serviceCatalog.service_id, { onDelete: 'set null' }),
  component_name: varchar("component_name", { length: 255 }).notNull(),
  quantity: numeric("quantity").notNull(),
  unit_cost: numeric("unit_cost").notNull(),
  total_cost: numeric("total_cost").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// --- NEW: Costs table definition ---
export const costs = pgTable("costs", {
  cost_id: serial("cost_id").primaryKey(),
  project_id: integer("project_id").references(() => projects.project_id, { onDelete: 'cascade' }).notNull(),
  description: text("description"),
  amount: numeric("amount").notNull(),
  cost_date: date("cost_date").defaultNow().notNull(),
  category: varchar("category", { length: 255 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// --- NEW: Invoices table definition ---
export const invoices = pgTable("invoices", {
  invoice_id: serial("invoice_id").primaryKey(),
  project_id: integer("project_id").references(() => projects.project_id, { onDelete: 'cascade' }).notNull(),
  invoice_number: varchar("invoice_number", { length: 255 }).notNull(),
  issue_date: date("issue_date").defaultNow().notNull(),
  due_date: date("due_date").notNull(),
  amount_due: numeric("amount_due").notNull(),
  status: varchar("status", { length: 50 }).default('pending').notNull(), // e.g., 'pending', 'paid', 'overdue'
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// --- NEW: Suppliers table definition ---
export const suppliers = pgTable("suppliers", {
  id: serial("id").primaryKey(),
  supplierName: varchar("supplier_name", { length: 255 }).notNull(),
  sku: varchar("sku", { length: 255 }),
  productName: text("product_name").notNull(),
  unit: varchar("unit", { length: 50 }),
  price: numeric("price").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// --- NEW: Tenders table definition ---
export const tenders = pgTable("tenders", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  pricingMode: varchar("pricing_mode", { length: 50 }).default('margin').notNull(), // 'margin' or 'targetProfit'
  targetMarginPct: numeric("target_margin_pct").default(0),
  targetProfitAbsolute: numeric("target_profit_absolute").default(0),
  // Storing tender items as JSONB array for flexibility
  items: text("items").notNull().default('[]'), // Changed to text to store stringified JSON
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// --- Select schemas for existing tables (keep as is) ---
export const selectExpenseSchema = createSelectSchema(expenses);
export const selectMasterProductSchema = createSelectSchema(masterProducts);
export const selectSnapshotProductSchema = createSelectSchema(snapshotProducts);
export const selectSnapshotSchema = createSelectSchema(snapshots);
export const selectClientSchema = createSelectSchema(clients);
export const selectProjectSchema = createSelectSchema(projects);
export const selectServiceCatalogSchema = createSelectSchema(serviceCatalog);
export const selectProjectComponentSchema = createSelectSchema(projectComponents);
export const selectCostSchema = createSelectSchema(costs);
export const selectInvoiceSchema = createSelectSchema(invoices);
export const selectSupplierSchema = createSelectSchema(suppliers);
export const selectTenderSchema = createSelectSchema(tenders); // NEW: Export the new selectTenderSchema

// --- Insert schemas (adjusted for new table structures) ---
export const insertExpenseSchema = createInsertSchema(expenses).omit({
  id: true,
});

export const insertMasterProductSchema = createInsertSchema(masterProducts).omit({
  id: true,
});

export const insertSnapshotProductSchema = createInsertSchema(snapshotProducts).omit({
  id: true,
});

export const insertSnapshotSchema = createInsertSchema(snapshots).omit({
  id: true,
  createdAt: true,
});

export const insertClientSchema = createInsertSchema(clients).omit({
  client_id: true,
  createdAt: true,
});

export const insertProjectSchema = createInsertSchema(projects).omit({
  project_id: true,
  createdAt: true,
});

export const insertServiceCatalogSchema = createInsertSchema(serviceCatalog).omit({
  service_id: true,
  createdAt: true,
});

export const insertProjectComponentSchema = createInsertSchema(projectComponents).omit({
  component_id: true,
  createdAt: true,
});

export const insertCostSchema = createInsertSchema(costs).omit({
  cost_id: true,
  createdAt: true,
});

export const insertInvoiceSchema = createInsertSchema(invoices).omit({
  invoice_id: true,
  createdAt: true,
});

export const insertSupplierSchema = createInsertSchema(suppliers).omit({
  id: true,
  createdAt: true,
});

export const insertTenderSchema = createInsertSchema(tenders).omit({ // NEW: Export the new insertTenderSchema
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  // Define 'items' as a string because it's JSON.stringified on the frontend and stored as TEXT
  items: z.string(), // Changed from z.array(z.object(...)) to z.string()
});

// --- Types (adjusted for new table structures) ---
export type Expense = z.infer<typeof selectExpenseSchema>;
export type InsertExpense = z.infer<typeof insertExpenseSchema>;

export type MasterProduct = z.infer<typeof selectMasterProductSchema>;
export type InsertMasterProduct = z.infer<typeof insertMasterProductSchema>;

export type SnapshotProduct = z.infer<typeof selectSnapshotProductSchema>;
export type InsertSnapshotProduct = z.infer<typeof insertSnapshotProductSchema>;

export type Snapshot = z.infer<typeof selectSnapshotSchema>;
export type InsertSnapshot = z.infer<typeof insertSnapshotSchema>;

export type Client = z.infer<typeof selectClientSchema>;
export type InsertClient = z.infer<typeof insertClientSchema>;

export type Project = z.infer<typeof selectProjectSchema>;
export type InsertProject = z.infer<typeof insertProjectSchema>;

export type ServiceCatalog = z.infer<typeof selectServiceCatalogSchema>;
export type InsertServiceCatalog = z.infer<typeof insertServiceCatalogSchema>;

export type ProjectComponent = z.infer<typeof selectProjectComponentSchema>;
export type InsertProjectComponent = z.infer<typeof insertProjectComponentSchema>;

export type Cost = z.infer<typeof selectCostSchema>;
export type InsertCost = z.infer<typeof insertCostSchema>;

export type Invoice = z.infer<typeof selectInvoiceSchema>;
export type InsertInvoice = z.infer<typeof insertInvoiceSchema>;

export type Supplier = z.infer<typeof selectSupplierSchema>;
export type InsertSupplier = z.infer<typeof insertSupplierSchema>;

export type Tender = z.infer<typeof selectTenderSchema>; // NEW: Export the new Tender type
export type InsertTender = z.infer<typeof insertTenderSchema>; // NEW: Export the new InsertTender type
