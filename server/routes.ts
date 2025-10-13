// server/routes.ts
import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import {
  // Existing schemas
  insertExpenseSchema,
  insertMasterProductSchema,
  insertSnapshotProductSchema,
  insertSnapshotSchema,

  // NEW: Import new schemas
  insertClientSchema,
  insertProjectSchema,
  insertServiceCatalogSchema,
  insertProjectComponentSchema,
  insertCostSchema,
  insertInvoiceSchema,
  insertSupplierSchema, // NEW: Import the new insertSupplierSchema
  insertTenderSchema,
  insertQuotationSchema,
  insertQuotationItemSchema,
  insertInvoiceItemSchema, 
   // NEW: Import the new insertTenderSchema
} from "@shared/schema";

import {
  // tables
  bankAccounts,
  terms as termsTable,
  sequences,

  // zod payloads
  insertBankAccountSchema,
  insertTermsSchema,
  sequenceTypeSchema,
} from "@shared/schema";
import { db } from "./db"; // <-- if you already have this elsewhere, keep that
import { eq } from "drizzle-orm";
import { z } from "zod";
import { sendEmail } from "./emailService"; // NEW: Import the email service
import fs from "fs";
import path from "path";
import bcrypt from "bcryptjs";
import { verifyAccessPasswordSchema, insertAccessPasswordSchema } from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  // --- Existing Master Products routes (keep as is) ---
  app.get('/api/master-products', async (req, res, next) => {
    try {
      const masterProducts = await storage.getAllMasterProducts();
      res.json(masterProducts);
    } catch (error) {
      next(error);
    }
  });

  app.get('/api/master-products/:id', async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: 'Invalid Master Product ID' });
      }
      const masterProduct = await storage.getMasterProduct(id);
      if (!masterProduct) {
        return res.status(404).json({ message: 'Master Product not found' });
      }
      res.json(masterProduct);
    } catch (error) {
      next(error);
    }
  });

  app.post('/api/master-products', async (req, res, next) => {
    try {
      const validatedData = insertMasterProductSchema.parse(req.body);
      const masterProduct = await storage.createMasterProduct(validatedData);
      res.status(201).json(masterProduct);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: 'Validation error', errors: error.errors });
      } else {
        next(error);
      }
    }
  });

  app.put('/api/master-products/:id', async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: 'Invalid Master Product ID' });
      }
      const validatedData = insertMasterProductSchema.partial().parse(req.body);
      const masterProduct = await storage.updateMasterProduct(id, validatedData);
      res.json(masterProduct);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: 'Validation error', errors: error.errors });
      } else {
        next(error);
      }
    }
  });

  app.delete('/api/master-products/:id', async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: 'Invalid Master Product ID' });
      }
      const deleted = await storage.deleteMasterProduct(id);
      if (deleted) {
        res.status(204).send();
      } else {
        res.status(404).json({ message: 'Master Product not found' });
      }
    } catch (error) {
      next(error);
    }
  });


  // --- Existing Snapshot routes (keep as is) ---
  app.get('/api/snapshots', async (req, res, next) => {
    try {
      const snapshots = await storage.getAllSnapshots();
      res.json(snapshots);
    } catch (error) {
      next(error);
    }
  });

  app.get('/api/snapshots/archived', async (req, res, next) => {
    try {
      const snapshots = await storage.getArchivedSnapshots();
      res.json(snapshots);
    } catch (error) {
      next(error);
    }
  });

  app.post('/api/snapshots', async (req, res, next) => {
    try {
      const validatedData = insertSnapshotSchema.parse(req.body);
      const snapshot = await storage.createSnapshot(validatedData);
      res.status(201).json(snapshot);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: 'Validation error', errors: error.errors });
      } else {
        next(error);
      }
    }
  });

  app.put('/api/snapshots/:id', async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: 'Invalid Snapshot ID' });
      }
      const validatedData = insertSnapshotSchema.partial().parse(req.body);
      const snapshot = await storage.updateSnapshot(id, validatedData);
      res.json(snapshot);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: 'Validation error', errors: error.errors });
      } else {
        next(error);
      }
    }
  });

  app.delete('/api/snapshots/:id', async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: 'Invalid Snapshot ID' });
      }
      const deleted = await storage.deleteSnapshot(id);
      if (deleted) {
        res.status(204).send();
      } else {
        res.status(404).json({ message: 'Snapshot not found' });
      }
    } catch (error) {
      next(error);
    }
  });

  app.put('/api/snapshots/:id/archive', async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: 'Invalid Snapshot ID' });
      }
      const snapshot = await storage.toggleSnapshotArchivedStatus(id, true);
      res.json(snapshot);
    } catch (error) {
      next(error);
    }
  });

  app.put('/api/snapshots/:id/unarchive', async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: 'Invalid Snapshot ID' });
      }
      const snapshot = await storage.toggleSnapshotArchivedStatus(id, false);
      res.json(snapshot);
    } catch (error) {
      next(error);
    }
  });


  // --- Existing Snapshot Products routes (keep as is) ---
  app.get('/api/snapshots/:snapshotId/products', async (req, res, next) => {
    try {
      const snapshotId = parseInt(req.params.snapshotId);
      if (isNaN(snapshotId)) {
        return res.status(400).json({ message: 'Invalid Snapshot ID' });
      }
      const products = await storage.getSnapshotProductsBySnapshotId(snapshotId);
      res.json(products);
    } catch (error) {
      next(error);
    }
  });

  app.post('/api/snapshots/:snapshotId/products', async (req, res, next) => {
    try {
      const snapshotId = parseInt(req.params.snapshotId);
      if (isNaN(snapshotId)) {
        return res.status(400).json({ message: 'Invalid Snapshot ID' });
      }
      const validatedData = insertSnapshotProductSchema.parse({
        ...req.body,
        snapshotId: snapshotId,
      });
      const product = await storage.createSnapshotProduct(validatedData);
      res.status(201).json(product);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: 'Validation error', errors: error.errors });
      } else {
        next(error);
      }
    }
  });

  app.put('/api/snapshot-products/:id', async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: 'Invalid Snapshot Product ID' });
      }
      const validatedData = insertSnapshotProductSchema.partial().parse(req.body);
      const product = await storage.updateSnapshotProduct(id, validatedData);
      res.json(product);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: 'Validation error', errors: error.errors });
      } else {
        next(error);
      }
    }
  });

  app.delete('/api/snapshot-products/:id', async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: 'Invalid Snapshot Product ID' });
      }
      const deleted = await storage.deleteSnapshotProduct(id);
      if (deleted) {
        res.status(204).send();
      } else {
        res.status(404).json({ message: 'Snapshot Product not found' });
      }
    } catch (error) {
      next(error);
    }
  });


  // --- Existing Expenses routes (keep as is) ---
  app.get('/api/snapshots/:snapshotId/expenses', async (req, res, next) => {
    try {
      const snapshotId = parseInt(req.params.snapshotId);
      if (isNaN(snapshotId)) {
        return res.status(400).json({ message: 'Invalid Snapshot ID' });
      }
      const expenses = await storage.getExpensesBySnapshotId(snapshotId);
      res.json(expenses);
    } catch (error) {
      next(error);
    }
  });

  app.post('/api/snapshots/:snapshotId/expenses', async (req, res, next) => {
    try {
      const snapshotId = parseInt(req.params.snapshotId);
      if (isNaN(snapshotId)) {
        return res.status(400).json({ message: 'Invalid Snapshot ID' });
      }
      const validatedData = insertExpenseSchema.parse({
        ...req.body,
        snapshotId: snapshotId,
      });
      const expense = await storage.createExpense(validatedData);
      res.status(201).json(expense);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: 'Validation error', errors: error.errors });
      } else {
        next(error);
      }
    }
  });

  app.put('/api/expenses/:id', async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: 'Invalid Expense ID' });
      }
      const validatedData = insertExpenseSchema.partial().parse(req.body);
      const expense = await storage.updateExpense(id, validatedData);
      res.json(expense);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: 'Validation error', errors: error.errors });
      } else {
        next(error);
      }
    }
  });

  app.delete('/api/expenses/:id', async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: 'Invalid Expense ID' });
      }
      const deleted = await storage.deleteExpense(id);
      if (deleted) {
        res.status(204).send();
      } else {
        res.status(404).json({ message: 'Expense not found' });
      }
    } catch (error) {
      next(error);
    }
  });

  // --- NEW: Client Routes ---
  app.get('/api/clients', async (req, res, next) => {
    try {
      const clients = await storage.getAllClients();
      res.json(clients);
    } catch (error) {
      next(error);
    }
  });

  app.get('/api/clients/:id', async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: 'Invalid Client ID' });
      }
      const client = await storage.getClient(id);
      if (!client) {
        return res.status(404).json({ message: 'Client not found' });
      }
      res.json(client);
    } catch (error) {
      next(error);
    }
  });

  app.post('/api/clients', async (req, res, next) => {
    try {
      const validatedData = insertClientSchema.parse(req.body);
      const client = await storage.createClient(validatedData);
      res.status(201).json(client);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: 'Validation error', errors: error.errors });
      } else {
        next(error);
      }
    }
  });

  app.put('/api/clients/:id', async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: 'Invalid Client ID' });
      }
      const validatedData = insertClientSchema.partial().parse(req.body);
      const client = await storage.updateClient(id, validatedData);
      res.json(client);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: 'Validation error', errors: error.errors });
      } else {
        next(error);
      }
    }
  });

  app.delete('/api/clients/:id', async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: 'Invalid Client ID' });
      }
      const deleted = await storage.deleteClient(id);
      if (deleted) {
        res.status(204).send();
      } else {
        res.status(404).json({ message: 'Client not found' });
      }
    } catch (error) {
      next(error);
    }
  });

  // --- NEW: Project Routes ---
  app.get('/api/projects', async (req, res, next) => {
    try {
      const projects = await storage.getAllProjects();
      res.json(projects);
    } catch (error) {
      next(error);
    }
  });

  app.get('/api/projects/:id', async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: 'Invalid Project ID' });
      }
      const project = await storage.getProject(id);
      if (!project) {
        return res.status(404).json({ message: 'Project not found' });
      }
      res.json(project);
    } catch (error) {
      next(error);
    }
  });

  app.get('/api/clients/:clientId/projects', async (req, res, next) => {
    try {
      const clientId = parseInt(req.params.clientId);
      if (isNaN(clientId)) {
        return res.status(400).json({ message: 'Invalid Client ID' });
      }
      const projects = await storage.getProjectsByClient(clientId);
      res.json(projects);
    } catch (error) {
      next(error);
    }
  });

  app.post('/api/projects', async (req, res, next) => {
    try {
      const validatedData = insertProjectSchema.parse(req.body);
      const project = await storage.createProject(validatedData);
      res.status(201).json(project);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: 'Validation error', errors: error.errors });
      } else {
        next(error);
      }
    }
  });

  app.put('/api/projects/:id', async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: 'Invalid Project ID' });
      }
      const validatedData = insertProjectSchema.partial().parse(req.body);
      const project = await storage.updateProject(id, validatedData);
      res.json(project);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: 'Validation error', errors: error.errors });
      } else {
        next(error);
      }
    }
  });

  app.delete('/api/projects/:id', async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: 'Invalid Project ID' });
      }
      const deleted = await storage.deleteProject(id);
      if (deleted) {
        res.status(204).send();
      } else {
        res.status(404).json({ message: 'Project not found' });
      }
    } catch (error) {
      next(error);
    }
  });

  // --- NEW: Service Catalog Routes ---
  app.get('/api/service-catalog', async (req, res, next) => {
    try {
      const items = await storage.getAllServiceCatalogItems();
      res.json(items);
    } catch (error) {
      next(error);
    }
  });

  app.get('/api/service-catalog/:id', async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: 'Invalid Service Catalog Item ID' });
      }
      const item = await storage.getServiceCatalogItem(id);
      if (!item) {
        return res.status(404).json({ message: 'Service Catalog Item not found' });
      }
      res.json(item);
    } catch (error) {
      next(error);
    }
  });

  app.post('/api/service-catalog', async (req, res, next) => {
    try {
      const validatedData = insertServiceCatalogSchema.parse(req.body);
      const item = await storage.createServiceCatalogItem(validatedData);
      res.status(201).json(item);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: 'Validation error', errors: error.errors });
      } else {
        next(error);
      }
    }
  });

  app.put('/api/service-catalog/:id', async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: 'Invalid Service Catalog Item ID' });
      }
      const validatedData = insertServiceCatalogSchema.partial().parse(req.body);
      const item = await storage.updateServiceCatalogItem(id, validatedData);
      res.json(item);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: 'Validation error', errors: error.errors });
      } else {
        next(error);
      }
    }
  });

  app.delete('/api/service-catalog/:id', async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: 'Invalid Service Catalog Item ID' });
      }
      const deleted = await storage.deleteServiceCatalogItem(id);
      if (deleted) {
        res.status(204).send();
      } else {
        res.status(404).json({ message: 'Service Catalog Item not found' });
      }
    } catch (error) {
      next(error);
    }
  });

  // --- NEW: Project Component Routes ---
  app.get('/api/projects/:projectId/components', async (req, res, next) => {
    try {
      const projectId = parseInt(req.params.projectId);
      if (isNaN(projectId)) {
        return res.status(400).json({ message: 'Invalid Project ID' });
      }
      const components = await storage.getProjectComponentsByProject(projectId);
      res.json(components);
    } catch (error) {
      next(error);
    }
  });

  app.post('/api/projects/:projectId/components', async (req, res, next) => {
    try {
      const projectId = parseInt(req.params.projectId);
      if (isNaN(projectId)) {
        return res.status(400).json({ message: 'Invalid Project ID' });
      }
      const validatedData = insertProjectComponentSchema.parse({
        ...req.body,
        project_id: projectId,
      });
      const component = await storage.createProjectComponent(validatedData);
      res.status(201).json(component);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: 'Validation error', errors: error.errors });
      } else {
        next(error);
      }
    }
  });

  app.put('/api/project-components/:id', async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: 'Invalid Project Component ID' });
      }
      const validatedData = insertProjectComponentSchema.partial().parse(req.body);
      const component = await storage.updateProjectComponent(id, validatedData);
      res.json(component);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: 'Validation error', errors: error.errors });
      } else {
        next(error);
      }
    }
  });

  app.delete('/api/project-components/:id', async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: 'Invalid Project Component ID' });
      }
      const deleted = await storage.deleteProjectComponent(id);
      if (deleted) {
        res.status(204).send();
      } else {
        res.status(404).json({ message: 'Project Component not found' });
      }
    } catch (error) {
      next(error);
    }
  });

  // --- NEW: Cost Routes ---
  app.get('/api/projects/:projectId/costs', async (req, res, next) => {
    try {
      const projectId = parseInt(req.params.projectId);
      if (isNaN(projectId)) {
        return res.status(400).json({ message: 'Invalid Project ID' });
      }
      const costs = await storage.getCostsByProject(projectId);
      res.json(costs);
    } catch (error) {
      next(error);
    }
  });

  app.post('/api/projects/:projectId/costs', async (req, res, next) => {
    try {
      const projectId = parseInt(req.params.projectId);
      if (isNaN(projectId)) {
        return res.status(400).json({ message: 'Invalid Project ID' });
      }
      const validatedData = insertCostSchema.parse({
        ...req.body,
        project_id: projectId, // Ensure project_id is correctly set from URL param
      });
      const cost = await storage.createCost(validatedData);
      res.status(201).json(cost);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: 'Validation error', errors: error.errors });
      } else {
        next(error);
      }
    }
  });

  app.put('/api/costs/:id', async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: 'Invalid Cost ID' });
      }
      const validatedData = insertCostSchema.partial().parse(req.body);
      const cost = await storage.updateCost(id, validatedData);
      res.json(cost);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: 'Validation error', errors: error.errors });
      } else {
        next(error);
      }
    }
  });

  app.delete('/api/costs/:id', async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: 'Invalid Cost ID' });
      }
      const deleted = await storage.deleteCost(id);
      if (deleted) {
        res.status(204).send();
      } else {
        res.status(404).json({ message: 'Cost not found' });
      }
    } catch (error) {
      next(error);
    }
  });

  // --- NEW: Invoice Routes ---
  app.get('/api/invoices', async (req, res, next) => {
    try {
      const invoices = await storage.getAllInvoices();
      res.json(invoices);
    } catch (error) {
      next(error);
    }
  });

  app.get('/api/invoices/:id', async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: 'Invalid Invoice ID' });
      }
      const invoice = await storage.getInvoice(id);
      if (!invoice) {
        return res.status(404).json({ message: 'Invoice not found' });
      }
      res.json(invoice);
    } catch (error) {
      next(error);
    }
  });

  app.get('/api/projects/:projectId/invoices', async (req, res, next) => {
    try {
      const projectId = parseInt(req.params.projectId);
      if (isNaN(projectId)) {
        return res.status(400).json({ message: 'Invalid Project ID' });
      }
      const invoices = await storage.getInvoicesByProject(projectId);
      res.json(invoices);
    } catch (error) {
      next(error);
    }
  });

