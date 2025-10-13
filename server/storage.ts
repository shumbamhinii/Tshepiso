// server/storage.ts
import { eq, desc } from 'drizzle-orm';
import { db } from './db';

import {
  // Core tables + types
  clients, type Client, type InsertClient,
  projects, type Project, type InsertProject,
  serviceCatalog, type ServiceCatalog, type InsertServiceCatalog,
  projectComponents, type ProjectComponent, type InsertProjectComponent,
  costs, type Cost, type InsertCost,
  expenses, type Expense, type InsertExpense,

  // Products & snapshots
  masterProducts, type MasterProduct, type InsertMasterProduct,
  snapshots, type Snapshot, type InsertSnapshot,
  snapshotProducts, type SnapshotProduct, type InsertSnapshotProduct,

  // Invoices (header)
  invoices, type Invoice, type InsertInvoice,

  // Quotations + items
  quotations, type Quotation, type InsertQuotation,
  quotationItems, type QuotationItem, type InsertQuotationItem,

  // Invoice items
  invoiceItems, type InvoiceItem, type InsertInvoiceItem,

  // Suppliers
  suppliers, type Supplier, type InsertSupplier,

  // Tenders
  tenders, type Tender, type InsertTender,

  // Access control
  accessPasswords,
} from "@shared/schema";

import bcrypt from "bcryptjs";

// Define the IStorage interface to include methods for the new tables
export interface IStorage {
  // --- Master Product methods ---
  getMasterProduct(id: number): Promise<MasterProduct | undefined>;
  getMasterProductByName(name: string): Promise<MasterProduct | undefined>;
  createMasterProduct(product: InsertMasterProduct): Promise<MasterProduct>;
  updateMasterProduct(id: number, product: Partial<InsertMasterProduct>): Promise<MasterProduct>;
  deleteMasterProduct(id: number): Promise<boolean>;
  getAllMasterProducts(): Promise<MasterProduct[]>;

  // --- Snapshot methods ---
  getSnapshot(id: number): Promise<Snapshot | undefined>;
  createSnapshot(snapshot: InsertSnapshot): Promise<Snapshot>;
  updateSnapshot(id: number, snapshot: Partial<InsertSnapshot>): Promise<Snapshot>;
  deleteSnapshot(id: number): Promise<boolean>;
  getAllSnapshots(): Promise<Snapshot[]>;
  getArchivedSnapshots(): Promise<Snapshot[]>;
  toggleSnapshotArchivedStatus(id: number, isArchived: boolean): Promise<Snapshot>;

  // --- Snapshot Product methods ---
  getSnapshotProduct(id: number): Promise<SnapshotProduct | undefined>;
  createSnapshotProduct(product: InsertSnapshotProduct): Promise<SnapshotProduct>;
  updateSnapshotProduct(id: number, product: Partial<InsertSnapshotProduct>): Promise<SnapshotProduct>;
  deleteSnapshotProduct(id: number): Promise<boolean>;
  getSnapshotProductsBySnapshotId(snapshotId: number): Promise<SnapshotProduct[]>;

  // --- Expense methods ---
  getExpense(id: number): Promise<Expense | undefined>;
  createExpense(expense: InsertExpense): Promise<Expense>;
  updateExpense(id: number, expense: Partial<InsertExpense>): Promise<Expense>;
  deleteExpense(id: number): Promise<boolean>;
  getExpensesBySnapshotId(snapshotId: number): Promise<Expense[]>;

  // --- Client methods ---
  getClient(id: number): Promise<Client | undefined>;
  getClientByName(name: string): Promise<Client | undefined>;
  createClient(client: InsertClient): Promise<Client>;
  updateClient(id: number, client: Partial<InsertClient>): Promise<Client>;
  deleteClient(id: number): Promise<boolean>;
  getAllClients(): Promise<Client[]>;

