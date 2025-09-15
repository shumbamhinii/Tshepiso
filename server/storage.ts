// server/storage.ts
import { eq, and, desc } from 'drizzle-orm';

import { db } from './db';

import {
  // Import the new schemas and types
  clients,
  type Client,
  type InsertClient,
  projects,
  type Project,
  type InsertProject,
  serviceCatalog,
  type ServiceCatalog,
  type InsertServiceCatalog,
  projectComponents,
  type ProjectComponent,
  type InsertProjectComponent,
  costs,
  type Cost,
  type InsertCost,
  invoices, // NEW: Import invoices schema
  type Invoice, // NEW: Import Invoice type
  type InsertInvoice, // NEW: Import InsertInvoice type
  suppliers, // NEW: Import the new suppliers schema
  type Supplier, // NEW: Import the new Supplier type
  type InsertSupplier, // NEW: Import the new InsertSupplier type
  insertMasterProductSchema, // NEW: Import insertMasterProductSchema for direct product creation
  tenders, // NEW: Import tenders schema
  type Tender, // NEW: Import Tender type
  type InsertTender, // NEW: Import InsertTender type
  
  // Keep existing imports if you still use them (e.g., masterProducts, snapshots)
  masterProducts, // Assuming you still use master_products
  type MasterProduct,
  type InsertMasterProduct,
  snapshots, // Assuming you still use snapshots
  type Snapshot,
  type InsertSnapshot,
  snapshotProducts, // Assuming you still use snapshotProducts
  type SnapshotProduct,
  type InsertSnapshotProduct,
  expenses, // Assuming you still use expenses
  type Expense,
  type InsertExpense,
  accessPasswords,
} from "@shared/schema";
import bcrypt from "bcryptjs";

// Define the IStorage interface to include methods for the new tables
export interface IStorage {
  // --- Existing Master Product methods ---
  getMasterProduct(id: number): Promise<MasterProduct | undefined>;
  getMasterProductByName(name: string): Promise<MasterProduct | undefined>;
  createMasterProduct(product: InsertMasterProduct): Promise<MasterProduct>;
  updateMasterProduct(id: number, product: Partial<InsertMasterProduct>): Promise<MasterProduct>;
  deleteMasterProduct(id: number): Promise<boolean>;
  getAllMasterProducts(): Promise<MasterProduct[]>;

  // --- Existing Snapshot methods ---
  getSnapshot(id: number): Promise<Snapshot | undefined>;
  createSnapshot(snapshot: InsertSnapshot): Promise<Snapshot>;
  updateSnapshot(id: number, snapshot: Partial<InsertSnapshot>): Promise<Snapshot>;
  deleteSnapshot(id: number): Promise<boolean>;
  getAllSnapshots(): Promise<Snapshot[]>;
  getArchivedSnapshots(): Promise<Snapshot[]>;
  toggleSnapshotArchivedStatus(id: number, isArchived: boolean): Promise<Snapshot>;

  // --- Existing Snapshot Product methods ---
  getSnapshotProduct(id: number): Promise<SnapshotProduct | undefined>;
  createSnapshotProduct(product: InsertSnapshotProduct): Promise<SnapshotProduct>;
  updateSnapshotProduct(id: number, product: Partial<InsertSnapshotProduct>): Promise<SnapshotProduct>;
  deleteSnapshotProduct(id: number): Promise<boolean>;
  getSnapshotProductsBySnapshotId(snapshotId: number): Promise<SnapshotProduct[]>;

  // --- Existing Expense methods ---
  getExpense(id: number): Promise<Expense | undefined>;
  createExpense(expense: InsertExpense): Promise<Expense>;
  updateExpense(id: number, expense: Partial<InsertExpense>): Promise<Expense>;
  deleteExpense(id: number): Promise<boolean>;
  getExpensesBySnapshotId(snapshotId: number): Promise<Expense[]>;

  // --- NEW: Client methods ---
  getClient(id: number): Promise<Client | undefined>;
  getClientByName(name: string): Promise<Client | undefined>;
  createClient(client: InsertClient): Promise<Client>;
  updateClient(id: number, client: Partial<InsertClient>): Promise<Client>;
  deleteClient(id: number): Promise<boolean>;
  getAllClients(): Promise<Client[]>;