// helper: get next sequence value using your existing DB function
// helper: get next sequence value using your existing DB function
async function getNextSequenceValue(kind: "invoice" | "quotation") {
  // SAFER VERSION: use a direct interpolated query
  const result: any = await db.execute(
    `SELECT tbs.next_sequence('${kind}') AS next`
  );

  const nextValue =
    (result?.rows && result.rows[0]?.next) ??
    (Array.isArray(result) && result[0]?.next) ??
    null;

  if (nextValue == null) throw new Error("Could not get next sequence value");
  return Number(nextValue);
}


/* -------------------- INVOICES (simple) -------------------- */
app.post('/api/invoices', async (req, res, next) => {
  try {
    const validatedData = insertInvoiceSchema.parse(req.body);

    // Generate "Invoice X" from the DB sequence
    const next = await getNextSequenceValue("invoice");
    const invoiceNameFromSequence = `Invoice ${next}`;

    // Add invoice_number to the payload
    // NOTE: Your DB must have a column named invoice_number (snake_case).
    // If not, add a migration for it.
    const invoice = await storage.createInvoice({
      ...validatedData,
      // store both snake_case (DB) and camelCase (in case your schema maps it)
      // Drizzle will only send what exists in your schema.
  invoice_number: invoiceNameFromSequence, // <--- This line adds the invoice_number
  invoiceNumber: invoiceNameFromSequence,
    } as any);

    res.status(201).json(invoice);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ message: 'Validation error', errors: error.errors });
    } else {
      next(error);
    }
  }
});

