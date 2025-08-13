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
} from "@shared/schema";
import { z } from "zod";
import { sendEmail } from "./emailService"; // NEW: Import the email service

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

  app.post('/api/invoices', async (req, res, next) => {
    try {
      const validatedData = insertInvoiceSchema.parse(req.body);
      const invoice = await storage.createInvoice(validatedData);
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
      const invoice = await storage.updateInvoice(id, validatedData);
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

  // --- Suppliers: list all (for UI boot) ---
app.get('/api/suppliers', async (_req, res, next) => {
  try {
    // If your storage already has a helper:
    if (typeof (storage as any).getAllSuppliers === 'function') {
      const rows = await (storage as any).getAllSuppliers();
      return res.json(rows);
    }

    // Fallback: direct SQL via your storage.exec (adjust if your storage uses another method)
    const rows = await (storage as any).exec?.(
      `SELECT
         id,
         supplier_name AS "supplierName",
         sku,
         product_name AS "productName",
         unit,
         price,
         created_at AS "createdAt"
       FROM suppliers
       ORDER BY id DESC;`
    );

    res.json(rows ?? []);
  } catch (err) {
    next(err);
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


  const httpServer = createServer(app);
  return httpServer;
}
