// src/pages/Quotations.tsx
// React UI — supports promotions/discounts, multiple bank accounts (CRUD via API),
// editable terms (plain/HTML with preview), and human-readable numbering using /api/sequences.

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'wouter';
import { useToast } from '@/hooks/use-toast';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

import {
  ArrowLeft, Plus, Trash2, FileText, Download, Mail, Tag,
  List, ReceiptText, SquarePen, Loader2, Settings, DollarSign
} from 'lucide-react';

import logoUrl from './logo.png';

import {
  Product, QuotedProduct, QuotationRecord, InvoiceRecord,
  CompanyDetails, PaymentStatus, QuoteStatus,
  BankAccount, Promotion, DiscountType,
  calculateLineTotal, calculateTotals,
  buildDocumentHtml, downloadPdfFromHtml, buildHumanDocName
} from './quote-invoice-utils';

export default function Quotations() {
  const { toast } = useToast();

  // --- Refs (kept for future preview use)
  const quotationPreviewRef = useRef<HTMLDivElement>(null);
  const invoicePreviewRef = useRef<HTMLDivElement>(null);

  // --- Company Details
  const [companyDetails, setCompanyDetails] = useState<CompanyDetails>({
    name: 'Tshepiso Branding Solutions(Pty) Ltd',
    addressLine1: '11 Enterprise Close',
    addressLine2: 'Linbro Business Park Malboro Gardens',
    city: 'Sandton',
    province: 'Gauteng',
    postalCode: '2090',
    country: 'South Africa',
    phone: '0685999595',
    website: 'www.tshepisobranding.co.za',
    vatNumber: '4550116778',
    registrationNumber: '1962/004313/07'
  });

  // --- Bank Accounts (multiple)
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [selectedBankAccountIds, setSelectedBankAccountIds] = useState<string[]>([]);

  // --- New bank account form (Settings)
  const [newBank, setNewBank] = useState<Omit<BankAccount, 'id'>>({
    label: '',
    bankName: '',
    bankAccountNumber: '',
    bankBranchCode: '',
    isActive: true,
  });

  // --- Terms (authoring-friendly)
  const [termsInput, setTermsInput] = useState<string>(''); // user edits here
  const [termsMode, setTermsMode] = useState<'plain' | 'html'>('plain'); // authoring mode
  const [isSavingTerms, setIsSavingTerms] = useState(false); // moved to parent so editor isn't stateful child

  // --- Current form data
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [quoteDate, setQuoteDate] = useState(new Date().toISOString().split('T')[0]);
  const [validUntil, setValidUntil] = useState('');
  const [selectedSnapshotId, setSelectedSnapshotId] = useState<string | null>(null);
  const [availableProducts, setAvailableProducts] = useState<Product[]>([]);
  const [quotedProducts, setQuotedProducts] = useState<QuotedProduct[]>([]);
  const [selectedProductId, setSelectedProductId] = useState('');

  // Costs
  const [designCost, setDesignCost] = useState(0);
  const [sampleCost, setSampleCost] = useState(0);
  const [handlingCost, setHandlingCost] = useState(0);

  // Promotion / discount
  const [promo, setPromo] = useState<Promotion | undefined>(undefined);

  // Stored lists
  const [quotationsList, setQuotationsList] = useState<QuotationRecord[]>([]);
  const [invoicesList, setInvoicesList] = useState<InvoiceRecord[]>([]);

  const [currentView, setCurrentView] = useState<
    'create-quote' | 'list-quotes' | 'list-invoices' | 'edit-quote' | 'edit-invoice' | 'edit-banking'
  >('create-quote');

  const [editingQuotationId, setEditingQuotationId] = useState<string | null>(null);
  const [editingInvoiceId, setEditingInvoiceId] = useState<string | null>(null);

  // Loading flags
  const [isSendingDocument, setIsSendingDocument] = useState(false);
  const [isDeletingQuotation, setIsDeletingQuotation] = useState(false);
  const [isDeletingInvoice, setIsDeletingInvoice] = useState(false);

  // Sequence peeks (optional UI use)
  const [nextQuotationNumber, setNextQuotationNumber] = useState<number | null>(null);
  const [nextInvoiceNumber, setNextInvoiceNumber] = useState<number | null>(null);

  // ---------- Helpers for terms ----------
  function escapeHtml(s: string) {
    return s
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }
  function nl2brHtml(s: string) {
    // Convert blank lines to paragraph breaks and single newlines to <br>
    const parts = s.split(/\n{2,}/).map(p =>
      `<p>${escapeHtml(p).replace(/\n/g, '<br/>')}</p>`
    );
    return parts.join('\n');
  }

  const finalTermsHtml = useMemo(
    () => (termsMode === 'plain' ? nl2brHtml(termsInput) : termsInput),
    [termsMode, termsInput]
  );

  // --- Initial load (localStorage)
  useEffect(() => {
    try {
      const storedCompanyDetails = localStorage.getItem('companyDetails');
      if (storedCompanyDetails) setCompanyDetails(JSON.parse(storedCompanyDetails));

      const storedSnapshotId = localStorage.getItem('selectedQuotationSnapshotId');
      if (storedSnapshotId) setSelectedSnapshotId(storedSnapshotId);

      const storedProducts = localStorage.getItem('selectedQuotationProducts');
      if (storedProducts) {
        const parsedProducts: any[] = JSON.parse(storedProducts);
        const mapped: Product[] = parsedProducts.map((p: any) => ({
          id: Number(p.id),
          name: p.name || 'Unnamed Product',
          price: parseFloat(p.suggestedPrice || p.price || 0),
          costPerUnit: parseFloat(p.costPerUnit || p.cost_per_unit || 0),
          expectedUnits: parseInt(p.expectedUnits || p.expected_units || 1, 10),
          notes: p.notes || ''
        }));
        setAvailableProducts(mapped);
      }

      const storedQuotations = localStorage.getItem('quotations');
      if (storedQuotations) setQuotationsList(JSON.parse(storedQuotations));

      const storedInvoices = localStorage.getItem('invoices');
      if (storedInvoices) setInvoicesList(JSON.parse(storedInvoices));
    } catch (e) {
      console.error(e);
      toast({
        title: 'Error loading data',
        description: 'Some saved data could not be loaded.',
        variant: 'destructive'
      });
    }
  }, [toast]);

  // --- Load Terms once (API -> fallback to localStorage)
  useEffect(() => {
    (async () => {
      try {
        const tRes = await fetch('/api/terms');
        if (tRes.ok) {
          const terms = await tRes.json();
          setTermsInput(terms.body || '');
          setTermsMode('plain'); // author in plain by default
        } else {
          const ls = localStorage.getItem('termsHtml');
          if (ls) {
            setTermsInput(ls);
            setTermsMode('plain');
          }
        }
      } catch {
        // ignore
      }
    })();
  }, []);

  // --- Load bank accounts + sequences (fallback gracefully)
  useEffect(() => {
    (async () => {
      try {
        // bank accounts
        const baRes = await fetch('/api/bank-accounts');
        if (baRes.ok) {
          const list: BankAccount[] = await baRes.json();
          setBankAccounts(list);

          if (list?.length) {
            // default: all active accounts; if none active, pick the first
            const actives = list.filter(b => b.isActive).map(b => b.id);
            setSelectedBankAccountIds(actives.length ? actives : [list[0].id]);
          }
        } else {
          // fallback to legacy single account in localStorage if present
          const legacy = localStorage.getItem('bankingDetails');
          if (legacy) {
            const one = JSON.parse(legacy);
            const generated: BankAccount = {
              id: 'legacy',
              bankName: one.bankName,
              bankAccountNumber: one.bankAccountNumber,
              bankBranchCode: one.bankBranchCode,
              label: 'Main',
              isActive: true,
            };
            setBankAccounts([generated]);
            setSelectedBankAccountIds(['legacy']);
          }
        }

        // sequences (peek next)
        const qRes = await fetch('/api/sequences/peek?type=quotation');
        if (qRes.ok) setNextQuotationNumber((await qRes.json()).next);
        const iRes = await fetch('/api/sequences/peek?type=invoice');
        if (iRes.ok) setNextInvoiceNumber((await iRes.json()).next);
      } catch {
        // ignore; UI still works with fallbacks
      }
    })();
  }, []);

  // --- Persist lists + company details to localStorage
  useEffect(() => {
    localStorage.setItem('companyDetails', JSON.stringify(companyDetails));
  }, [companyDetails]);

  useEffect(() => {
    localStorage.setItem('quotations', JSON.stringify(quotationsList));
  }, [quotationsList]);

  useEffect(() => {
    localStorage.setItem('invoices', JSON.stringify(invoicesList));
  }, [invoicesList]);

  // --- Auto status updates
  useEffect(() => {
    const now = new Date();

    setQuotationsList(prev => {
      let changed = false;
      const next = prev.map(q => {
        if (q.status !== 'expired' && q.validUntil && new Date(q.validUntil) < now) {
          changed = true;
          return { ...q, status: 'expired' as QuoteStatus, updatedAt: new Date().toISOString() };
        }
        return q;
      });
      return changed ? next : prev;
    });

    setInvoicesList(prev => {
      let changed = false;
      const next = prev.map(inv => {
        if (inv.paymentStatus === 'pending' && inv.dueDate && new Date(inv.dueDate) < now) {
          changed = true;
          return { ...inv, paymentStatus: 'overdue' as PaymentStatus, updatedAt: new Date().toISOString() };
        }
        return inv;
      });
      return changed ? next : prev;
    });
  }, [quotationsList.length, invoicesList.length]);

  // --- Totals (VAT-inclusive) with promo
  const totals = useCallback(
    () =>
      calculateTotals({
        items: quotedProducts,
        designCost,
        sampleCost,
        handlingCost,
        vatRate: 0.15,
        promo,
      }),
    [quotedProducts, designCost, sampleCost, handlingCost, promo]
  );

  // --- Product handlers
  const handleAddProduct = () => {
    if (!selectedProductId) return;
    const product = availableProducts.find(p => String(p.id) === selectedProductId);
    if (!product) return;
    if (quotedProducts.some(p => p.originalId === product.id)) {
      toast({
        title: 'Product already added',
        description: `"${product.name}" is already in your list.`,
        variant: 'warning'
      });
      return;
    }
    const qp: QuotedProduct = {
      ...product,
      quoteId: `quote-item-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      originalId: product.id,
      quantity: 1,
      sellingPrice: product.price
    };
    setQuotedProducts(prev => [...prev, qp]);
    setSelectedProductId('');
  };

  const updateQuotedProduct = (quoteId: string, field: keyof QuotedProduct, value: any) => {
    setQuotedProducts(prev => prev.map(p => (p.quoteId === quoteId ? { ...p, [field]: value } : p)));
  };

  const removeQuotedProduct = (quoteId: string) => {
    setQuotedProducts(prev => prev.filter(p => p.quoteId !== quoteId));
  };

  const resetForm = useCallback(() => {
    setCustomerName('');
    setCustomerEmail('');
    setCustomerPhone('');
    setQuoteDate(new Date().toISOString().split('T')[0]);
    setValidUntil('');
    setQuotedProducts([]);
    setSelectedProductId('');
    setDesignCost(0);
    setSampleCost(0);
    setHandlingCost(0);
    setPromo(undefined);
    setEditingQuotationId(null);
    setEditingInvoiceId(null);
  }, []);

  // --- Quotation save/load/status/delete
  const saveQuotation = async () => {
    if (!customerName || quotedProducts.length === 0) {
      toast({
        title: 'Validation Error',
        description: 'Customer name and at least one product are required.',
        variant: 'destructive'
      });
      return;
    }

    const existing = editingQuotationId ? quotationsList.find(q => q.id === editingQuotationId) : null;

    // Try to get a human display name via sequences API (and keep existing if present)
    let displayName: string | undefined = existing?.displayName;
    try {
      if (!displayName) {
        const resp = await fetch('/api/sequences/next', {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({ type: 'quotation' })
        });
        if (resp.ok) {
          const { next } = await resp.json();
          displayName = buildHumanDocName('Quotation', next); // "Quotation X"
        } else if (nextQuotationNumber) {
          // fallback to peeked number if POST failed
          displayName = buildHumanDocName('Quotation', nextQuotationNumber);
        }
      }
    } catch {
      if (!displayName && nextQuotationNumber) {
        displayName = buildHumanDocName('Quotation', nextQuotationNumber);
      }
    }

    const t = totals();

    const record: QuotationRecord = {
      id: editingQuotationId || `quote-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      displayName,
      customerName,
      customerEmail,
      customerPhone,
      quoteDate,
      validUntil,
      quotedProducts,
      designCost,
      sampleCost,
      handlingCost,
      grandTotal: t.grandTotal,
      status: editingQuotationId
        ? (quotationsList.find(q => q.id === editingQuotationId)?.status || 'draft')
        : 'draft',
      createdAt: editingQuotationId
        ? (quotationsList.find(q => q.id === editingQuotationId)?.createdAt || new Date().toISOString())
        : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      promo, // <-- persist discount with the quote
    };

    if (editingQuotationId) {
      setQuotationsList(prev => prev.map(q => (q.id === editingQuotationId ? record : q)));
      toast({ title: 'Quotation Updated', description: `Updated quotation for ${customerName}.` });
    } else {
      setQuotationsList(prev => [...prev, record]);
      toast({ title: 'Quotation Saved', description: `Saved quotation for ${customerName}.` });
    }

    resetForm();
    setCurrentView('list-quotes');
  };

  const loadQuotationForEdit = (id: string) => {
    const q = quotationsList.find(x => x.id === id);
    if (!q) {
      toast({ title: 'Error', description: 'Quotation not found.', variant: 'destructive' });
      return;
    }
    setCustomerName(q.customerName);
    setCustomerEmail(q.customerEmail);
    setCustomerPhone(q.customerPhone);
    setQuoteDate(q.quoteDate);
    setValidUntil(q.validUntil);
    setQuotedProducts(q.quotedProducts);
    setDesignCost(q.designCost);
    setSampleCost(q.sampleCost);
    setHandlingCost(q.handlingCost);
    setPromo(q.promo); // <-- restore discount
    setEditingQuotationId(q.id);
    setCurrentView('edit-quote');
  };

  const updateQuotationStatus = (id: string, newStatus: QuoteStatus) => {
    setQuotationsList(prev => prev.map(q => (q.id === id ? { ...q, status: newStatus, updatedAt: new Date().toISOString() } : q)));
    toast({ title: 'Status Updated', description: `Quotation ${id} → ${newStatus}` });
  };

  const deleteQuotation = (id: string) => {
    toast({
      title: 'Confirm Deletion',
      description: 'This will also delete related invoices.',
      variant: 'destructive',
      action: (
        <Button
          variant="secondary"
          onClick={() => {
            setIsDeletingQuotation(true);
            setQuotationsList(prev => prev.filter(q => q.id !== id));
            setInvoicesList(prev => prev.filter(inv => inv.relatedQuotationId !== id));
            toast({ title: 'Quotation Deleted', description: 'Removed quotation and related invoices.' });
            setIsDeletingQuotation(false);
          }}
          disabled={isDeletingQuotation}
        >
          {isDeletingQuotation ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
          Delete
        </Button>
      )
    });
  };

  const convertToInvoice = (quoteId: string) => {
    const quote = quotationsList.find(q => q.id === quoteId);
    if (!quote) return;
    const newInvoice: InvoiceRecord = {
      ...quote,
      id: `invoice-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      invoiceNumber: `INV-${Math.floor(10000 + Math.random() * 90000)}`, // will later become "Invoice X" via sequence if desired
      issueDate: new Date().toISOString().split('T')[0],
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      paymentStatus: 'pending',
      relatedQuotationId: quoteId,
      status: 'draft',
      promo: quote.promo, // <-- carry promo forward
    };
    setInvoicesList(prev => [...prev, newInvoice]);
    setQuotationsList(prev => prev.map(q => (q.id === quoteId ? { ...q, status: 'converted_to_invoice' as QuoteStatus } : q)));
    toast({ title: 'Converted', description: `Quotation → Invoice ${newInvoice.invoiceNumber}` });
    setCurrentView('list-invoices');
  };

  // --- Invoice save/load/status/delete
  const saveInvoice = async () => {
    if (!customerName || quotedProducts.length === 0) {
      toast({
        title: 'Validation Error',
        description: 'Customer name and at least one product are required.',
        variant: 'destructive'
      });
      return;
    }

    const existing = editingInvoiceId ? invoicesList.find(i => i.id === editingInvoiceId) : null;

    // Try to get a human invoice name via sequences API (optional)
    let humanInvoiceLabel: string | undefined = existing?.invoiceNumber;
    try {
      if (!humanInvoiceLabel) {
        const resp = await fetch('/api/sequences/next', {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({ type: 'invoice' })
        });
        if (resp.ok) {
          const { next } = await resp.json();
          humanInvoiceLabel = buildHumanDocName('Invoice', next); // "Invoice X"
        } else if (nextInvoiceNumber) {
          humanInvoiceLabel = buildHumanDocName('Invoice', nextInvoiceNumber);
        }
      }
    } catch {
      if (!humanInvoiceLabel && nextInvoiceNumber) {
        humanInvoiceLabel = buildHumanDocName('Invoice', nextInvoiceNumber);
      }
    }

    const t = totals();

    const record: InvoiceRecord = {
      id: editingInvoiceId || `invoice-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      invoiceNumber: humanInvoiceLabel || `INV-${Math.floor(10000 + Math.random() * 90000)}`,
      customerName,
      customerEmail,
      customerPhone,
      issueDate: existing?.issueDate || new Date().toISOString().split('T')[0],
      dueDate: existing?.dueDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      quoteDate: existing?.quoteDate || '',
      validUntil: existing?.validUntil || '',
      quotedProducts,
      designCost,
      sampleCost,
      handlingCost,
      grandTotal: t.grandTotal,
      status: existing?.status || 'draft',
      paymentStatus: existing?.paymentStatus || 'pending',
      relatedQuotationId: existing?.relatedQuotationId || null,
      createdAt: existing?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      promo, // <-- persist discount with the invoice
    };

    if (editingInvoiceId) {
      setInvoicesList(prev => prev.map(i => (i.id === editingInvoiceId ? record : i)));
      toast({ title: 'Invoice Updated', description: `Updated ${record.invoiceNumber}.` });
    } else {
      setInvoicesList(prev => [...prev, record]);
      toast({ title: 'Invoice Saved', description: `Saved ${record.invoiceNumber}.` });
    }

    resetForm();
    setCurrentView('list-invoices');
  };

  const loadInvoiceForEdit = (id: string) => {
    const inv = invoicesList.find(i => i.id === id);
    if (!inv) {
      toast({ title: 'Error', description: 'Invoice not found.', variant: 'destructive' });
      return;
    }
    setCustomerName(inv.customerName);
    setCustomerEmail(inv.customerEmail);
    setCustomerPhone(inv.customerPhone);
    setQuoteDate(inv.quoteDate || '');
    setValidUntil(inv.validUntil || '');
    setQuotedProducts(inv.quotedProducts);
    setDesignCost(inv.designCost);
    setSampleCost(inv.sampleCost);
    setHandlingCost(inv.handlingCost);
    setPromo(inv.promo); // <-- restore discount
    setEditingInvoiceId(inv.id);
    setCurrentView('edit-invoice');
  };

  const updateInvoicePaymentStatus = (id: string, newStatus: PaymentStatus) => {
    setInvoicesList(prev => prev.map(inv => (inv.id === id ? { ...inv, paymentStatus: newStatus, updatedAt: new Date().toISOString() } : inv)));
    toast({ title: 'Payment Status Updated', description: `Invoice ${id} → ${newStatus}` });
  };

  const deleteInvoice = (id: string) => {
    toast({
      title: 'Confirm Deletion',
      description: 'Delete this invoice?',
      variant: 'destructive',
      action: (
        <Button
          variant="secondary"
          onClick={() => {
            setIsDeletingInvoice(true);
            setInvoicesList(prev => prev.filter(i => i.id !== id));
            toast({ title: 'Invoice Deleted', description: 'Removed invoice.' });
            setIsDeletingInvoice(false);
          }}
          disabled={isDeletingInvoice}
        >
          {isDeletingInvoice ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
          Delete
        </Button>
      )
    });
  };

  // --- Build HTML + download/send
  const downloadPdf = (data: QuotationRecord | InvoiceRecord, type: 'quotation' | 'invoice') => {
    const html = buildDocumentHtml({
      data,
      type,
      company: companyDetails,
      bankAccounts,
      selectedBankAccountIds, // MULTI
      termsHtml: nl2brHtml(termsInput), // friendly authoring -> HTML
      logoUrl,
      // prefer promo saved on the record; otherwise fall back to current UI state
      promo: (data as any).promo ?? promo,
    });
    const filename = `${type}-${data.customerName.replace(/\s+/g, '-')}-${type === 'quotation'
      ? (data as QuotationRecord).quoteDate
      : (data as InvoiceRecord).issueDate}.pdf`;

    downloadPdfFromHtml(html, filename)
      .then(() => toast({
        title: `${type === 'quotation' ? 'Quotation' : 'Invoice'} Downloaded`,
        description: `Saved PDF for ${data.customerName}.`
      }))
      .catch(err => {
        console.error('PDF error:', err);
        toast({
          title: `Failed to Download ${type === 'quotation' ? 'Quotation' : 'Invoice'}`,
          description: 'An error occurred while generating the PDF.',
          variant: 'destructive'
        });
      });
  };

  const sendDocument = async (data: QuotationRecord | InvoiceRecord, type: 'quotation' | 'invoice') => {
    setIsSendingDocument(true);
    const htmlBody = buildDocumentHtml({
      data,
      type,
      company: companyDetails,
      bankAccounts,
      selectedBankAccountIds, // MULTI
      termsHtml: nl2brHtml(termsInput),
      logoUrl,
      promo: (data as any).promo ?? promo, // same fallback behavior
    });
    const subject = `${type === 'quotation' ? 'Quotation' : 'Invoice'} from ${companyDetails.name}`;

    try {
      const res = await fetch('/api/send-document-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipientEmail: data.customerEmail,
          subject,
          htmlBody,
          documentType: type,
          customerName: data.customerName
        })
      });

      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e.message || 'Failed to send document.');
      }

      toast({
        title: `${type === 'quotation' ? 'Quotation' : 'Invoice'} Sent`,
        description: `Emailed ${type} to ${data.customerEmail || 'customer'}.`
      });

      if (type === 'quotation') {
        setQuotationsList(prev => prev.map(q => (q.id === data.id ? { ...q, status: 'sent', updatedAt: new Date().toISOString() } : q)));
      } else {
        setInvoicesList(prev => prev.map(i => (i.id === data.id ? { ...i, status: 'sent', updatedAt: new Date().toISOString() } : i)));
      }
    } catch (error) {
      console.error('Send error:', error);
      toast({
        title: `Failed to Send ${type === 'quotation' ? 'Quotation' : 'Invoice'}`,
        description: error instanceof Error ? error.message : 'Unknown error.',
        variant: 'destructive'
      });
    } finally {
      setIsSendingDocument(false);
    }
  };

  // --- Helpers to build temporary records from the current form
  const getCurrentFormDataAsQuotation = (): QuotationRecord => {
    const t = totals();
    return {
      id: editingQuotationId || `temp-quote-${Date.now()}`,
      displayName: nextQuotationNumber ? buildHumanDocName('Quotation', nextQuotationNumber) : undefined,
      customerName,
      customerEmail,
      customerPhone,
      quoteDate,
      validUntil,
      quotedProducts,
      designCost,
      sampleCost,
      handlingCost,
      grandTotal: t.grandTotal,
      status: 'draft',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      promo, // include in the temp record so PDF sees it even without explicit arg
    };
  };

  const getCurrentFormDataAsInvoice = (): InvoiceRecord => {
    const existing = editingInvoiceId ? invoicesList.find(i => i.id === editingInvoiceId) : null;
    const t = totals();
    return {
      id: editingInvoiceId || `temp-invoice-${Date.now()}`,
      invoiceNumber: existing?.invoiceNumber || (nextInvoiceNumber ? buildHumanDocName('Invoice', nextInvoiceNumber) : `INV-${Math.floor(10000 + Math.random() * 90000)}`),
      customerName,
      customerEmail,
      customerPhone,
      issueDate: existing?.issueDate || new Date().toISOString().split('T')[0],
      dueDate: existing?.dueDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      quoteDate: existing?.quoteDate || '',
      validUntil: existing?.validUntil || '',
      quotedProducts,
      designCost,
      sampleCost,
      handlingCost,
      grandTotal: t.grandTotal,
      status: existing?.status || 'draft',
      paymentStatus: existing?.paymentStatus || 'pending',
      relatedQuotationId: existing?.relatedQuotationId || null,
      createdAt: existing?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      promo, // include here too
    };
  };

  // ---------- UI FRAGMENTS (stateless child components are okay) ----------

  const PromoEditor = () => (
    <div className="space-y-2 md:col-span-3">
      <Label>Promotion / Discount</Label>
      <div className="grid md:grid-cols-4 gap-2">
        <Input
          placeholder="Promo code (optional)"
          value={promo?.code || ''}
          onChange={(e) => setPromo(prev => ({ ...(prev || { discountType: 'percent', discountValue: 0 }), code: e.target.value }))}
        />
        <Select
          value={promo?.discountType || 'percent'}
          onValueChange={(v: DiscountType) =>
            setPromo(prev => ({ ...(prev || { discountValue: 0 }), discountType: v }))
          }
        >
          <SelectTrigger><SelectValue placeholder="Type" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="percent">Percent %</SelectItem>
            <SelectItem value="fixed">Fixed (R)</SelectItem>
          </SelectContent>
        </Select>
        <Input
          type="number"
          step="0.01"
          placeholder={promo?.discountType === 'fixed' ? 'Amount (R)' : 'Percent %'}
          value={promo?.discountValue ?? 0}
          onChange={(e) => setPromo(prev => ({ ...(prev || { discountType: 'percent' }), discountValue: parseFloat(e.target.value) || 0 }))}
        />
        <Button variant="outline" onClick={() => setPromo(undefined)}>Clear</Button>
      </div>
    </div>
  );

  const BankPicker = () => (
    <div className="space-y-2">
      <Label>Bank accounts to print</Label>
      <div className="rounded border p-3 grid md:grid-cols-2 gap-2 bg-white">
        {bankAccounts.length === 0 && (
          <div className="text-sm text-gray-500">No bank accounts configured yet.</div>
        )}

        {bankAccounts.map(b => {
          const checked = selectedBankAccountIds.includes(b.id);
          return (
            <label
              key={b.id}
              className={`flex items-start gap-3 p-2 rounded border cursor-pointer ${
                checked ? 'bg-amber-50 border-amber-300' : 'bg-gray-50'
              }`}
            >
              <input
                type="checkbox"
                className="mt-1"
                checked={checked}
                onChange={(e) => {
                  setSelectedBankAccountIds(prev => {
                    if (e.target.checked) return Array.from(new Set([...prev, b.id]));
                    return prev.filter(id => id !== b.id);
                  });
                }}
              />
              <div className="text-sm leading-5">
                <div className="font-medium">
                  {(b.label || b.bankName)} {b.isActive ? <Badge className="ml-2">active</Badge> : <Badge variant="secondary" className="ml-2">inactive</Badge>}
                </div>
                <div className="text-gray-600">
                  {b.bankName} — {b.bankAccountNumber} (Branch: {b.bankBranchCode || '-'})
                </div>
              </div>
            </label>
          );
        })}
      </div>
      <p className="text-xs text-gray-500">Tip: select more than one to show multiple banking options on the document.</p>
    </div>
  );

  // ---------- FORMS ----------

  const renderQuotationForm = () => {
    const t = totals();
    return (
      <>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Customer Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="customerName">Customer Name</Label>
                <Input id="customerName" value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="Enter customer name" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="customerEmail">Email</Label>
                <Input id="customerEmail" type="email" value={customerEmail} onChange={(e) => setCustomerEmail(e.target.value)} placeholder="customer@example.com" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="customerPhone">Phone</Label>
                <Input id="customerPhone" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} placeholder="+27 123 456 789" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="validUntil">Valid Until</Label>
                <Input id="validUntil" type="date" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Add Products to Quote
            </CardTitle>
          </CardHeader>
          <CardContent>
            {availableProducts.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <FileText className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <p>No products available. Please select a snapshot from the Pricing Calculator first.</p>
                <Link href="/pricing-calculator">
                  <Button className="mt-4">Go to Pricing Calculator</Button>
                </Link>
              </div>
            ) : (
              <div className="flex gap-4">
                <div className="flex-1">
                  <Select value={selectedProductId} onValueChange={setSelectedProductId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a product to add" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableProducts.map(product => (
                        <SelectItem key={product.id} value={String(product.id)}>
                          {product.name} — Suggested Price: R{product.price.toFixed(2)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={handleAddProduct} disabled={!selectedProductId}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Product
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {quotedProducts.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Quoted Products
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {quotedProducts.map(product => (
                  <div key={product.quoteId} className="border rounded-lg p-4 bg-gray-50">
                    <div className="flex justify-between items-start mb-3">
                      <h4 className="font-semibold">{product.name}</h4>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeQuotedProduct(product.quoteId)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="grid md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label>Quantity</Label>
                        <Input
                          type="number"
                          min="1"
                          value={product.quantity}
                          onChange={(e) => updateQuotedProduct(product.quoteId, 'quantity', parseInt(e.target.value, 10) || 1)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Unit Price</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={product.sellingPrice}
                          onChange={(e) => updateQuotedProduct(product.quoteId, 'sellingPrice', parseFloat(e.target.value) || 0)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Line Total</Label>
                        <div className="p-2 bg-amber-100 rounded text-amber-800 font-semibold">
                          R{calculateLineTotal(product).toFixed(2)}
                        </div>
                      </div>
                    </div>
                    <div className="mt-2">
                      <Label>Product Notes</Label>
                      <Input
                        value={product.notes || ''}
                        onChange={(e) => updateQuotedProduct(product.quoteId, 'notes', e.target.value)}
                        placeholder="e.g., Size, Color, Specific requirements"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Additional Costs
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="designCost">Design Cost</Label>
                <Input id="designCost" type="number" step="0.01" value={designCost} onChange={(e) => setDesignCost(parseFloat(e.target.value) || 0)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sampleCost">Sample Cost</Label>
                <Input id="sampleCost" type="number" step="0.01" value={sampleCost} onChange={(e) => setSampleCost(parseFloat(e.target.value) || 0)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="handlingCost">Handling Cost</Label>
                <Input id="handlingCost" type="number" step="0.01" value={handlingCost} onChange={(e) => setHandlingCost(parseFloat(e.target.value) || 0)} />
              </div>

              {/* Promotion editor */}
              <PromoEditor />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Quote Summary</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between"><span>Lines Subtotal:</span><span>R{t.linesSubtotal.toFixed(2)}</span></div>
              {t.additionalCosts > 0 && (
                <div className="flex justify-between"><span>Additional Costs:</span><span>R{t.additionalCosts.toFixed(2)}</span></div>
              )}
              {t.discount > 0 && (
                <div className="flex justify-between"><span>Promotion / Discount:</span><span>-R{t.discount.toFixed(2)}</span></div>
              )}
              <div className="flex justify-between"><span>VAT {(t.vatRate * 100).toFixed(0)}%:</span><span>R{t.vatAmount.toFixed(2)}</span></div>
              <Separator />
              <div className="flex justify-between text-lg font-bold text-amber-600">
                <span>Grand Total:</span><span>R{t.grandTotal.toFixed(2)}</span>
              </div>
            </div>

            <div className="mt-4">
              <BankPicker />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex gap-4 flex-wrap">
              <Button onClick={saveQuotation} disabled={!customerName || quotedProducts.length === 0} className="flex-1 md:flex-initial">
                <SquarePen className="h-4 w-4 mr-2" />
                {editingQuotationId ? 'Update Quotation' : 'Save Quotation'}
              </Button>
              <Button
                onClick={() => downloadPdf(getCurrentFormDataAsQuotation(), 'quotation')}
                disabled={!customerName || quotedProducts.length === 0}
                className="flex-1 md:flex-initial"
                variant="outline"
              >
                <Download className="h-4 w-4 mr-2" />
                Download PDF
              </Button>
              <Button variant="outline" onClick={resetForm} className="flex-1 md:flex-initial">Reset Form</Button>
              <Button variant="outline" onClick={() => setCurrentView('edit-banking')} className="flex-1 md:flex-initial">
                <Settings className="h-4 w-4 mr-2" /> Settings
              </Button>
            </div>
          </CardContent>
        </Card>
      </>
    );
  };

  const renderInvoiceForm = () => {
    const t = totals();
    return (
      <>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Customer Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="customerName">Customer Name</Label>
                <Input id="customerName" value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="Enter customer name" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="customerEmail">Email</Label>
                <Input id="customerEmail" type="email" value={customerEmail} onChange={(e) => setCustomerEmail(e.target.value)} placeholder="customer@example.com" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="customerPhone">Phone</Label>
                <Input id="customerPhone" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} placeholder="+27 123 456 789" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="issueDate">Issue Date</Label>
                <Input id="issueDate" type="date" value={new Date().toISOString().split('T')[0]} readOnly />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dueDate">Due Date</Label>
                <Input id="dueDate" type="date" value={new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]} readOnly />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Invoice Items
            </CardTitle>
          </CardHeader>
          <CardContent>
            {availableProducts.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <FileText className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <p>No products available. Please select a snapshot from the Pricing Calculator first.</p>
                <Link href="/pricing-calculator">
                  <Button className="mt-4">Go to Pricing Calculator</Button>
                </Link>
              </div>
            ) : (
              <div className="flex gap-4">
                <div className="flex-1">
                  <Select value={selectedProductId} onValueChange={setSelectedProductId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a product to add" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableProducts.map(product => (
                        <SelectItem key={product.id} value={String(product.id)}>
                          {product.name} — Suggested Price: R{product.price.toFixed(2)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={handleAddProduct} disabled={!selectedProductId}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Product
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {quotedProducts.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Invoice Products
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {quotedProducts.map(product => (
                  <div key={product.quoteId} className="border rounded-lg p-4 bg-gray-50">
                    <div className="flex justify-between items-start mb-3">
                      <h4 className="font-semibold">{product.name}</h4>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeQuotedProduct(product.quoteId)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="grid md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label>Quantity</Label>
                        <Input
                          type="number"
                          min="1"
                          value={product.quantity}
                          onChange={(e) => updateQuotedProduct(product.quoteId, 'quantity', parseInt(e.target.value, 10) || 1)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Unit Price</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={product.sellingPrice}
                          onChange={(e) => updateQuotedProduct(product.quoteId, 'sellingPrice', parseFloat(e.target.value) || 0)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Line Total</Label>
                        <div className="p-2 bg-amber-100 rounded text-amber-800 font-semibold">
                          R{calculateLineTotal(product).toFixed(2)}
                        </div>
                      </div>
                    </div>
                    <div className="mt-2">
                      <Label>Product Notes</Label>
                      <Input
                        value={product.notes || ''}
                        onChange={(e) => updateQuotedProduct(product.quoteId, 'notes', e.target.value)}
                        placeholder="e.g., Size, Color, Specific requirements"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Additional Costs
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="designCost">Design Cost</Label>
                <Input id="designCost" type="number" step="0.01" value={designCost} onChange={(e) => setDesignCost(parseFloat(e.target.value) || 0)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sampleCost">Sample Cost</Label>
                <Input id="sampleCost" type="number" step="0.01" value={sampleCost} onChange={(e) => setSampleCost(parseFloat(e.target.value) || 0)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="handlingCost">Handling Cost</Label>
                <Input id="handlingCost" type="number" step="0.01" value={handlingCost} onChange={(e) => setHandlingCost(parseFloat(e.target.value) || 0)} />
              </div>

              {/* Promotion editor */}
              <PromoEditor />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Invoice Summary</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between"><span>Lines Subtotal:</span><span>R{t.linesSubtotal.toFixed(2)}</span></div>
              {t.additionalCosts > 0 && (
                <div className="flex justify-between"><span>Additional Costs:</span><span>R{t.additionalCosts.toFixed(2)}</span></div>
              )}
              {t.discount > 0 && (
                <div className="flex justify-between"><span>Promotion / Discount:</span><span>-R{t.discount.toFixed(2)}</span></div>
              )}
              <div className="flex justify-between"><span>VAT {(t.vatRate * 100).toFixed(0)}%:</span><span>R{t.vatAmount.toFixed(2)}</span></div>
              <Separator />
              <div className="flex justify-between text-lg font-bold text-amber-600">
                <span>Grand Total:</span><span>R{t.grandTotal.toFixed(2)}</span>
              </div>
            </div>

            <div className="mt-4">
              <BankPicker />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex gap-4 flex-wrap">
              <Button onClick={saveInvoice} disabled={!customerName || quotedProducts.length === 0} className="flex-1 md:flex-initial">
                <SquarePen className="h-4 w-4 mr-2" />
                {editingInvoiceId ? 'Update Invoice' : 'Save Invoice'}
              </Button>
              <Button
                onClick={() => downloadPdf(getCurrentFormDataAsInvoice(), 'invoice')}
                disabled={!customerName || quotedProducts.length === 0}
                className="flex-1 md:flex-initial"
                variant="outline"
              >
                <Download className="h-4 w-4 mr-2" />
                Download PDF
              </Button>
              <Button variant="outline" onClick={resetForm} className="flex-1 md:flex-initial">Reset Form</Button>
              <Button variant="outline" onClick={() => setCurrentView('edit-banking')} className="flex-1 md:flex-initial">
                <Settings className="h-4 w-4 mr-2" /> Settings
              </Button>
            </div>
          </CardContent>
        </Card>
      </>
    );
  };

  // ---------- LISTS ----------

  const renderQuotationList = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <List className="h-5 w-5" />
          Saved Quotations ({quotationsList.length})
        </CardTitle>
        <p className="text-sm text-gray-500">Manage your saved quotations. Edit, delete, download, convert, or send.</p>
      </CardHeader>
      <CardContent>
        {quotationsList.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <FileText className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <p>No quotations yet. Create one to get started.</p>
            <Button onClick={() => { resetForm(); setCurrentView('create-quote'); }} className="mt-4">Create New Quotation</Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {quotationsList.map((quote) => (
                  <tr key={quote.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{quote.displayName || quote.id}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{quote.customerName}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{quote.quoteDate}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">R{quote.grandTotal.toFixed(2)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <Select
                        value={quote.status}
                        onValueChange={(v: QuoteStatus) => updateQuotationStatus(quote.id, v)}
                        disabled={isSendingDocument || isDeletingQuotation || quote.status === 'converted_to_invoice' || quote.status === 'expired'}
                      >
                        <SelectTrigger className={`w-[160px] capitalize ${
                          quote.status === 'sent' ? 'bg-blue-100 text-blue-800' :
                          quote.status === 'accepted' ? 'bg-green-100 text-green-800' :
                          quote.status === 'converted_to_invoice' ? 'bg-purple-100 text-purple-800' :
                          quote.status === 'expired' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'
                        }`}>
                          <SelectValue placeholder="Status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="draft">Draft</SelectItem>
                          <SelectItem value="sent">Sent</SelectItem>
                          <SelectItem value="accepted">Accepted</SelectItem>
                          <SelectItem value="rejected">Rejected</SelectItem>
                          <SelectItem value="converted_to_invoice" disabled>Converted to Invoice</SelectItem>
                          <SelectItem value="expired" disabled>Expired</SelectItem>
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" size="sm" onClick={() => loadQuotationForEdit(quote.id)} title="Edit">
                          <SquarePen className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => downloadPdf(quote, 'quotation')} title="Download PDF">
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => sendDocument(quote, 'quotation')} title="Send" disabled={isSendingDocument}>
                          {isSendingDocument ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => convertToInvoice(quote.id)} disabled={quote.status === 'converted_to_invoice'} title="Convert to Invoice">
                          <ReceiptText className="h-4 w-4" />
                        </Button>
                        <Button variant="destructive" size="sm" onClick={() => deleteQuotation(quote.id)} title="Delete" disabled={isDeletingQuotation}>
                          {isDeletingQuotation ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );

  const renderInvoiceList = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ReceiptText className="h-5 w-5" />
          Saved Invoices ({invoicesList.length})
        </CardTitle>
        <p className="text-sm text-gray-500">Manage your invoices. Edit, delete, download, or send.</p>
      </CardHeader>
      <CardContent>
        {invoicesList.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <FileText className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <p>No invoices created yet. Convert a quotation or create a new one.</p>
            <Button onClick={() => { resetForm(); setCurrentView('create-quote'); }} className="mt-4">Create New Quotation</Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Invoice No.</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Issue Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {invoicesList.map((inv) => (
                  <tr key={inv.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{inv.invoiceNumber}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{inv.customerName}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{inv.issueDate}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">R{inv.grandTotal.toFixed(2)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <Select
                        value={inv.paymentStatus}
                        onValueChange={(v: PaymentStatus) => updateInvoicePaymentStatus(inv.id, v)}
                        disabled={isSendingDocument || isDeletingInvoice}
                      >
                        <SelectTrigger className={`w-[160px] capitalize ${
                          inv.paymentStatus === 'paid' ? 'bg-green-100 text-green-800' :
                          inv.paymentStatus === 'overdue' ? 'bg-red-100 text-red-800' :
                          inv.paymentStatus === 'cancelled' ? 'bg-gray-100 text-gray-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          <SelectValue placeholder="Status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pending">Pending</SelectItem>
                          <SelectItem value="paid">Paid</SelectItem>
                          <SelectItem value="overdue">Overdue</SelectItem>
                          <SelectItem value="cancelled">Cancelled</SelectItem>
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" size="sm" onClick={() => loadInvoiceForEdit(inv.id)} title="Edit">
                          <SquarePen className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => downloadPdf(inv, 'invoice')} title="Download PDF">
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => sendDocument(inv, 'invoice')} title="Send" disabled={isSendingDocument}>
                          {isSendingDocument ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
                        </Button>
                        <Button variant="destructive" size="sm" onClick={() => deleteInvoice(inv.id)} title="Delete" disabled={isDeletingInvoice}>
                          {isDeletingInvoice ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );

  // ---------- SETTINGS (Company + Bank Management + Terms) ----------

  async function reloadBankAccounts() {
    try {
      const res = await fetch('/api/bank-accounts');
      if (!res.ok) throw new Error('Failed to load bank accounts');
      const list: BankAccount[] = await res.json();
      setBankAccounts(list);

      // keep selection if still present, else active ones, else first
      setSelectedBankAccountIds(prev => {
        const stillThere = prev.filter(id => list.some(b => b.id === id));
        if (stillThere.length) return stillThere;
        if (list.length === 0) return [];
        const actives = list.filter(b => b.isActive).map(b => b.id);
        return actives.length ? actives : [list[0].id];
      });
    } catch (e) {
      toast({
        title: 'Bank accounts',
        description: e instanceof Error ? e.message : 'Failed to reload',
        variant: 'destructive'
      });
    }
  }

  async function addBank() {
    try {
      if (!newBank.bankName || !newBank.bankAccountNumber) {
        toast({ title: 'Missing fields', description: 'Bank name and account number are required.', variant: 'destructive' });
        return;
      }
      const res = await fetch('/api/bank-accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newBank),
      });
      if (!res.ok) throw new Error('Failed to create bank account');
      setNewBank({ label: '', bankName: '', bankAccountNumber: '', bankBranchCode: '', isActive: true });
      await reloadBankAccounts();
      toast({ title: 'Bank account added', description: 'It is now available to print on documents.' });
    } catch (e) {
      toast({ title: 'Add bank failed', description: e instanceof Error ? e.message : 'Error', variant: 'destructive' });
    }
  }

  async function toggleBank(id: string) {
    try {
      const res = await fetch(`/api/bank-accounts/${id}/toggle`, { method: 'POST' });
      if (!res.ok) throw new Error('Failed to toggle account');
      await reloadBankAccounts();
    } catch (e) {
      toast({ title: 'Toggle failed', description: e instanceof Error ? e.message : 'Error', variant: 'destructive' });
    }
  }

  async function deleteBank(id: string) {
    try {
      const res = await fetch(`/api/bank-accounts/${id}`, { method: 'DELETE' });
      if (res.status === 204 || res.ok) {
        await reloadBankAccounts();
        toast({ title: 'Bank account deleted' });
      } else {
        throw new Error('Failed to delete account');
      }
    } catch (e) {
      toast({ title: 'Delete failed', description: e instanceof Error ? e.message : 'Error', variant: 'destructive' });
    }
  }

  const renderSettings = () => (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Company / Banking & Terms
          </CardTitle>
          <p className="text-sm text-gray-500">Manage company details, <strong>multiple bank accounts</strong>, and your <strong>Terms</strong>.</p>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Company quick fields */}
          <div className="grid md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Company Name</Label>
              <Input value={companyDetails.name} onChange={(e) => setCompanyDetails(prev => ({ ...prev, name: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input value={companyDetails.phone} onChange={(e) => setCompanyDetails(prev => ({ ...prev, phone: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Website</Label>
              <Input value={companyDetails.website} onChange={(e) => setCompanyDetails(prev => ({ ...prev, website: e.target.value }))} />
            </div>
          </div>

          {/* New Bank Account */}
          <div className="border rounded-lg p-4">
            <div className="font-semibold mb-2">Add Bank Account</div>
            <div className="grid md:grid-cols-5 gap-2">
              <Input placeholder="Label (e.g. Main)" value={newBank.label} onChange={(e) => setNewBank(prev => ({ ...prev, label: e.target.value }))} />
              <Input placeholder="Bank Name" value={newBank.bankName} onChange={(e) => setNewBank(prev => ({ ...prev, bankName: e.target.value }))} />
              <Input placeholder="Account Number" value={newBank.bankAccountNumber} onChange={(e) => setNewBank(prev => ({ ...prev, bankAccountNumber: e.target.value }))} />
              <Input placeholder="Branch Code" value={newBank.bankBranchCode} onChange={(e) => setNewBank(prev => ({ ...prev, bankBranchCode: e.target.value }))} />
              <Button onClick={addBank}><Plus className="h-4 w-4 mr-1" /> Add</Button>
            </div>
          </div>

          {/* Existing accounts */}
          <div>
            <Label className="block mb-2">Bank Accounts</Label>
            <div className="flex flex-col gap-2">
              {bankAccounts.length === 0 && <p className="text-sm text-gray-500">No bank accounts yet.</p>}
              {bankAccounts.map(b => (
                <div key={b.id} className="text-sm border rounded p-3 bg-gray-50 flex items-center justify-between">
                  <div>
                    <div className="font-medium">{b.label || b.bankName} {b.isActive ? <Badge className="ml-2">active</Badge> : <Badge variant="secondary" className="ml-2">inactive</Badge>}</div>
                    <div>{b.bankName} — {b.bankAccountNumber} (Branch: {b.bankBranchCode || '-'})</div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => toggleBank(b.id)}>{b.isActive ? 'Deactivate' : 'Activate'}</Button>
                    <Button variant="destructive" size="sm" onClick={() => deleteBank(b.id)}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Terms & Conditions (INLINE — not a child component) */}
          <Card>
            <CardHeader><CardTitle>Terms &amp; Conditions</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-center gap-3">
                <Label htmlFor="terms">Enter Terms (plain text)</Label>
                {/* Optional toggle if you ever want to type raw HTML */}
                {/* <Select value={termsMode} onValueChange={(v: 'plain' | 'html') => setTermsMode(v)}>
                  <SelectTrigger className="w-[140px]"><SelectValue placeholder="Mode" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="plain">Plain</SelectItem>
                    <SelectItem value="html">HTML</SelectItem>
                  </SelectContent>
                </Select> */}
              </div>
              <textarea
                id="terms"
                className="w-full h-48 rounded border p-3 text-sm"
                value={termsInput}
                onChange={(e) => setTermsInput(e.target.value)}
                placeholder="Type your terms and conditions here..."
              />
              <div className="flex gap-2">
                <Button
                  onClick={async () => {
                    setIsSavingTerms(true);
                    try {
                      const body = nl2brHtml(termsInput); // convert plain text to HTML paragraphs
                      const res = await fetch('/api/terms', {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ body }),
                      });
                      if (!res.ok) throw new Error('Failed to save terms');
                      toast({ title: 'Terms saved', description: 'Your changes were saved.' });
                      localStorage.setItem('termsHtml', body);
                    } catch (e) {
                      toast({
                        title: 'Save failed',
                        description: e instanceof Error ? e.message : 'Error',
                        variant: 'destructive',
                      });
                    } finally {
                      setIsSavingTerms(false);
                    }
                  }}
                  disabled={isSavingTerms}
                >
                  {isSavingTerms ? 'Saving…' : 'Save Terms'}
                </Button>
                <Button variant="outline" onClick={() => setTermsInput('')}>Clear</Button>
              </div>
              <p className="text-xs text-gray-500">
                Line breaks will automatically be converted to paragraphs in the PDF/email.
              </p>
            </CardContent>
          </Card>
        </CardContent>
      </Card>
    </>
  );

  // --- Render
  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-50 p-6">
      <div className="container mx-auto max-w-4xl">
        <div className="mb-6 flex items-center justify-between gap-4">
          <Link href="/">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Home
            </Button>
          </Link>

          <h1 className="text-3xl font-bold text-amber-600">Quotation &amp; Invoice Manager</h1>

          <div className="flex gap-2">
            <Button
              onClick={() => { resetForm(); setCurrentView('create-quote'); }}
              variant={currentView === 'create-quote' || currentView === 'edit-quote' ? 'default' : 'outline'}
            >
              <Plus className="h-4 w-4 mr-2" /> New Quote
            </Button>
            <Button
              onClick={() => { resetForm(); setCurrentView('list-quotes'); }}
              variant={currentView === 'list-quotes' ? 'default' : 'outline'}
            >
              <List className="h-4 w-4 mr-2" /> Manage Quotes
            </Button>
            <Button
              onClick={() => { resetForm(); setCurrentView('list-invoices'); }}
              variant={currentView === 'list-invoices' || currentView === 'edit-invoice' ? 'default' : 'outline'}
            >
              <ReceiptText className="h-4 w-4 mr-2" /> Manage Invoices
            </Button>
            <Button
              onClick={() => setCurrentView('edit-banking')}
              variant={currentView === 'edit-banking' ? 'default' : 'outline'}
            >
              <Settings className="h-4 w-4 mr-2" /> Settings
            </Button>
          </div>
        </div>

        {selectedSnapshotId && (
          <Card className="mb-6 border-amber-300 bg-amber-50 shadow-md">
            <CardContent className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Tag className="h-5 w-5 text-amber-600" />
                <span className="text-lg font-semibold text-amber-800">Current Snapshot for Quotations:</span>
                <Badge variant="secondary" className="bg-amber-200 text-amber-900">ID: {selectedSnapshotId}</Badge>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  localStorage.removeItem('selectedQuotationSnapshotId');
                  localStorage.removeItem('selectedQuotationProducts');
                  setSelectedSnapshotId(null);
                  setAvailableProducts([]);
                  setQuotedProducts([]);
                  toast({ title: 'Snapshot cleared', description: 'Select a new snapshot from the Pricing Calculator.' });
                }}
              >
                Clear Selection
              </Button>
            </CardContent>
          </Card>
        )}

        <div className="space-y-6">
          {(currentView === 'create-quote' || currentView === 'edit-quote') && (
            <>
              <h2 className="text-2xl font-bold text-amber-700">
                {editingQuotationId ? 'Edit Quotation' : 'Create New Quotation'}
              </h2>
              {renderQuotationForm()}
            </>
          )}

          {currentView === 'list-quotes' && renderQuotationList()}

          {(currentView === 'list-invoices' || currentView === 'edit-invoice') && (
            <>
              {currentView === 'list-invoices' && renderInvoiceList()}
              {currentView === 'edit-invoice' && (
                <>
                  <h2 className="text-2xl font-bold text-amber-700">Edit Invoice</h2>
                  {renderInvoiceForm()}
                </>
              )}
            </>
          )}

          {currentView === 'edit-banking' && renderSettings()}
        </div>
      </div>
    </div>
  );
}