  // --- NEW: Project methods ---
  getProject(id: number): Promise<Project | undefined>;
  getProjectsByClient(clientId: number): Promise<Project[]>;
  createProject(project: InsertProject): Promise<Project>;
  updateProject(id: number, project: Partial<InsertProject>): Promise<Project>;
  deleteProject(id: number): Promise<boolean>;
  getAllProjects(): Promise<Project[]>;

  // --- NEW: Service Catalog methods ---
  getServiceCatalogItem(id: number): Promise<ServiceCatalog | undefined>;
  getServiceCatalogItemByName(name: string): Promise<ServiceCatalog | undefined>;
  createServiceCatalogItem(item: InsertServiceCatalog): Promise<ServiceCatalog>;
  updateServiceCatalogItem(id: number, item: Partial<InsertServiceCatalog>): Promise<ServiceCatalog>;
  deleteServiceCatalogItem(id: number): Promise<boolean>;
  getAllServiceCatalogItems(): Promise<ServiceCatalog[]>;

  // --- NEW: Project Component methods ---
  getProjectComponent(id: number): Promise<ProjectComponent | undefined>;
  getProjectComponentsByProject(projectId: number): Promise<ProjectComponent[]>;
  createProjectComponent(component: InsertProjectComponent): Promise<ProjectComponent>;
  updateProjectComponent(id: number, component: Partial<InsertProjectComponent>): Promise<ProjectComponent>;
  deleteProjectComponent(id: number): Promise<boolean>;

  // --- NEW: Cost methods ---
  getCost(id: number): Promise<Cost | undefined>;
  getCostsByProject(projectId: number): Promise<Cost[]>;
  createCost(cost: InsertCost): Promise<Cost>;
  updateCost(id: number, cost: Partial<InsertCost>): Promise<Cost>;
  deleteCost(id: number): Promise<boolean>;

  // --- NEW: Invoice methods ---
  getInvoice(id: number): Promise<Invoice | undefined>;
  getInvoicesByProject(projectId: number): Promise<Invoice[]>;
  createInvoice(invoice: InsertInvoice): Promise<Invoice>;
  updateInvoice(id: number, invoice: Partial<InsertInvoice>): Promise<Invoice>;
  deleteInvoice(id: number): Promise<boolean>;
  getAllInvoices(): Promise<Invoice[]>;

  // --- NEW: Suppliers methods ---
  importSuppliers(data: InsertSupplier[]): Promise<Supplier[]>;
  getAllSuppliers(): Promise<Supplier[]>;
  updateSupplier(id: number, supplier: Partial<InsertSupplier>): Promise<Supplier>;
  deleteSupplier(id: number): Promise<boolean>;

  // --- NEW: Tender methods ---
  getAllTenders(): Promise<Tender[]>;
  getTender(id: number): Promise<Tender | undefined>;
  createTender(tender: InsertTender): Promise<Tender>;
  updateTender(id: number, tender: Partial<InsertTender>): Promise<Tender>;
  deleteTender(id: number): Promise<boolean>;
}

export class PgStorage implements IStorage {
  // --- Existing Master Product methods ---
  async getMasterProduct(id: number): Promise<MasterProduct | undefined> {
    const result = await db.select().from(masterProducts).where(eq(masterProducts.id, id)).limit(1);
    return result[0];
  }

  async getMasterProductByName(name: string): Promise<MasterProduct | undefined> {
    const result = await db.select().from(masterProducts).where(eq(masterProducts.name, name)).limit(1);
    return result[0];
  }

  async createMasterProduct(product: InsertMasterProduct): Promise<MasterProduct> {
    const result = await db.insert(masterProducts).values(product).returning();
    return result[0];
  }

  async updateMasterProduct(id: number, product: Partial<InsertMasterProduct>): Promise<MasterProduct> {
    const result = await db.update(masterProducts).set(product).where(eq(masterProducts.id, id)).returning();
    if (result.length === 0) {
      throw new Error(`Master product with id ${id} not found or not updated.`);
    }
    return result[0];
  }