  // --- Project methods ---
  getProject(id: number): Promise<Project | undefined>;
  getProjectsByClient(clientId: number): Promise<Project[]>;
  createProject(project: InsertProject): Promise<Project>;
  updateProject(id: number, project: Partial<InsertProject>): Promise<Project>;
  deleteProject(id: number): Promise<boolean>;
  getAllProjects(): Promise<Project[]>;

  // --- Service Catalog methods ---
  getServiceCatalogItem(id: number): Promise<ServiceCatalog | undefined>;
  getServiceCatalogItemByName(name: string): Promise<ServiceCatalog | undefined>;
  createServiceCatalogItem(item: InsertServiceCatalog): Promise<ServiceCatalog>;
  updateServiceCatalogItem(id: number, item: Partial<InsertServiceCatalog>): Promise<ServiceCatalog>;
  deleteServiceCatalogItem(id: number): Promise<boolean>;
  getAllServiceCatalogItems(): Promise<ServiceCatalog[]>;

  // --- Project Component methods ---
  getProjectComponent(id: number): Promise<ProjectComponent | undefined>;
  getProjectComponentsByProject(projectId: number): Promise<ProjectComponent[]>;
  createProjectComponent(component: InsertProjectComponent): Promise<ProjectComponent>;
  updateProjectComponent(id: number, component: Partial<InsertProjectComponent>): Promise<ProjectComponent>;
  deleteProjectComponent(id: number): Promise<boolean>;

  // --- Cost methods ---
  getCost(id: number): Promise<Cost | undefined>;
  getCostsByProject(projectId: number): Promise<Cost[]>;
  createCost(cost: InsertCost): Promise<Cost>;
  updateCost(id: number, cost: Partial<InsertCost>): Promise<Cost>;
  deleteCost(id: number): Promise<boolean>;

  // --- Invoice (header-only) methods (keep for compatibility) ---
  getInvoice(id: number): Promise<Invoice | undefined>;
  getInvoicesByProject(projectId: number): Promise<Invoice[]>;
  createInvoice(invoice: InsertInvoice): Promise<Invoice>;
  updateInvoice(id: number, invoice: Partial<InsertInvoice>): Promise<Invoice>;
  deleteInvoice(id: number): Promise<boolean>;
  getAllInvoices(): Promise<Invoice[]>;

  // --- Quotation (header + items) ---
  getAllQuotations(): Promise<Quotation[]>;
  getQuotation(id: number): Promise<Quotation | undefined>;
  getQuotationWithItems(id: number): Promise<{ header: Quotation; items: QuotationItem[] } | undefined>;

  // ✅ Create expects the nested `{ header, items }` shape
  createQuotationWithItems(q: {
    header: InsertQuotation;
    items: Array<Omit<InsertQuotationItem, "quotationId">>;
  }): Promise<Quotation>;

  // ✅ Update accepts either flat patch or `{ header, items }`
  updateQuotationWithItems(
    id: number,
    q:
      | ({ header?: Partial<InsertQuotation> } & { items?: Array<Omit<InsertQuotationItem, "quotationId">> })
      | (Partial<InsertQuotation> & { items?: Array<Omit<InsertQuotationItem, "quotationId">> })
  ): Promise<Quotation>;

  deleteQuotation(id: number): Promise<boolean>;

  // --- Invoice (header + items) convenience ---
  getInvoiceWithItems(id: number): Promise<{ header: Invoice; items: InvoiceItem[] } | undefined>;
  createInvoiceWithItems(i: InsertInvoice & { items: Array<Omit<InsertInvoiceItem, "invoiceId">> }): Promise<Invoice>;
  updateInvoiceWithItems(id: number, i: Partial<InsertInvoice> & { items?: Array<Omit<InsertInvoiceItem, "invoiceId">> }): Promise<Invoice>;

  // --- Suppliers ---
  importSuppliers(data: InsertSupplier[]): Promise<Supplier[]>;
  getAllSuppliers(): Promise<Supplier[]>;
  updateSupplier(id: number, supplier: Partial<InsertSupplier>): Promise<Supplier>;
  deleteSupplier(id: number): Promise<boolean>;

