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
  insertSupplierSchema,
  insertTenderSchema,
  insertQuotationSchema,
  insertQuotationItemSchema,
  insertInvoiceItemSchema,
  
  // Tables
  bankAccounts,
  terms as termsTable,
  sequences,

  // Zod payloads
  insertBankAccountSchema,
  insertTermsSchema,
  sequenceTypeSchema,
  verifyAccessPasswordSchema, 
  insertAccessPasswordSchema
} from "@shared/schema";

import { db } from "./db";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { sendEmail } from "./emailService";
import bcrypt from "bcryptjs";

export async function registerRoutes(app: Express): Promise<Server> {
  // --- Existing Master Products routes ---
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
      if (isNaN(id)) return res.status(400).json({ message: 'Invalid Master Product ID' });
      const masterProduct = await storage.getMasterProduct(id);
      if (!masterProduct) return res.status(404).json({ message: 'Master Product not found' });
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
      if (isNaN(id)) return res.status(400).json({ message: 'Invalid Master Product ID' });
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
      if (isNaN(id)) return res.status(400).json({ message: 'Invalid Master Product ID' });
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


  // --- Snapshot routes ---
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

  // 👇 FIXED: Pass req.body directly to storage to include expenses array
  app.post('/api/snapshots', async (req, res, next) => {
    try {
      // We DO NOT parse with insertSnapshotSchema here because it would strip
      // the 'expenses' and 'products' arrays which are not in the base table schema.
      const snapshot = await storage.createSnapshot(req.body);
      res.status(201).json(snapshot);
    } catch (error) {
      next(error);
    }
  });

  app.put('/api/snapshots/:id', async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: 'Invalid Snapshot ID' });
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
      if (isNaN(id)) return res.status(400).json({ message: 'Invalid Snapshot ID' });
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
      if (isNaN(id)) return res.status(400).json({ message: 'Invalid Snapshot ID' });
      const snapshot = await storage.toggleSnapshotArchivedStatus(id, true);
      res.json(snapshot);
    } catch (error) {
      next(error);
    }
  });

  app.put('/api/snapshots/:id/unarchive', async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: 'Invalid Snapshot ID' });
      const snapshot = await storage.toggleSnapshotArchivedStatus(id, false);
      res.json(snapshot);
    } catch (error) {
      next(error);
    }
  });


  // --- Snapshot Products routes ---
  app.get('/api/snapshots/:snapshotId/products', async (req, res, next) => {
    try {
      const snapshotId = parseInt(req.params.snapshotId);
      if (isNaN(snapshotId)) return res.status(400).json({ message: 'Invalid Snapshot ID' });
      const products = await storage.getSnapshotProductsBySnapshotId(snapshotId);
      res.json(products);
    } catch (error) {
      next(error);
    }
  });

  app.post('/api/snapshots/:snapshotId/products', async (req, res, next) => {
    try {
      const snapshotId = parseInt(req.params.snapshotId);
      if (isNaN(snapshotId)) return res.status(400).json({ message: 'Invalid Snapshot ID' });
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
      if (isNaN(id)) return res.status(400).json({ message: 'Invalid Snapshot Product ID' });
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
      if (isNaN(id)) return res.status(400).json({ message: 'Invalid Snapshot Product ID' });
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


  // --- Expenses routes ---
  app.get('/api/snapshots/:snapshotId/expenses', async (req, res, next) => {
    try {
      const snapshotId = parseInt(req.params.snapshotId);
      if (isNaN(snapshotId)) return res.status(400).json({ message: 'Invalid Snapshot ID' });
      const expenses = await storage.getExpensesBySnapshotId(snapshotId);
      res.json(expenses);
    } catch (error) {
      next(error);
    }
  });

  app.post('/api/snapshots/:snapshotId/expenses', async (req, res, next) => {
    try {
      const snapshotId = parseInt(req.params.snapshotId);
      if (isNaN(snapshotId)) return res.status(400).json({ message: 'Invalid Snapshot ID' });
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
      if (isNaN(id)) return res.status(400).json({ message: 'Invalid Expense ID' });
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
      if (isNaN(id)) return res.status(400).json({ message: 'Invalid Expense ID' });
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

  // --- Client Routes ---
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
      if (isNaN(id)) return res.status(400).json({ message: 'Invalid Client ID' });
      const client = await storage.getClient(id);
      if (!client) return res.status(404).json({ message: 'Client not found' });
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
      if (isNaN(id)) return res.status(400).json({ message: 'Invalid Client ID' });
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
      if (isNaN(id)) return res.status(400).json({ message: 'Invalid Client ID' });
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

  // --- Project Routes ---
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
      if (isNaN(id)) return res.status(400).json({ message: 'Invalid Project ID' });
      const project = await storage.getProject(id);
      if (!project) return res.status(404).json({ message: 'Project not found' });
      res.json(project);
    } catch (error) {
      next(error);
    }
  });

  app.get('/api/clients/:clientId/projects', async (req, res, next) => {
    try {
      const clientId = parseInt(req.params.clientId);
      if (isNaN(clientId)) return res.status(400).json({ message: 'Invalid Client ID' });
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
      if (isNaN(id)) return res.status(400).json({ message: 'Invalid Project ID' });
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
      if (isNaN(id)) return res.status(400).json({ message: 'Invalid Project ID' });
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

  // --- Service Catalog Routes ---
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
      if (isNaN(id)) return res.status(400).json({ message: 'Invalid Service Catalog Item ID' });
      const item = await storage.getServiceCatalogItem(id);
      if (!item) return res.status(404).json({ message: 'Service Catalog Item not found' });
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
      if (isNaN(id)) return res.status(400).json({ message: 'Invalid Service Catalog Item ID' });
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
      if (isNaN(id)) return res.status(400).json({ message: 'Invalid Service Catalog Item ID' });
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

  // --- Project Component Routes ---
  app.get('/api/projects/:projectId/components', async (req, res, next) => {
    try {
      const projectId = parseInt(req.params.projectId);
      if (isNaN(projectId)) return res.status(400).json({ message: 'Invalid Project ID' });
      const components = await storage.getProjectComponentsByProject(projectId);
      res.json(components);
    } catch (error) {
      next(error);
    }
  });

  app.post('/api/projects/:projectId/components', async (req, res, next) => {
    try {
      const projectId = parseInt(req.params.projectId);
      if (isNaN(projectId)) return res.status(400).json({ message: 'Invalid Project ID' });
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
      if (isNaN(id)) return res.status(400).json({ message: 'Invalid Project Component ID' });
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
      if (isNaN(id)) return res.status(400).json({ message: 'Invalid Project Component ID' });
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

  // --- Cost Routes ---
  app.get('/api/projects/:projectId/costs', async (req, res, next) => {
    try {
      const projectId = parseInt(req.params.projectId);
      if (isNaN(projectId)) return res.status(400).json({ message: 'Invalid Project ID' });
      const costs = await storage.getCostsByProject(projectId);
      res.json(costs);
    } catch (error) {
      next(error);
    }
  });

  app.post('/api/projects/:projectId/costs', async (req, res, next) => {
    try {
      const projectId = parseInt(req.params.projectId);
      if (isNaN(projectId)) return res.status(400).json({ message: 'Invalid Project ID' });
      const validatedData = insertCostSchema.parse({
        ...req.body,
        project_id: projectId,
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
      if (isNaN(id)) return res.status(400).json({ message: 'Invalid Cost ID' });
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
      if (isNaN(id)) return res.status(400).json({ message: 'Invalid Cost ID' });
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

  // --- Invoice Routes ---
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
      if (isNaN(id)) return res.status(400).json({ message: 'Invalid Invoice ID' });
      const invoice = await storage.getInvoice(id);
      if (!invoice) return res.status(404).json({ message: 'Invoice not found' });
      res.json(invoice);
    } catch (error) {
      next(error);
    }
  });

  app.get('/api/projects/:projectId/invoices', async (req, res, next) => {
    try {
      const projectId = parseInt(req.params.projectId);
      if (isNaN(projectId)) return res.status(400).json({ message: 'Invalid Project ID' });
      const invoices = await storage.getInvoicesByProject(projectId);
      res.json(invoices);
    } catch (error) {
      next(error);
    }
  });

  async function getNextSequenceValue(kind: "invoice" | "quotation") {
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

  // POST /api/invoices (Simple invoice creation)
  app.post('/api/invoices', async (req, res, next) => {
    try {
      const validatedData = insertInvoiceSchema.parse(req.body);
      const next = await getNextSequenceValue("invoice");
      const invoiceNameFromSequence = `Invoice ${next}`;

      const invoice = await storage.createInvoice({
        ...validatedData,
        invoice_number: invoiceNameFromSequence,
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
      if (isNaN(id)) return res.status(400).json({ message: 'Invalid Invoice ID' });
      const validatedData = insertInvoiceSchema.partial().parse(req.body);
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
      if (isNaN(id)) return res.status(400).json({ message: 'Invalid Invoice ID' });
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

  // --- Email Route ---
  app.post('/api/send-document-email', async (req, res, next) => {
    try {
      const { recipientEmail, subject, htmlBody, customerName, documentType } = req.body;
      if (!recipientEmail || !subject || !htmlBody || !customerName || !documentType) {
        return res.status(400).json({ message: 'Missing required email parameters.' });
      }
      await sendEmail({
        to: recipientEmail,
        subject: subject,
        html: htmlBody,
      });
      res.status(200).json({ message: `${documentType} sent successfully to ${customerName}.` });
    } catch (error: any) {
      console.error("Error in /api/send-document-email route:", error);
      next(error);
    }
  });

  // --- Supplier Routes ---
  app.put('/api/suppliers/:id', async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: 'Invalid Supplier ID' });
      const validatedData = insertSupplierSchema.partial().parse(req.body);
      const updated = await storage.updateSupplier(id, validatedData);
      if (!updated) return res.status(404).json({ message: 'Supplier not found' });
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
      if (isNaN(id)) return res.status(400).json({ message: 'Invalid Supplier ID' });
      const deleted = await storage.deleteSupplier(id);
      if (!deleted) return res.status(404).json({ message: 'Supplier not found' });
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  });

  app.get('/api/suppliers', async (_req, res, next) => {
    try {
      const suppliers = await storage.getAllSuppliers();
      res.json(suppliers);
    } catch (err) {
      next(err);
    }
  });

  app.get('/api/suppliers/search', async (req, res, next) => {
    try {
      const q = String(req.query.q ?? '').trim();
      const supplier = String(req.query.supplier ?? '').trim();
      const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit ?? '25')) || 25));
      const offset = Math.max(0, parseInt(String(req.query.offset ?? '0')) || 0);

      const all = await storage.getAllSuppliers();
      const ql = q.toLowerCase();
      const filtered = (all || []).filter((r: any) => {
        if (supplier && supplier.toLowerCase() !== 'all' && r.supplierName !== supplier) return false;
        if (!ql) return true;
        const hay = [r.productName, r.sku, r.supplierName, r.unit].filter(Boolean).join(' ').toLowerCase();
        return hay.includes(ql);
      });

      filtered.sort((a: any, b: any) => {
        const nameA = (a.productName || '').toLowerCase();
        const nameB = (b.productName || '').toLowerCase();
        if (nameA < nameB) return -1;
        if (nameA > nameB) return 1;
        return (a.price || 0) - (b.price || 0);
      });

      res.json(filtered.slice(offset, offset + limit));
    } catch (err) {
      next(err);
    }
  });

  app.post('/api/suppliers/import', async (req, res, next) => {
    try {
      const payload = Array.isArray(req.body) ? req.body : req.body?.suppliers;
      if (!Array.isArray(payload) || payload.length === 0) {
        return res.status(400).json({
          message: 'Validation error during supplier import',
          errors: [{ path: ['body'], message: 'Expected an array of suppliers' }],
        });
      }
      const parsed = z.array(insertSupplierSchema).safeParse(payload);
      if (!parsed.success) {
        return res.status(400).json({
          message: 'Validation error during supplier import',
          errors: parsed.error.issues,
        });
      }
      const importedSuppliers = await storage.importSuppliers(parsed.data);
      res.status(201).json(importedSuppliers);
    } catch (error) {
      next(error);
    }
  });

  // --- Tender Routes ---
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
      if (isNaN(id)) return res.status(400).json({ message: 'Invalid Tender ID' });
      const tender = await storage.getTender(id);
      if (!tender) return res.status(404).json({ message: 'Tender not found' });
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
      if (isNaN(id)) return res.status(400).json({ message: 'Invalid Tender ID' });
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
      if (isNaN(id)) return res.status(400).json({ message: 'Invalid Tender ID' });
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

  // --- Password Routes ---
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

  // --- Bank Account Routes ---
  app.get("/api/bank-accounts", async (req, res, next) => {
    try {
      const activeParam = String(req.query.active ?? "").toLowerCase();
      let rows = await db.select().from(bankAccounts);
      if (activeParam === "true") rows = rows.filter((r) => r.isActive === true);
      else if (activeParam === "false") rows = rows.filter((r) => r.isActive === false);
      res.json(rows);
    } catch (err) {
      next(err);
    }
  });

  app.post("/api/bank-accounts", async (req, res, next) => {
    try {
      const data = insertBankAccountSchema.parse(req.body);
      const [row] = await db.insert(bankAccounts).values(data).returning();
      res.status(201).json(row);
    } catch (e) {
      if (e instanceof z.ZodError) return res.status(400).json({ message: "Validation error", errors: e.errors });
      next(e);
    }
  });

  app.put("/api/bank-accounts/:id", async (req, res, next) => {
    try {
      const id = String(req.params.id);
      const data = insertBankAccountSchema.partial().parse(req.body);
      const [row] = await db.update(bankAccounts).set(data).where(eq(bankAccounts.id, id)).returning();
      if (!row) return res.status(404).json({ message: "Bank account not found" });
      res.json(row);
    } catch (e) {
      if (e instanceof z.ZodError) return res.status(400).json({ message: "Validation error", errors: e.errors });
      next(e);
    }
  });

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

  app.post("/api/bank-accounts/:id/toggle", async (req, res, next) => {
    try {
      const id = String(req.params.id);
      const existing = await db.select().from(bankAccounts).where(eq(bankAccounts.id, id)).limit(1);
      if (!existing[0]) return res.status(404).json({ message: "Bank account not found" });
      const [row] = await db.update(bankAccounts).set({ isActive: !existing[0].isActive }).where(eq(bankAccounts.id, id)).returning();
      res.json(row);
    } catch (e) {
      next(e);
    }
  });

  // --- Terms & Conditions Routes ---
  app.get("/api/terms", async (_req, res, next) => {
    try {
      const [row] = await db.select().from(termsTable).where(eq(termsTable.id, "singleton")).limit(1);
      res.json(row ?? { id: "singleton", body: "", createdAt: new Date(), updatedAt: new Date() });
    } catch (e) {
      next(e);
    }
  });

  app.put("/api/terms", async (req, res, next) => {
    try {
      const { body } = insertTermsSchema.pick({ body: true }).parse(req.body);
      const [row] = await db.update(termsTable).set({ body, updatedAt: new Date() }).where(eq(termsTable.id, "singleton")).returning();
      if (!row) {
        const [created] = await db.insert(termsTable).values({ id: "singleton", body }).returning();
        return res.json(created);
      }
      res.json(row);
    } catch (e) {
      if (e instanceof z.ZodError) return res.status(400).json({ message: "Validation error", errors: e.errors });
      next(e);
    }
  });

  // --- Sequences Routes ---
  app.get("/api/sequences/peek", async (req, res, next) => {
    try {
      const type = (String(req.query.type || "quotation") as "quotation" | "invoice");
      if (!["quotation", "invoice"].includes(type)) return res.status(400).json({ message: "Invalid type" });
      const [row] = await db.select().from(sequences).where(eq(sequences.id, type)).limit(1);
      res.json({ next: row ? row.current + 1 : 1 });
    } catch (e) {
      next(e);
    }
  });

  app.post("/api/sequences/next", async (req, res, next) => {
    try {
      const { type } = z.object({ type: sequenceTypeSchema }).parse(req.body);
      const result: any = await db.execute(`SELECT tbs.next_sequence('${type}') AS next`);
      const nextValue = (result?.rows && result.rows[0]?.next) ?? (Array.isArray(result) && result[0]?.next) ?? null;
      if (nextValue == null) return res.status(500).json({ message: "Could not get next sequence value" });
      res.json({ next: Number(nextValue) });
    } catch (e) {
      if (e instanceof z.ZodError) return res.status(400).json({ message: "Validation error", errors: e.errors });
      next(e);
    }
  });

  // --- Quotations (with Items) ---
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

  app.post('/api/quotations', async (req, res, next) => {
    try {
      const body = { ...req.body };
      const coercePromoToString = (p: any) => typeof p === 'string' ? p : (p ? JSON.stringify(p) : undefined);
      const headerSource = body.header ?? body;

      const header = {
        displayName: headerSource.displayName,
        customerName: headerSource.customerName,
        customerEmail: headerSource.customerEmail,
        customerPhone: headerSource.customerPhone,
        quoteDate: headerSource.quoteDate ?? null,
        validUntil: headerSource.validUntil ?? null,
        designCost: Number(headerSource.designCost ?? 0),
        sampleCost: Number(headerSource.sampleCost ?? 0),
        handlingCost: Number(headerSource.handlingCost ?? 0),
        grandTotal: Number(headerSource.grandTotal ?? 0),
        status: headerSource.status ?? 'draft',
        promo: coercePromoToString(headerSource.promo),
      };

      const rawItems = (body.items ?? headerSource.items ?? []) as any[];
      const itemCompat = z.object({
        name: z.string().min(1),
        quantity: z.coerce.number().int().positive(),
        unitPrice: z.coerce.number().nonnegative(),
        notes: z.string().optional().nullable(),
      });

      const items = rawItems.map(it => ({
        name: String(it.name ?? it.productName ?? '').trim(),
        quantity: Number(it.quantity ?? 0),
        unitPrice: Number(it.unitPrice ?? it.price ?? 0),
        notes: (it.notes ?? '') + '',
      }));

      const validated = z.object({
        header: insertQuotationSchema,
        items: z.array(itemCompat),
      }).parse({ header, items });

      if (!validated.header.displayName || !validated.header.displayName.trim()) {
        const result: any = await db.execute(`SELECT tbs.next_sequence('quotation') AS next`);
        const nextVal = (result?.rows && result.rows[0]?.next) ?? (Array.isArray(result) && result[0]?.next) ?? 1;
        validated.header.displayName = `Quotation ${Number(nextVal)}`;
      }

      const q = await storage.createQuotationWithItems(validated);
      res.status(201).json(q);
    } catch (err) {
      if (err instanceof z.ZodError) {
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
      if (err instanceof z.ZodError) return res.status(400).json({ message: 'Validation error', errors: err.errors });
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

  // --- Invoices with Items ---
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

  // Create Invoice with items - using storage.createInvoiceWithItems
  app.post('/api/invoices/with-items', async (req, res, next) => {
    try {
      const { header, items } = req.body ?? {};
      if (!header || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ message: 'header + items required' });
      }

      // Prepare data for storage method
      const input = {
        ...header,
        items: items
      };

      // Ensure a sequence number is generated if not provided
      if (!input.invoice_number) {
        const nextSeq = await getNextSequenceValue("invoice");
        input.invoice_number = `INV-${nextSeq}`;
      }

      // Delegate to storage implementation
      const invoice = await storage.createInvoiceWithItems(input);
      res.status(201).json(invoice);
    } catch (e: any) {
      console.error('POST /api/invoices/with-items error:', e);
      return res.status(500).json({ message: e?.message || 'Failed to create invoice' });
    }
  });

  app.put('/api/invoices/:id/with-items', async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      const invoice = await storage.updateInvoiceWithItems(id, req.body);
      res.json(invoice);
    } catch (err) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: 'Validation error', errors: err.errors });
      next(err);
    }
  });

  // --- Company Settings routes ---
  app.get("/api/company-settings", async (_req, res) => {
    try {
      const settings = await storage.getCompanySettings();
      res.json(settings);
    } catch {
      res.json({}); // table may not exist yet — client falls back to localStorage
    }
  });

  app.put("/api/company-settings", async (req, res) => {
    try {
      if (!req.body || typeof req.body !== "object") {
        return res.status(400).json({ message: "Body must be a JSON object" });
      }
      await storage.upsertCompanySettings(req.body as Record<string, unknown>);
      res.json({ ok: true });
    } catch {
      res.json({ ok: false, note: "company_settings table not yet created — run: npm run db:push" });
    }
  });

  // --- Quote Pricing Config routes (shared defaults, visible to everyone) ---
  app.get("/api/quote-config", async (_req, res, next) => {
    try {
      const config = await storage.getQuotePricingConfig();
      res.json(config);
    } catch (err) { next(err); }
  });

  app.put("/api/quote-config", async (req, res, next) => {
    try {
      if (!req.body || typeof req.body !== "object") {
        return res.status(400).json({ message: "Body must be a JSON object" });
      }
      await storage.upsertQuotePricingConfig(req.body as Record<string, unknown>);
      res.json({ ok: true });
    } catch (err) { next(err); }
  });

  // Partial update — merges patch into existing config without overwriting unrelated fields
  app.patch("/api/quote-config", async (req, res, next) => {
    try {
      if (!req.body || typeof req.body !== "object") {
        return res.status(400).json({ message: "Body must be a JSON object" });
      }
      await storage.patchQuotePricingConfig(req.body as Record<string, unknown>);
      res.json({ ok: true });
    } catch (err) { next(err); }
  });

  // --- Quote Templates routes ---
  app.get("/api/quote-templates", async (_req, res, next) => {
    try {
      const templates = await storage.getAllQuoteTemplates();
      res.json(templates);
    } catch (err) { next(err); }
  });

  app.post("/api/quote-templates", async (req, res, next) => {
    try {
      const { name, config } = req.body || {};
      if (!name || typeof name !== "string" || !name.trim()) {
        return res.status(400).json({ message: "Template name is required" });
      }
      if (!config || typeof config !== "object") {
        return res.status(400).json({ message: "Config must be a JSON object" });
      }
      const template = await storage.createQuoteTemplate(name.trim(), config as Record<string, unknown>);
      res.status(201).json(template);
    } catch (err) { next(err); }
  });

  app.delete("/api/quote-templates/:id", async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid template ID" });
      const deleted = await storage.deleteQuoteTemplate(id);
      if (!deleted) return res.status(404).json({ message: "Template not found" });
      res.status(204).send();
    } catch (err) { next(err); }
  });

  const httpServer = createServer(app);
  return httpServer;
}