  async deleteMasterProduct(id: number): Promise<boolean> {
    const result = await db.delete(masterProducts).where(eq(masterProducts.id, id)).returning({ id: masterProducts.id });
    return result.length > 0;
  }

  async getAllMasterProducts(): Promise<MasterProduct[]> {
    return db.select().from(masterProducts);
  }

  // --- Existing Snapshot methods ---
  async getSnapshot(id: number): Promise<Snapshot | undefined> {
    const result = await db.select().from(snapshots).where(eq(snapshots.id, id)).limit(1);
    return result[0];
  }

  async createSnapshot(snapshot: InsertSnapshot): Promise<Snapshot> {
    // Ensure totalCost and targetProfit are passed correctly to the database
    const result = await db.insert(snapshots).values({
      ...snapshot,
      totalCost: snapshot.totalCost, // Ensure this is a number
      targetProfit: snapshot.targetProfit, // Ensure this is a number
      targetMargin: snapshot.targetMargin, // Ensure this is a number
    }).returning();
    return result[0];
  }

  async updateSnapshot(id: number, snapshot: Partial<InsertSnapshot>): Promise<Snapshot> {
    const result = await db.update(snapshots).set(snapshot).where(eq(snapshots.id, id)).returning();
    if (result.length === 0) {
      throw new Error(`Snapshot with id ${id} not found or not updated.`);
    }
    return result[0];
  }

  async deleteSnapshot(id: number): Promise<boolean> {
    const result = await db.delete(snapshots).where(eq(snapshots.id, id)).returning({ id: snapshots.id });
    return result.length > 0;
  }

  // Implementation for getAllSnapshots
  async getAllSnapshots(): Promise<Snapshot[]> {
    // Select all columns, including totalCost and targetProfit
    return db.select().from(snapshots).where(eq(snapshots.isArchived, false));
  }

  async getArchivedSnapshots(): Promise<Snapshot[]> {
    return db.select().from(snapshots).where(eq(snapshots.isArchived, true));
  }

  async toggleSnapshotArchivedStatus(id: number, isArchived: boolean): Promise<Snapshot> {
    const result = await db.update(snapshots).set({ isArchived }).where(eq(snapshots.id, id)).returning();
    if (result.length === 0) {
      throw new Error(`Snapshot with id ${id} not found.`);
    }
    return result[0];
  }

  // --- Existing Snapshot Product methods ---
  async getSnapshotProduct(id: number): Promise<SnapshotProduct | undefined> {
    const result = await db.select().from(snapshotProducts).where(eq(snapshotProducts.id, id)).limit(1);
    return result[0];
  }

  // Ensure 'price' is included when creating a snapshot product
  async createSnapshotProduct(product: InsertSnapshotProduct): Promise<SnapshotProduct> {
    const result = await db.insert(snapshotProducts).values({
      ...product,
      price: product.price, // Explicitly include the price
      // Ensure other numeric fields like costPerUnit, expectedUnits, revenuePercentage are passed as numbers or converted
      costPerUnit: parseFloat(product.costPerUnit as any),
      expectedUnits: parseInt(product.expectedUnits as any),
      revenuePercentage: parseFloat(product.revenuePercentage as any)
    }).returning();
    return result[0];
  }

  async updateSnapshotProduct(id: number, product: Partial<InsertSnapshotProduct>): Promise<SnapshotProduct> {
    const result = await db.update(snapshotProducts).set(product).where(eq(snapshotProducts.id, id)).returning();
    if (result.length === 0) {
      throw new Error(`Snapshot product with id ${id} not found or not updated.`);
    }
    return result[0];
  }

  async deleteSnapshotProduct(id: number): Promise<boolean> {
    const result = await db.delete(snapshotProducts).where(eq(snapshotProducts.id, id)).returning({ id: snapshotProducts.id });
    return result.length > 0;
  }

  // Ensure 'price' is selected when retrieving snapshot products
  async getSnapshotProductsBySnapshotId(snapshotId: number): Promise<SnapshotProduct[]> {
    return db.select().from(snapshotProducts).where(eq(snapshotProducts.snapshotId, snapshotId));
  }