  // --- Tenders ---
  getAllTenders(): Promise<Tender[]>;
  getTender(id: number): Promise<Tender | undefined>;
  createTender(tender: InsertTender): Promise<Tender>;
  updateTender(id: number, tender: Partial<InsertTender>): Promise<Tender>;
  deleteTender(id: number): Promise<boolean>;

  // --- Access passwords ---
  setAccessPassword(area: "pricing" | "quotations", plain: string): Promise<void>;
  verifyAccessPassword(area: "pricing" | "quotations", plain: string): Promise<boolean>;
}

export class PgStorage implements IStorage {
  // --- Master Products ---
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
    if (result.length === 0) throw new Error(`Master product with id ${id} not found or not updated.`);
    return result[0];
  }
  async deleteMasterProduct(id: number): Promise<boolean> {
    const result = await db.delete(masterProducts).where(eq(masterProducts.id, id)).returning({ id: masterProducts.id });
    return result.length > 0;
  }
  async getAllMasterProducts(): Promise<MasterProduct[]> {
    return db.select().from(masterProducts);
  }

  // --- Snapshots ---
  async getSnapshot(id: number): Promise<Snapshot | undefined> {
    const result = await db.select().from(snapshots).where(eq(snapshots.id, id)).limit(1);
    return result[0];
  }
  async createSnapshot(snapshot: InsertSnapshot): Promise<Snapshot> {
    const result = await db.insert(snapshots).values({
      ...snapshot,
      totalCost: snapshot.totalCost,
      targetProfit: snapshot.targetProfit,
      targetMargin: snapshot.targetMargin,
    }).returning();
    return result[0];
  }
  async updateSnapshot(id: number, snapshot: Partial<InsertSnapshot>): Promise<Snapshot> {
    const result = await db.update(snapshots).set(snapshot).where(eq(snapshots.id, id)).returning();
    if (result.length === 0) throw new Error(`Snapshot with id ${id} not found or not updated.`);
    return result[0];
  }
  async deleteSnapshot(id: number): Promise<boolean> {
    const result = await db.delete(snapshots).where(eq(snapshots.id, id)).returning({ id: snapshots.id });
    return result.length > 0;
  }
  async getAllSnapshots(): Promise<Snapshot[]> {
    return db.select().from(snapshots).where(eq(snapshots.isArchived, false));
  }
  async getArchivedSnapshots(): Promise<Snapshot[]> {
    return db.select().from(snapshots).where(eq(snapshots.isArchived, true));
  }
  async toggleSnapshotArchivedStatus(id: number, isArchived: boolean): Promise<Snapshot> {
    const result = await db.update(snapshots).set({ isArchived }).where(eq(snapshots.id, id)).returning();
    if (result.length === 0) throw new Error(`Snapshot with id ${id} not found.`);
    return result[0];
  }

  // --- Snapshot Products ---
  async getSnapshotProduct(id: number): Promise<SnapshotProduct | undefined> {
    const result = await db.select().from(snapshotProducts).where(eq(snapshotProducts.id, id)).limit(1);
    return result[0];
  }
  async createSnapshotProduct(product: InsertSnapshotProduct): Promise<SnapshotProduct> {
    const result = await db.insert(snapshotProducts).values({
      ...product,
      price: product.price,
      costPerUnit: parseFloat(product.costPerUnit as any),
      expectedUnits: parseInt(product.expectedUnits as any),
      revenuePercentage: parseFloat(product.revenuePercentage as any),
    }).returning();
    return result[0];
  }
  async updateSnapshotProduct(id: number, product: Partial<InsertSnapshotProduct>): Promise<SnapshotProduct> {
    const result = await db.update(snapshotProducts).set(product).where(eq(snapshotProducts.id, id)).returning();
    if (result.length === 0) throw new Error(`Snapshot product with id ${id} not found or not updated.`);
    return result[0];
  }
  async deleteSnapshotProduct(id: number): Promise<boolean> {
    const result = await db.delete(snapshotProducts).where(eq(snapshotProducts.id, id)).returning({ id: snapshotProducts.id });
    return result.length > 0;
  }
  async getSnapshotProductsBySnapshotId(snapshotId: number): Promise<SnapshotProduct[]> {
    return db.select().from(snapshotProducts).where(eq(snapshotProducts.snapshotId, snapshotId));
  }

  // --- Expenses ---
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
    if (result.length === 0) throw new Error(`Expense with id ${id} not found or not updated.`);
    return result[0];
  }
  async deleteExpense(id: number): Promise<boolean> {
    const result = await db.delete(expenses).where(eq(expenses.id, id)).returning({ id: expenses.id });
    return result.length > 0;
  }
  async getExpensesBySnapshotId(snapshotId: number): Promise<Expense[]> {
    return db.select().from(expenses).where(eq(expenses.snapshotId, snapshotId));
  }

  // --- Clients ---
  async getClient(id: number): Promise<Client | undefined> {
    const result = await db.select().from(clients).where(eq(clients.client_id, id)).limit(1);
    return result[0];
  }
  async getClientByName(name: string): Promise<Client | undefined> {
    const result = await db.select().from(clients).where(eq(clients.client_name, name)).limit(1);
    return result[0];
  }
  async createClient(insertClient: InsertClient): Promise<Client> {
    const result = await db.insert(clients).values(insertClient).returning();
    return result[0];
  }
  async updateClient(id: number, updateData: Partial<InsertClient>): Promise<Client> {
    const result = await db.update(clients).set(updateData).where(eq(clients.client_id, id)).returning();
    if (result.length === 0) throw new Error(`Client with id ${id} not found or not updated.`);
    return result[0];
  }
  async deleteClient(id: number): Promise<boolean> {
    const result = await db.delete(clients).where(eq(clients.client_id, id)).returning({ client_id: clients.client_id });
    return result.length > 0;
  }
  async getAllClients(): Promise<Client[]> {
    return db.select().from(clients);
  }

  // --- Projects ---
  async getProject(id: number): Promise<Project | undefined> {
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
    if (result.length === 0) throw new Error(`Project with id ${id} not found or not updated.`);
    return result[0];
  }
  async deleteProject(id: number): Promise<boolean> {
    const result = await db.delete(projects).where(eq(projects.project_id, id)).returning({ project_id: projects.project_id });
    return result.length > 0;
  }
  async getAllProjects(): Promise<Project[]> {
    return db.select().from(projects);
  }

  // --- Service Catalog ---
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
    if (result.length === 0) throw new Error(`Service Catalog Item with id ${id} not found or not updated.`);
    return result[0];
  }
  async deleteServiceCatalogItem(id: number): Promise<boolean> {
    const result = await db.delete(serviceCatalog).where(eq(serviceCatalog.service_id, id)).returning({ service_id: serviceCatalog.service_id });
    return result.length > 0;
  }
  async getAllServiceCatalogItems(): Promise<ServiceCatalog[]> {
    return db.select().from(serviceCatalog);
  }

  // --- Project Components ---
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
    if (result.length === 0) throw new Error(`Project component with id ${id} not found or not updated.`);
    return result[0];
  }
  async deleteProjectComponent(id: number): Promise<boolean> {
    const result = await db.delete(projectComponents).where(eq(projectComponents.component_id, id)).returning({ component_id: projectComponents.component_id });
    return result.length > 0;
  }

  // --- Costs ---
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
    if (result.length === 0) throw new Error(`Cost with id ${id} not found or not updated.`);
    return result[0];
  }
  async deleteCost(id: number): Promise<boolean> {
    const result = await db.delete(costs).where(eq(costs.cost_id, id)).returning({ cost_id: costs.cost_id });
    return result.length > 0;
  }

  // --- Invoices (header only) ---
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
    if (result.length === 0) throw new Error(`Invoice with id ${id} not found or not updated.`);
    return result[0];
  }
  async deleteInvoice(id: number): Promise<boolean> {
    const result = await db.delete(invoices).where(eq(invoices.invoice_id, id)).returning({ invoice_id: invoices.invoice_id });
    return result.length > 0;
  }
  async getAllInvoices(): Promise<Invoice[]> {
    return db.select().from(invoices);
  }

  // --- Suppliers ---
  async importSuppliers(data: InsertSupplier[]): Promise<Supplier[]> {
    if (data.length === 0) return [];
    const result = await db.insert(suppliers).values(data).returning();
    return result;
  }
  async getAllSuppliers(): Promise<Supplier[]> {
    const rows = await db.select().from(suppliers).orderBy(desc(suppliers.id));
    return rows;
  }
  async updateSupplier(id: number, supplier: Partial<InsertSupplier>): Promise<Supplier> {
    const result = await db.update(suppliers).set(supplier).where(eq(suppliers.id, id)).returning();
    if (result.length === 0) throw new Error(`Supplier with id ${id} not found or not updated.`);
    return result[0];
  }
  async deleteSupplier(id: number): Promise<boolean> {
    const result = await db.delete(suppliers).where(eq(suppliers.id, id)).returning({ id: suppliers.id });
    return result.length > 0;
  }

  // --- Tenders ---
  async getAllTenders(): Promise<Tender[]> {
    const result = await db.select().from(tenders).orderBy(desc(tenders.createdAt));
    return result.map(tender => ({
      ...tender,
      items: JSON.parse(tender.items as string),
    }));
  }
  async getTender(id: number): Promise<Tender | undefined> {
    const result = await db.select().from(tenders).where(eq(tenders.id, id)).limit(1);
    if (result.length === 0) return undefined;
    return { ...result[0], items: JSON.parse(result[0].items as string) };
  }
  async createTender(insertTender: InsertTender): Promise<Tender> {
    const payload = {
      ...insertTender,
      items: JSON.stringify(insertTender.items || []),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const result = await db.insert(tenders).values(payload).returning();
    return { ...result[0], items: JSON.parse(result[0].items as string) };
  }
  async updateTender(id: number, updateData: Partial<InsertTender>): Promise<Tender> {
    const payload: any = { ...updateData, updatedAt: new Date() };
    if (payload.items !== undefined) payload.items = JSON.stringify(payload.items);
    const result = await db.update(tenders).set(payload).where(eq(tenders.id, id)).returning();
    if (result.length === 0) throw new Error(`Tender with id ${id} not found or not updated.`);
    return { ...result[0], items: JSON.parse(result[0].items as string) };
  }
  async deleteTender(id: number): Promise<boolean> {
    const result = await db.delete(tenders).where(eq(tenders.id, id)).returning({ id: tenders.id });
    return result.length > 0;
  }

  // --- Access passwords ---
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

  // ---------------- QUOTATIONS (header + items) ----------------
  async getAllQuotations(): Promise<Quotation[]> {
    return db.select().from(quotations).orderBy(desc(quotations.createdAt));
  }
  async getQuotation(id: number): Promise<Quotation | undefined> {
    const r = await db.select().from(quotations).where(eq(quotations.id, id)).limit(1);
    return r[0];
  }
  async getQuotationWithItems(id: number): Promise<{ header: Quotation; items: QuotationItem[] } | undefined> {
    const header = await this.getQuotation(id);
    if (!header) return undefined;
    const items = await db.select().from(quotationItems).where(eq(quotationItems.quotationId, id));
    return { header, items };
  }

  // ✅ expects { header, items }
  async createQuotationWithItems(
    q: { header: InsertQuotation; items: Array<Omit<InsertQuotationItem, "quotationId">> }
  ): Promise<Quotation> {
    const { header: headerIn, items = [] } = q;

    const promoValue =
      typeof (headerIn as any).promo === "object"
        ? JSON.stringify((headerIn as any).promo)
        : (headerIn as any).promo ?? null;

    return db.transaction(async (tx) => {
      const [head] = await tx.insert(quotations).values({
        ...headerIn,
        promo: promoValue,
        createdAt: new Date(),
        updatedAt: new Date(),
      }).returning();
      if (!head) throw new Error("Failed to insert quotation");

      if (items.length) {
        await tx.insert(quotationItems).values(
          items.map(it => ({
            ...it,                 // must include `name`, `quantity`, `unitPrice`
            quotationId: head.id,
            notes: it.notes ?? "",
            quantity: Number(it.quantity || 1),
            unitPrice: Number(it.unitPrice || 0),
          }))
        );
      }
      return head;
    });
  }

  // ✅ accepts either flat or { header, items }
  async updateQuotationWithItems(
    id: number,
    q:
      | ({ header?: Partial<InsertQuotation> } & { items?: Array<Omit<InsertQuotationItem, "quotationId">> })
      | (Partial<InsertQuotation> & { items?: Array<Omit<InsertQuotationItem, "quotationId">> })
  ): Promise<Quotation> {
    const anyQ = q as any;
    const items = anyQ.items as Array<Omit<InsertQuotationItem, "quotationId">> | undefined;

    // Build the patch: prefer nested header if provided
    const patchIn: Partial<InsertQuotation> = anyQ.header
      ? anyQ.header
      : (() => {
          const { items: _omit, ...flat } = anyQ;
          return flat;
        })();

    const promoValue =
      patchIn.promo === undefined
        ? undefined
        : typeof patchIn.promo === "object"
          ? JSON.stringify(patchIn.promo as any)
          : (patchIn.promo as any);

    return db.transaction(async (tx) => {
      const toSet: any = { ...patchIn, updatedAt: new Date() };
      if (promoValue !== undefined) toSet.promo = promoValue;

      const [head] = await tx.update(quotations)
        .set(toSet)
        .where(eq(quotations.id, id))
        .returning();
      if (!head) throw new Error("Quotation not found");

      if (items) {
        await tx.delete(quotationItems).where(eq(quotationItems.quotationId, id));
        if (items.length) {
          await tx.insert(quotationItems).values(
            items.map(it => ({
              ...it,
              quotationId: id,
              notes: it.notes ?? "",
              quantity: Number(it.quantity || 1),
              unitPrice: Number(it.unitPrice || 0),
            }))
          );
        }
      }
      return head;
    });
  }

  async deleteQuotation(id: number): Promise<boolean> {
    const r = await db.delete(quotations).where(eq(quotations.id, id)).returning({ id: quotations.id });
    return r.length > 0;
  }

  // ---------------- INVOICES (header + items) ----------------
  async getInvoiceWithItems(id: number): Promise<{ header: Invoice; items: InvoiceItem[] } | undefined> {
    const header = await this.getInvoice(id);
    if (!header) return undefined;
    const items = await db.select().from(invoiceItems).where(eq(invoiceItems.invoiceId, id));
    return { header, items };
  }
// In server/storage.ts
async createInvoiceWithItems(
  i: InsertInvoice & { items: Array<Omit<InsertInvoiceItem, "invoiceId">> }
): Promise<Invoice> {
  const { items = [], ...headerIn } = i;
  const promoValue =
    typeof (headerIn as any).promo === "object"
      ? JSON.stringify((headerIn as any).promo)
      : (headerIn as any).promo ?? null;

  // *** CRITICAL: Calculate total_amount based on items, costs, and promo ***
  // Calculate from items array
  const itemTotal = items.reduce((sum, item) => sum + (Number(item.unitPrice || 0) * Number(item.quantity || 1)), 0);

  // Get costs from headerIn
  const designCost = Number(headerIn.design_cost || 0);
  const sampleCost = Number(headerIn.sample_cost || 0);
  const handlingCost = Number(headerIn.handling_cost || 0);

  // Calculate discount from promo
  let discountAmount = 0;
  if (promoValue) {
    const promo = typeof promoValue === 'string' ? JSON.parse(promoValue) : promoValue;
    if (promo.type === 'percentage' && promo.value != null) {
      discountAmount = itemTotal * (Number(promo.value) / 100);
    } else if (promo.type === 'fixed' && promo.value != null) {
      discountAmount = Number(promo.value);
    }
    discountAmount = Math.max(0, Math.min(discountAmount, itemTotal)); // Ensure discount doesn't exceed itemTotal
  }

  // Calculate the final grand total
  const calculatedGrandTotal = itemTotal + designCost + sampleCost + handlingCost - discountAmount;

  // Ensure total_amount and grand_total are set to the calculated value
  // This handles the case where the frontend doesn't send them or sends null/undefined
  const totalAmountToSend = calculatedGrandTotal;
  const grandTotalToSend = calculatedGrandTotal;

  // Calculate amount_due based on the calculated total (or use headerIn if explicitly provided)
  const amountDue = (headerIn as any).amount_due ?? calculatedGrandTotal; // Or some other logic if amount_due is different

  // Prepare the object to send to the database
  const headerForDb = {
    ...headerIn,
    amount_due: amountDue,
    total_amount: totalAmountToSend, // Use the calculated value
    grand_total: grandTotalToSend,   // Use the calculated value
    promo: promoValue, // Ensure promo is handled
    // Add other fields that might need defaulting if they are NOT NULL in the DB
    // e.g., design_cost: designCost, // Ensure it's a number
    // e.g., sample_cost: sampleCost,
    // e.g., handling_cost: handlingCost,
  };

  return db.transaction(async (tx) => {
    const [head] = await tx.insert(invoices).values(headerForDb).returning(); // Use the modified object
    if (!head) throw new Error("Failed to insert invoice");

    if (items.length) {
      await tx.insert(invoiceItems).values(
        items.map(it => ({
          ...it,
          invoiceId: head.invoice_id,
          notes: it.notes ?? "",
          quantity: Number(it.quantity || 1),
          unitPrice: Number(it.unitPrice || 0),
        }))
      );
    }
    return head;
  });
}
  async updateInvoiceWithItems(
    id: number,
    patch: Partial<InsertInvoice> & { items?: Array<Omit<InsertInvoiceItem, "invoiceId">> }
  ): Promise<Invoice> {
    const { items, ...patchIn } = patch;
    const promoValue =
      (patchIn as any).promo === undefined
        ? undefined
        : typeof (patchIn as any).promo === "object"
          ? JSON.stringify((patchIn as any).promo)
          : (patchIn as any).promo;

    const setAmountDue =
      (patchIn as any).amount_due !== undefined
        ? (patchIn as any).amount_due
        : (patchIn as any).grandTotal !== undefined
          ? (patchIn as any).grandTotal
          : undefined;

    return db.transaction(async (tx) => {
      const toSet: any = { ...patchIn, updatedAt: new Date() };
      if (promoValue !== undefined) toSet.promo = promoValue;
      if (setAmountDue !== undefined) toSet.amount_due = setAmountDue;

      const [head] = await tx.update(invoices)
        .set(toSet)
        .where(eq(invoices.invoice_id, id))
        .returning();
      if (!head) throw new Error("Invoice not found");

      if (items) {
        await tx.delete(invoiceItems).where(eq(invoiceItems.invoiceId, id));
        if (items.length) {
          await tx.insert(invoiceItems).values(
            items.map(it => ({
              ...it,
              invoiceId: id,
              notes: it.notes ?? "",
              quantity: Number(it.quantity || 1),
              unitPrice: Number(it.unitPrice || 0),
            }))
          );
        }
      }
      return head;
    });
  }
}

export const storage = new PgStorage();