app.put('/api/invoices/:id', async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: 'Invalid Invoice ID' });
    }

    const validatedData = insertInvoiceSchema.partial().parse(req.body);

    // Prevent accidental renaming of the invoice number unless you *want* to allow it.
    const { invoice_number, invoiceNumber, ...rest } = validatedData as any;

    const invoice = await storage.updateInvoice(id, rest);
    res.json(invoice);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ message: 'Validation error', errors: error.errors });
    } else {
      next(error);
    }
  }
});

app.delete('/api/invoices/:id', async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: 'Invalid Invoice ID' });
    }
    const deleted = await storage.deleteInvoice(id);
    if (deleted) {
      res.status(204).send();
    } else {
      res.status(404).json({ message: 'Invoice not found' });
    }
  } catch (error) {
    next(error);
  }
});

  // NEW: Route to send email for documents (quotations/invoices)
  app.post('/api/send-document-email', async (req, res, next) => {
    try {
      const { recipientEmail, subject, htmlBody, customerName, documentType } = req.body;

      // Basic validation for incoming data
      if (!recipientEmail || !subject || !htmlBody || !customerName || !documentType) {
        return res.status(400).json({ message: 'Missing required email parameters (recipientEmail, subject, htmlBody, customerName, documentType).' });
      }

      // Call the sendEmail function from your emailService
      await sendEmail({
        to: recipientEmail,
        subject: subject,
        html: htmlBody,
        // You can optionally add a 'from' address here if it's different from your EMAIL_SERVICE_USER
        // from: "your_company_noreply@example.com"
      });

      res.status(200).json({ message: `${documentType} sent successfully to ${customerName}.` });
    } catch (error: any) {
      console.error("Error in /api/send-document-email route:", error);
      // Pass the error to the global error handler defined in index.ts
      next(error);
    }
  });