  // --- Existing Expense methods ---
  async getExpense(id: number): Promise<Expense | undefined> {
    const result = await db.select().from(expenses).where(eq(expenses.id, id)).limit(1);
    return result[0];
  }

  async createExpense(expense: InsertExpense): Promise<Expense> {
    const result = await db.insert(expenses).values(expense).returning();
    return result[0];
  }

  async updateExpense(id: number, expense: Partial<InsertExpense>): Promise<Expense> {
    const result = await db.update(expenses).set(expense).where(eq(expenses.id, id)).returning();
    if (result.length === 0) {
      throw new Error(`Expense with id ${id} not found or not updated.`);
    }
    return result[0];
    }

  async deleteExpense(id: number): Promise<boolean> {
    const result = await db.delete(expenses).where(eq(expenses.id, id)).returning({ id: expenses.id });
    return result.length > 0;
  }

  async getExpensesBySnapshotId(snapshotId: number): Promise<Expense[]> {
    return db.select().from(expenses).where(eq(expenses.snapshotId, snapshotId));
  }

  // --- NEW: Client methods ---
  async getClient(id: number): Promise<Client | undefined> {
    // Assuming client_id is the primary key in your clients table
    const result = await db.select().from(clients).where(eq(clients.client_id, id)).limit(1);
    return result[0];
  }

  async getClientByName(name: string): Promise<Client | undefined> {
    // Assuming client_name is the column for client name
    const result = await db.select().from(clients).where(eq(clients.client_name, name)).limit(1);
    return result[0];
  }

  async createClient(insertClient: InsertClient): Promise<Client> {
    const result = await db.insert(clients).values(insertClient).returning();
    return result[0];
  }

  async updateClient(id: number, updateData: Partial<InsertClient>): Promise<Client> {
    const result = await db.update(clients).set(updateData).where(eq(clients.client_id, id)).returning();
    if (result.length === 0) {
      throw new Error(`Client with id ${id} not found or not updated.`);
    }
    return result[0];
  }

  async deleteClient(id: number): Promise<boolean> {
    const result = await db.delete(clients).where(eq(clients.client_id, id)).returning({ client_id: clients.client_id });
    return result.length > 0;
  }

  // Implementation for getAllClients
  async getAllClients(): Promise<Client[]> {
    return db.select().from(clients);
  }

  // --- NEW: Project methods ---
  async getProject(id: number): Promise<Project | undefined> {
    // Assuming project_id is the primary key in your projects table
    const result = await db.select().from(projects).where(eq(projects.project_id, id)).limit(1);
    return result[0];
  }

  async getProjectsByClient(clientId: number): Promise<Project[]> {
    return db.select().from(projects).where(eq(projects.client_id, clientId));
  }

  async createProject(insertProject: InsertProject): Promise<Project> {
    const result = await db.insert(projects).values(insertProject).returning();
    return result[0];
  }

  async updateProject(id: number, updateData: Partial<InsertProject>): Promise<Project> {
    const result = await db.update(projects).set(updateData).where(eq(projects.project_id, id)).returning();
    if (result.length === 0) {
      throw new Error(`Project with id ${id} not found or not updated.`);
    }
    return result[0];
  }

  async deleteProject(id: number): Promise<boolean> {
    const result = await db.delete(projects).where(eq(projects.project_id, id)).returning({ project_id: projects.project_id });
    return result.length > 0;
  }

  // Implementation for getAllProjects
  async getAllProjects(): Promise<Project[]> {
    return db.select().from(projects);
  }

  // --- NEW: Service Catalog methods ---
  async getServiceCatalogItem(id: number): Promise<ServiceCatalog | undefined> {
    const result = await db.select().from(serviceCatalog).where(eq(serviceCatalog.service_id, id)).limit(1);
    return result[0];
  }

  async getServiceCatalogItemByName(name: string): Promise<ServiceCatalog | undefined> {
    const result = await db.select().from(serviceCatalog).where(eq(serviceCatalog.service_name, name)).limit(1);
    return result[0];
  }

  async createServiceCatalogItem(insertItem: InsertServiceCatalog): Promise<ServiceCatalog> {
    const result = await db.insert(serviceCatalog).values(insertItem).returning();
    return result[0];
  }

  async updateServiceCatalogItem(id: number, updateData: Partial<InsertServiceCatalog>): Promise<ServiceCatalog> {
    const result = await db.update(serviceCatalog).set(updateData).where(eq(serviceCatalog.service_id, id)).returning();
    if (result.length === 0) {
      throw new Error(`Service Catalog Item with id ${id} not found or not updated.`);
    }
    return result[0];
  }

  async deleteServiceCatalogItem(id: number): Promise<boolean> {
    const result = await db.delete(serviceCatalog).where(eq(serviceCatalog.service_id, id)).returning({ service_id: serviceCatalog.service_id });
    return result.length > 0;
  }

  async getAllServiceCatalogItems(): Promise<ServiceCatalog[]> {
    return db.select().from(serviceCatalog);
  }

  // --- NEW: Project Component methods ---
  async getProjectComponent(id: number): Promise<ProjectComponent | undefined> {
    const result = await db.select().from(projectComponents).where(eq(projectComponents.component_id, id)).limit(1);
    return result[0];
  }

  async getProjectComponentsByProject(projectId: number): Promise<ProjectComponent[]> {
    return db.select().from(projectComponents).where(eq(projectComponents.project_id, projectId));
  }

  async createProjectComponent(insertComponent: InsertProjectComponent): Promise<ProjectComponent> {
    const result = await db.insert(projectComponents).values(insertComponent).returning();
    return result[0];
  }

  async updateProjectComponent(id: number, updateData: Partial<InsertProjectComponent>): Promise<ProjectComponent> {
    const result = await db.update(projectComponents).set(updateData).where(eq(projectComponents.component_id, id)).returning();
    if (result.length === 0) {
      throw new Error(`Project component with id ${id} not found or not updated.`);
    }
    return result[0];
  }

  async deleteProjectComponent(id: number): Promise<boolean> {
    const result = await db.delete(projectComponents).where(eq(projectComponents.component_id, id)).returning({ component_id: projectComponents.component_id });
    return result.length > 0;
  }

  // --- NEW: Cost methods ---
  async getCostsByProject(projectId: number): Promise<Cost[]> {
    return db.select().from(costs).where(eq(costs.project_id, projectId));
  }

  async getCost(id: number): Promise<Cost | undefined> {
    const result = await db.select().from(costs).where(eq(costs.cost_id, id)).limit(1);
    return result[0];
  }

  async createCost(insertCost: InsertCost): Promise<Cost> {
    const result = await db.insert(costs).values(insertCost).returning();
    return result[0];
  }

  async updateCost(id: number, updateData: Partial<InsertCost>): Promise<Cost> {
    const result = await db.update(costs).set(updateData).where(eq(costs.cost_id, id)).returning();
    if (result.length === 0) {
      throw new Error(`Cost with id ${id} not found or not updated.`);
    }
    return result[0];
  }

  async deleteCost(id: number): Promise<boolean> {
    const result = await db.delete(costs).where(eq(costs.cost_id, id)).returning({ cost_id: costs.cost_id });
    return result.length > 0;
  }

  // --- NEW: Invoice methods ---
  async getInvoice(id: number): Promise<Invoice | undefined> {
    const result = await db.select().from(invoices).where(eq(invoices.invoice_id, id)).limit(1);
    return result[0];
  }

  async getInvoicesByProject(projectId: number): Promise<Invoice[]> {
    return db.select().from(invoices).where(eq(invoices.project_id, projectId));
  }

  async createInvoice(insertInvoice: InsertInvoice): Promise<Invoice> {
    const result = await db.insert(invoices).values(insertInvoice).returning();
    return result[0];
  }

  async updateInvoice(id: number, updateData: Partial<InsertInvoice>): Promise<Invoice> {
    const result = await db.update(invoices).set(updateData).where(eq(invoices.invoice_id, id)).returning();
    if (result.length === 0) {
      throw new Error(`Invoice with id ${id} not found or not updated.`);
    }
    return result[0];
  }