// --- Suppliers: edit/delete individual item ---
app.put('/api/suppliers/:id', async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: 'Invalid Supplier ID' });
    }
    // Validate the incoming data against the schema
    const validatedData = insertSupplierSchema.partial().parse(req.body);
    const updated = await storage.updateSupplier(id, validatedData);
    if (!updated) {
      return res.status(404).json({ message: 'Supplier not found' });
    }
    res.json(updated);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ message: 'Validation error', errors: error.errors });
    } else {
      next(error);
    }
  }
});

app.delete('/api/suppliers/:id', async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: 'Invalid Supplier ID' });
    }
    const deleted = await storage.deleteSupplier(id);
    if (!deleted) {
      return res.status(404).json({ message: 'Supplier not found' });
    }
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});
  // --- Suppliers: list all (for UI boot) ---
app.get('/api/suppliers', async (_req, res, next) => {
  try {
    const suppliers = await storage.getAllSuppliers();
    res.json(suppliers);
  } catch (err) {
    next(err);
  }
});

// --- Suppliers: search (name/SKU/supplier), with paging ---
app.get('/api/suppliers/search', async (req, res, next) => {
  try {
    const q = String(req.query.q ?? '').trim();
    const supplier = String(req.query.supplier ?? '').trim();
    const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit ?? '25')) || 25));
    const offset = Math.max(0, parseInt(String(req.query.offset ?? '0')) || 0);

    // Using storage.getAllSuppliers and filtering in memory for simplicity as drizzle-orm's
    // advanced filtering/ordering for complex queries can require extensive setup.
    // For large datasets, direct database query with appropriate WHERE/LIKE/LIMIT/OFFSET would be more efficient.
    const all = await storage.getAllSuppliers(); // Fetch all and filter in memory
    const ql = q.toLowerCase();
    const filtered = (all || []).filter((r: any) => {
      if (supplier && supplier.toLowerCase() !== 'all' && r.supplierName !== supplier) return false;
      if (!ql) return true;
      const hay = [r.productName, r.sku, r.supplierName, r.unit].filter(Boolean).join(' ').toLowerCase();
      return hay.includes(ql);
    });

    // Apply sorting in memory, as orderBy on non-indexed columns might cause issues
    filtered.sort((a: any, b: any) => {
      const nameA = (a.productName || '').toLowerCase();
      const nameB = (b.productName || '').toLowerCase();
      if (nameA < nameB) return -1;
      if (nameA > nameB) return 1;
      return (a.price || 0) - (b.price || 0); // Then by price
    });

    res.json(filtered.slice(offset, offset + limit));
  } catch (err) {
    next(err);
  }
});

 // --- Existing Snapshot Products routes ---
  app.get('/api/snapshots/:snapshotId/products', async (req, res, next) => {
    try {
      const snapshotId = parseInt(req.params.snapshotId);
      if (isNaN(snapshotId)) {
        return res.status(400).json({ message: 'Invalid Snapshot ID' });
      }
      // This calls storage.getSnapshotProductsBySnapshotId which should now select 'price'
      const products = await storage.getSnapshotProductsBySnapshotId(snapshotId);
      res.json(products);
    } catch (error) {
      next(error);
    }
  });

  app.post('/api/snapshots/:snapshotId/products', async (req, res, next) => {
    try {
      const snapshotId = parseInt(req.params.snapshotId);
      if (isNaN(snapshotId)) {
        return res.status(400).json({ message: 'Invalid Snapshot ID' });
      }
      // Ensure that insertSnapshotProductSchema validation includes 'price'
      const validatedData = insertSnapshotProductSchema.parse({
        ...req.body,
        snapshotId: snapshotId,
      });
      // This calls storage.createSnapshotProduct which should now save 'price'
      const product = await storage.createSnapshotProduct(validatedData);
      res.status(201).json(product);
    } catch (error) {
      if (error instanceof z.ZodError) {
        // If 'price' is missing or invalid in the schema, Zod will catch it here
        res.status(400).json({ message: 'Validation error for snapshot product', errors: error.errors });
      } else {
        next(error);
      }
    }
  });

  app.put('/api/snapshot-products/:id', async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: 'Invalid Snapshot Product ID' });
      }
      // Ensure that insertSnapshotProductSchema.partial() validation includes 'price'
      const validatedData = insertSnapshotProductSchema.partial().parse(req.body);
      const product = await storage.updateSnapshotProduct(id, validatedData);
      res.json(product);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: 'Validation error for snapshot product update', errors: error.errors });
      } else {
        next(error);
      }
    }
  });