  async deleteInvoice(id: number): Promise<boolean> {
    const result = await db.delete(invoices).where(eq(invoices.invoice_id, id)).returning({ invoice_id: invoices.invoice_id });
    return result.length > 0;
  }

  async getAllInvoices(): Promise<Invoice[]> {
    return db.select().from(invoices);
  }


// --- NEW: Suppliers methods ---
async importSuppliers(data: InsertSupplier[]): Promise<Supplier[]> {
  if (data.length === 0) return [];
  // `on conflict do nothing` will prevent duplicates based on primary key or unique constraint
  // If you need to update on conflict, use `.onConflictDoUpdate(...)`
  const result = await db.insert(suppliers).values(data).returning();
  return result;
}

async getAllSuppliers(): Promise<Supplier[]> {
  const rows = await db.select().from(suppliers).orderBy(desc(suppliers.id));
  return rows;
}

async updateSupplier(id: number, supplier: Partial<InsertSupplier>): Promise<Supplier> {
  const result = await db.update(suppliers).set(supplier).where(eq(suppliers.id, id)).returning();
  if (result.length === 0) {
    throw new Error(`Supplier with id ${id} not found or not updated.`);
  }
  return result[0];
}

async deleteSupplier(id: number): Promise<boolean> {
  const result = await db.delete(suppliers).where(eq(suppliers.id, id)).returning({ id: suppliers.id });
  return result.length > 0;
}

// --- NEW: Tender methods ---
async getAllTenders(): Promise<Tender[]> {
  const result = await db.select().from(tenders).orderBy(desc(tenders.createdAt));
  // Parse items from JSON string to object array for each tender
  return result.map(tender => ({
    ...tender,
    items: JSON.parse(tender.items as string),
  }));
}

async getTender(id: number): Promise<Tender | undefined> {
  const result = await db.select().from(tenders).where(eq(tenders.id, id)).limit(1);
  if (result.length === 0) {
    return undefined;
  }
  // Parse items from JSON string to object array
  return {
    ...result[0],
    items: JSON.parse(result[0].items as string),
  };
}

async createTender(insertTender: InsertTender): Promise<Tender> {
  // Stringify the 'items' array before saving
  const payload = {
    ...insertTender,
    items: JSON.stringify(insertTender.items || []), // Ensure it's always a stringified array
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  const result = await db.insert(tenders).values(payload).returning();
  // Parse items back before returning
  return {
    ...result[0],
    items: JSON.parse(result[0].items as string),
  };
}

async setAccessPassword(area: "pricing" | "quotations", plain: string): Promise<void> {
  const hash = await bcrypt.hash(plain, 10);
  await db
    .insert(accessPasswords)
    .values({ area, hash, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: accessPasswords.area,
      set: { hash, updatedAt: new Date() },
    });
}

async verifyAccessPassword(area: "pricing" | "quotations", plain: string): Promise<boolean> {
  const row = await db
    .select({ hash: accessPasswords.hash })
    .from(accessPasswords)
    .where(eq(accessPasswords.area, area))
    .limit(1);

  const hash = row[0]?.hash;
  if (!hash) return false;
  return bcrypt.compare(plain, hash);
}
async updateTender(id: number, updateData: Partial<InsertTender>): Promise<Tender> {
  // Stringify 'items' if it's part of the update data
  const payload = { ...updateData } as any;
  if (payload.items !== undefined) {
    payload.items = JSON.stringify(payload.items);
  }
  payload.updatedAt = new Date(); // Update updatedAt on changes

  const result = await db.update(tenders).set(payload).where(eq(tenders.id, id)).returning();
  if (result.length === 0) {
    throw new Error(`Tender with id ${id} not found or not updated.`);
  }
  // Parse items back before returning
  return {
    ...result[0],
    items: JSON.parse(result[0].items as string),
  };
}

async deleteTender(id: number): Promise<boolean> {
  const result = await db.delete(tenders).where(eq(tenders.id, id)).returning({ id: tenders.id });
  return result.length > 0;
}



}

export const storage = new PgStorage();