// NEW: Route to import supplier data
app.post('/api/suppliers/import', async (req, res, next) => {
  try {
    // Accept either a bare array or a wrapped payload { suppliers: [...] }
    const payload = Array.isArray(req.body) ? req.body : req.body?.suppliers;

    if (!Array.isArray(payload) || payload.length === 0) {
      return res.status(400).json({
        message: 'Validation error during supplier import',
        errors: [{ path: ['body'], message: 'Expected an array of suppliers or { suppliers: [...] }' }],
        hint: 'Send either [...] or { "suppliers": [...] }',
      });
    }

    // Validate against the shared InsertSupplier schema
    const parsed = z.array(insertSupplierSchema).safeParse(payload);

    if (!parsed.success) {
      // Return Zod issues so the client can display exact errors per field
      return res.status(400).json({
        message: 'Validation error during supplier import',
        errors: parsed.error.issues,
        sample: payload.slice(0, 2),
      });
    }

    const importedSuppliers = await storage.importSuppliers(parsed.data);
    res.status(201).json(importedSuppliers);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        message: 'Validation error during supplier import',
        errors: error.errors,
      });
    }
    console.error("Error in /api/suppliers/import route:", error);
    next(error);
  }
});

// --- NEW: Tender Routes ---
app.get('/api/tenders', async (req, res, next) => {
  try {
    const tenders = await storage.getAllTenders();
    res.json(tenders);
  } catch (error) {
    next(error);
  }
});

app.get('/api/tenders/:id', async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: 'Invalid Tender ID' });
    }
    const tender = await storage.getTender(id);
    if (!tender) {
      return res.status(404).json({ message: 'Tender not found' });
    }
    res.json(tender);
  } catch (error) {
    next(error);
  }
});

app.post('/api/tenders', async (req, res, next) => {
  try {
    const validatedData = insertTenderSchema.parse(req.body);
    const tender = await storage.createTender(validatedData);
    res.status(201).json(tender);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ message: 'Validation error', errors: error.errors });
    } else {
      next(error);
    }
  }
});

app.put('/api/tenders/:id', async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: 'Invalid Tender ID' });
    }
    const validatedData = insertTenderSchema.partial().parse(req.body);
    const tender = await storage.updateTender(id, validatedData);
    res.json(tender);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ message: 'Validation error', errors: error.errors });
    } else {
      next(error);
    }
  }
});

app.delete('/api/tenders/:id', async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: 'Invalid Tender ID' });
    }
    const deleted = await storage.deleteTender(id);
    if (deleted) {
      res.status(204).send();
    } else {
      res.status(404).json({ message: 'Tender not found' });
    }
  } catch (error) {
    next(error);
  }
});




type Area = "pricing" | "quotations";

const VerifySchema = z.object({
  area: z.enum(["pricing", "quotations"]),
  password: z.string().min(1),
});

const SetSchema = z.object({
  area: z.enum(["pricing", "quotations"]),
  newPassword: z.string().min(6),
});

async function getAccessHash(area: Area) {
  const rows = await db
    .select({ hash: accessPasswords.hash })
    .from(accessPasswords)
    .where(eq(accessPasswords.area, area))
    .limit(1);
  return rows[0]?.hash ?? null;
}

async function setAccessPasswordDB(area: Area, plain: string) {
  const hash = await bcrypt.hash(plain, 10);
  // upsert by area
  await db
    .insert(accessPasswords)
    .values({ area, hash })
    .onConflictDoUpdate({
      target: accessPasswords.area,
      set: { hash, updatedAt: new Date() },
    });
  return true;
}

async function verifyAccessPasswordDB(area: Area, plain: string) {
  const hash = await getAccessHash(area);
  return hash ? bcrypt.compare(plain, hash) : false;
}

// Verify (used by Home.tsx modal)
app.post("/api/passwords/verify", async (req, res, next) => {
  try {
    const { area, password } = verifyAccessPasswordSchema.parse(req.body || {});
    const ok = await storage.verifyAccessPassword(area, password);
    if (!ok) return res.status(401).json({ ok: false, message: "Incorrect password" });
    res.json({ ok: true });
  } catch (e) {
    if (e instanceof z.ZodError) return res.status(400).json({ ok:false, message:"Validation error", errors:e.errors });
    next(e);
  }
});

app.post("/api/passwords/set", async (req, res, next) => {
  try {
    const adminKey = req.header("x-admin-key");
    if (!process.env.ADMIN_PANEL_KEY || adminKey !== process.env.ADMIN_PANEL_KEY) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    const { area, newPassword } = insertAccessPasswordSchema.parse(req.body || {});
    await storage.setAccessPassword(area, newPassword);
    res.json({ message: `Password updated for ${area}` });
  } catch (e) {
    if (e instanceof z.ZodError) return res.status(400).json({ message:"Validation error", errors:e.errors });
    next(e);
  }
});

// --- NEW: Bank Accounts Routes ---

// List bank accounts (optionally filter ?active=true/false)
app.get("/api/bank-accounts", async (req, res, next) => {
  try {
    const activeParam = String(req.query.active ?? "").toLowerCase();
    let rows = await db.select().from(bankAccounts);

    if (activeParam === "true") {
      rows = rows.filter((r) => r.isActive === true);
    } else if (activeParam === "false") {
      rows = rows.filter((r) => r.isActive === false);
    }

    res.json(rows);
  } catch (err) {
    next(err);
  }
});

// Create bank account
app.post("/api/bank-accounts", async (req, res, next) => {
  try {
    const data = insertBankAccountSchema.parse(req.body);
    const [row] = await db.insert(bankAccounts).values(data).returning();
    res.status(201).json(row);
  } catch (e) {
    if (e instanceof z.ZodError) {
      return res.status(400).json({ message: "Validation error", errors: e.errors });
    }
    next(e);
  }
});

// Update bank account
app.put("/api/bank-accounts/:id", async (req, res, next) => {
  try {
    const id = String(req.params.id);
    const data = insertBankAccountSchema.partial().parse(req.body);
    const [row] = await db.update(bankAccounts).set(data).where(eq(bankAccounts.id, id)).returning();
    if (!row) return res.status(404).json({ message: "Bank account not found" });
    res.json(row);
  } catch (e) {
    if (e instanceof z.ZodError) {
      return res.status(400).json({ message: "Validation error", errors: e.errors });
    }
    next(e);
  }
});

// Delete bank account
app.delete("/api/bank-accounts/:id", async (req, res, next) => {
  try {
    const id = String(req.params.id);
    const [row] = await db.delete(bankAccounts).where(eq(bankAccounts.id, id)).returning();
    if (!row) return res.status(404).json({ message: "Bank account not found" });
    res.status(204).send();
  } catch (e) {
    next(e);
  }
});

// Toggle active
app.post("/api/bank-accounts/:id/toggle", async (req, res, next) => {
  try {
    const id = String(req.params.id);
    const existing = await db.select().from(bankAccounts).where(eq(bankAccounts.id, id)).limit(1);
    if (!existing[0]) return res.status(404).json({ message: "Bank account not found" });

    const [row] = await db
      .update(bankAccounts)
      .set({ isActive: !existing[0].isActive })
      .where(eq(bankAccounts.id, id))
      .returning();

    res.json(row);
  } catch (e) {
    next(e);
  }
});

// --- NEW: Terms & Conditions Routes ---

app.get("/api/terms", async (_req, res, next) => {
  try {
    const [row] = await db.select().from(termsTable).where(eq(termsTable.id, "singleton")).limit(1);
    // If DB bootstrap hasn’t inserted it yet, return an empty default
    res.json(row ?? { id: "singleton", body: "", createdAt: new Date(), updatedAt: new Date() });
  } catch (e) {
    next(e);
  }
});

app.put("/api/terms", async (req, res, next) => {
  try {
    const { body } = insertTermsSchema.pick({ body: true }).parse(req.body);
    const [row] = await db
      .update(termsTable)
      .set({ body, updatedAt: new Date() })
      .where(eq(termsTable.id, "singleton"))
      .returning();

    // If the row somehow didn’t exist, create it
    if (!row) {
      const [created] = await db
        .insert(termsTable)
        .values({ id: "singleton", body })
        .returning();
      return res.json(created);
    }
    res.json(row);
  } catch (e) {
    if (e instanceof z.ZodError) {
      return res.status(400).json({ message: "Validation error", errors: e.errors });
    }
    next(e);
  }
});

// --- NEW: Sequences Routes ---

// Peek the next number WITHOUT incrementing
// GET /api/sequences/peek?type=quotation|invoice
app.get("/api/sequences/peek", async (req, res, next) => {
  try {
    const type = (String(req.query.type || "quotation") as "quotation" | "invoice");
    if (!["quotation", "invoice"].includes(type)) {
      return res.status(400).json({ message: "Invalid type. Use 'quotation' or 'invoice'." });
    }

    const [row] = await db.select().from(sequences).where(eq(sequences.id, type)).limit(1);
    const nextVal = row ? row.current + 1 : 1;
    res.json({ next: nextVal });
  } catch (e) {
    next(e);
  }
});

// Atomically get the next number AND increment counter
// POST /api/sequences/next  { "type": "quotation" | "invoice" }
// GOOD: routes.ts
app.post("/api/sequences/next", async (req, res, next) => {
  try {
    // Expect { type: "quotation" | "invoice" }
    const { type } = z.object({ type: sequenceTypeSchema }).parse(req.body);

    const result: any = await db.execute(`SELECT tbs.next_sequence('${type}') AS next`);

    const nextValue =
      (result?.rows && result.rows[0]?.next) ??
      (Array.isArray(result) && result[0]?.next) ??
      null;

    if (nextValue == null) {
      return res.status(500).json({ message: "Could not get next sequence value" });
    }

    res.json({ next: Number(nextValue) });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return res.status(400).json({ message: "Validation error", errors: e.errors });
    }
    next(e);
  }
});


// --- NEW: Quotations with Items ---
app.get('/api/quotations', async (req, res, next) => {
  try {
    const quotations = await storage.getAllQuotations();
    res.json(quotations);
  } catch (err) {
    next(err);
  }
});

app.get('/api/quotations/:id', async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: 'Invalid quotation ID' });

    const data = await storage.getQuotationWithItems(id);
    if (!data) return res.status(404).json({ message: 'Quotation not found' });

    res.json(data);
  } catch (err) {
    next(err);
  }
});

// routes.ts
// POST /api/quotations  — expects { header, items }
// routes.ts
// routes.ts  (inside POST /api/quotations)
// routes.ts
app.post('/api/quotations', async (req, res, next) => {
  try {
    const body = { ...req.body };

    // promo: accept object or string anywhere and stringify
    const coercePromoToString = (p: any) =>
      typeof p === 'string' ? p : (p ? JSON.stringify(p) : undefined);

    // accept both shapes: { header, items } OR flat + items
    const headerSource = body.header ?? body;

    const header = {
      displayName: headerSource.displayName,
      customerName: headerSource.customerName,
      customerEmail: headerSource.customerEmail,
      customerPhone: headerSource.customerPhone,
      quoteDate: headerSource.quoteDate ?? null,     // keep as string (YYYY-MM-DD)
      validUntil: headerSource.validUntil ?? null,   // keep as string
      designCost: Number(headerSource.designCost ?? 0),
      sampleCost: Number(headerSource.sampleCost ?? 0),
      handlingCost: Number(headerSource.handlingCost ?? 0),
      grandTotal: Number(headerSource.grandTotal ?? 0),
      status: headerSource.status ?? 'draft',
      promo: coercePromoToString(headerSource.promo),
    };

    // items may come under body.items or header.items
    const rawItems = (body.items ?? headerSource.items ?? []) as any[];
    const itemCompat = z.object({
      // IMPORTANT: DB column is "name"
      name: z.string().min(1),
      quantity: z.coerce.number().int().positive(),
      unitPrice: z.coerce.number().nonnegative(),
      notes: z.string().optional().nullable(),
    });

    // normalize from UI names
    const items = rawItems.map(it => ({
      name: String(it.name ?? it.productName ?? '').trim(), // <-- normalize here
      quantity: Number(it.quantity ?? 0),
      unitPrice: Number(it.unitPrice ?? it.price ?? 0),
      notes: (it.notes ?? '') + '',
    }));

    // validate (no quotationId here)
    const validated = z.object({
      header: insertQuotationSchema, // matches your drizzle columns (strings for dates)
      items: z.array(itemCompat),
    }).parse({ header, items });

    // generate displayName if missing
    if (!validated.header.displayName || !validated.header.displayName.trim()) {
      const result: any = await db.execute(`SELECT tbs.next_sequence('quotation') AS next`);
      const nextVal =
        (result?.rows && result.rows[0]?.next) ??
        (Array.isArray(result) && result[0]?.next) ??
        1;
      validated.header.displayName = `Quotation ${Number(nextVal)}`;
    }

    // create
    const q = await storage.createQuotationWithItems(validated);
    res.status(201).json(q);
  } catch (err) {
    if (err instanceof z.ZodError) {
      console.error('Zod validation error (/api/quotations):', JSON.stringify(err.errors, null, 2));
      return res.status(400).json({ message: 'Validation error', errors: err.errors });
    }
    next(err);
  }
});







app.put('/api/quotations/:id', async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    const q = await storage.updateQuotationWithItems(id, req.body);
    res.json(q);
  } catch (err) {
    if (err instanceof z.ZodError)
      return res.status(400).json({ message: 'Validation error', errors: err.errors });
    next(err);
  }
});

app.delete('/api/quotations/:id', async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    const ok = await storage.deleteQuotation(id);
    if (!ok) return res.status(404).json({ message: 'Quotation not found' });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

// --- NEW: Invoices with Items ---
app.get('/api/invoices/:id/with-items', async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: 'Invalid invoice ID' });

    const data = await storage.getInvoiceWithItems(id);
    if (!data) return res.status(404).json({ message: 'Invoice not found' });

    res.json(data);
  } catch (err) {
    next(err);
  }
});

// ... (other imports and route definitions) ...

// --- Find the existing /api/invoices/with-items route ---
// --- Invoices: create with items (Drizzle-based, no pg.Pool) ---
app.post('/api/invoices/with-items', async (req, res, next) => {
  try {
    const { header, items } = req.body ?? {};
    if (!header || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: 'header + items required' });
    }

    // ---- Helpers ----
    const round2 = (n: number) => Math.round(n * 100) / 100;
    const qs = (v: any) => {
      if (v === null || v === undefined) return 'NULL';
      if (typeof v === 'number') return String(v);
      // date strings: allow yyyy-mm-dd thru as string
      const s = String(v);
      // escape single quotes for raw SQL
      return `'${s.replace(/'/g, "''")}'`;
    };

    // normalize/parse promo
    let promo: any = null;
    if (header.promo) {
      try { promo = typeof header.promo === 'string' ? JSON.parse(header.promo) : header.promo; } catch {}
    }

    // compute server-side totals (same logic as frontend)
    const linesTotal = items.reduce(
      (s: number, it: any) => s + Number(it.unitPrice || 0) * Number(it.quantity || 1),
      0
    );

    const design   = Number(header.design_cost   || 0);
    const sample   = Number(header.sample_cost   || 0);
    const handling = Number(header.handling_cost || 0);

    const type  = promo?.discountType ?? promo?.type;
    const value = promo?.discountValue ?? promo?.value;

    let discount = 0;
    if (type && value != null) {
      const pct = (type === 'percent' || type === 'percentage');
      discount = pct ? linesTotal * (Number(value) / 100) : Number(value);
      discount = Math.max(0, Math.min(discount, linesTotal));
    }

    const subTotal = linesTotal + design + sample + handling - discount;
    const vatRate  = 0.15;
    const vat      = Math.max(0, subTotal * vatRate);
    const grand    = round2(subTotal + vat);

    // Transaction (no Pool needed)
    const result = await db.transaction(async (tx) => {
      // get next seq for invoice_number
      const seqResp: any = await tx.execute(`SELECT tbs.next_sequence('invoice') AS next`);
      const nextVal =
        (seqResp?.rows && seqResp.rows[0]?.next) ??
        (Array.isArray(seqResp) && seqResp[0]?.next) ??
        null;
      if (nextVal == null) throw new Error('Could not get next invoice sequence');
      const invoice_number = `INV-${Number(nextVal)}`;

      // prepare invoice insert
      const project_id   = header.project_id ?? null;
      const invoice_date = header.invoice_date ?? new Date().toISOString().slice(0,10);
      const status       = header.status ?? 'draft';
      const due_date     = header.due_date ?? null;
      const description  = header.description ?? null;

      const customer_name  = header.customer_name ?? null;
      const customer_email = header.customer_email ?? null;
      const customer_phone = header.customer_phone ?? null;

      const quote_date  = header.quote_date ?? null;
      const valid_until = header.valid_until ?? null;

      const payment_status        = header.payment_status ?? 'pending';
      const related_quotation_id  = header.related_quotation_id ?? null;
      const promoText             = promo ? JSON.stringify(promo) : null;

      const issue_date  = header.issue_date ?? new Date().toISOString().slice(0,10);
      const amount_due  = grand;

      const insertInvSQL = `
        INSERT INTO tbs.invoices (
          project_id, invoice_date, total_amount, status, due_date, description,
          customer_name, customer_email, customer_phone,
          quote_date, valid_until,
          design_cost, sample_cost, handling_cost,
          grand_total, payment_status, related_quotation_id, promo,
          invoice_number, issue_date, amount_due
        )
        VALUES (
          ${qs(project_id)}, ${qs(invoice_date)}, ${qs(grand)}, ${qs(status)}, ${qs(due_date)}, ${qs(description)},
          ${qs(customer_name)}, ${qs(customer_email)}, ${qs(customer_phone)},
          ${qs(quote_date)}, ${qs(valid_until)},
          ${qs(design)}, ${qs(sample)}, ${qs(handling)},
          ${qs(grand)}, ${qs(payment_status)}, ${qs(related_quotation_id)}, ${qs(promoText)},
          ${qs(invoice_number)}, ${qs(issue_date)}, ${qs(amount_due)}
        )
        RETURNING invoice_id, invoice_number
      `;

      const inserted: any = await tx.execute(insertInvSQL);
      const row =
        (inserted?.rows && inserted.rows[0]) ||
        (Array.isArray(inserted) && inserted[0]) ||
        null;

      if (!row?.invoice_id) throw new Error('Failed to insert invoice');
      const invoice_id = Number(row.invoice_id);

      // bulk insert items
      if (items.length) {
        // build VALUES list safely (escaped via qs)
        const values = items.map((it: any) => {
          const original_id = it.originalId ?? null;
          const name  = it.name ?? it.productName ?? 'Item';
          const notes = it.notes ?? null;
          const qty   = Number(it.quantity || 1);
          const price = Number(it.unitPrice || 0);
          return `(${qs(invoice_id)}, ${qs(original_id)}, ${qs(name)}, ${qs(notes)}, ${qs(qty)}, ${qs(price)})`;
        }).join(',\n');

        const insertItemsSQL = `
          INSERT INTO tbs.invoice_items (invoice_id, original_id, "name", notes, quantity, unit_price)
          VALUES ${values}
        `;
        await tx.execute(insertItemsSQL);
      }

      return { invoice_id, invoice_number };
    });

    return res.json(result);
  } catch (e: any) {
    console.error('POST /api/invoices/with-items error:', e);
    return res.status(500).json({ message: e?.message || 'Failed to create invoice' });
  }
});



// ... (rest of routes.ts) ...

// ... (rest of the routes file) ...

app.put('/api/invoices/:id/with-items', async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    const invoice = await storage.updateInvoiceWithItems(id, req.body);
    res.json(invoice);
  } catch (err) {
    if (err instanceof z.ZodError)
      return res.status(400).json({ message: 'Validation error', errors: err.errors });
    next(err);
  }
});


  const httpServer = createServer(app);
  return httpServer;
}
