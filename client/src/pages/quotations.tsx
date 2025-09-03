import { useState, useEffect, useCallback, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Plus, Trash2, FileText, Download, Mail, Phone, DollarSign, Tag, List, ReceiptText, SquarePen, Send, Eye, Loader2, Settings } from "lucide-react";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import html2pdf from 'html2pdf.js';
import logoUrl from './logo.png';


// Re-aligning Product interface with PricingProduct from PricingCalculator context
interface Product {
  id: number;
  name: string;
  expectedUnits: number;
  costPerUnit: number;
  price: number;
  notes?: string;
}

interface QuotedProduct extends Product {
  quoteId: string;
  originalId: number;
  quantity: number;
  sellingPrice: number;
}

// --- New Interfaces for Saved Data ---
interface QuotationRecord {
  id: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  quoteDate: string;
  validUntil: string;
  quotedProducts: QuotedProduct[];
  designCost: number;
  sampleCost: number;
  handlingCost: number;
  grandTotal: number;
  status: 'draft' | 'sent' | 'accepted' | 'rejected' | 'converted_to_invoice' | 'expired';
  createdAt: string;
  updatedAt: string;
}

interface InvoiceRecord extends QuotationRecord {
  invoiceNumber: string;
  issueDate: string;
  dueDate: string;
  paymentStatus: 'pending' | 'paid' | 'overdue' | 'cancelled';
  relatedQuotationId: string | null;
}
// --- End New Interfaces ---

// --- Interface for Banking Details ---
interface BankingDetails {
  bankName: string;
  bankAccountNumber: string;
  bankBranchCode: string;
}
// --- End Interface for Banking Details ---

export default function Quotations() {
  const { toast } = useToast();

  // --- Refs for PDF generation ---
  const quotationPreviewRef = useRef<HTMLDivElement>(null);
  const invoicePreviewRef = useRef<HTMLDivElement>(null);

  // --- State for Company Details ---
  const [companyDetails, setCompanyDetails] = useState({
    name: "Tshepiso Branding Solutions(Pty) Ltd",
    addressLine1: "11 Enterprise Close",
    addressLine2: "Linbro Business Park Malboro Gardens",
    city: "Sandton",
    province: "Gauteng",
    postalCode: "2090",
    country: "South Africa",
    phone: "0685999595",
    website: "www.tshepisobranding.co.za",
    vatNumber: "4550116778",
    registrationNumber: "1962/004313/07",
  });

  // --- State for Banking Details ---
  const [bankingDetails, setBankingDetails] = useState<BankingDetails>({
    bankName: "ABSA",
    bankAccountNumber: "409 7457 454",
    bankBranchCode: "632005",
  });

  // --- State for current quotation form ---
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [quoteDate, setQuoteDate] = useState(new Date().toISOString().split('T')[0]);
  const [validUntil, setValidUntil] = useState('');
  const [selectedSnapshotId, setSelectedSnapshotId] = useState<string | null>(null);
  const [availableProducts, setAvailableProducts] = useState<Product[]>([]);
  const [quotedProducts, setQuotedProducts] = useState<QuotedProduct[]>([]);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [designCost, setDesignCost] = useState(0);
  const [sampleCost, setSampleCost] = useState(0);
  const [handlingCost, setHandlingCost] = useState(0);
  const [termsAccepted, setTermsAccepted] = useState(false);

  // --- State for managing saved quotations and invoices ---
  const [quotationsList, setQuotationsList] = useState<QuotationRecord[]>([]);
  const [invoicesList, setInvoicesList] = useState<InvoiceRecord[]>([]);
  const [currentView, setCurrentView] = useState<'create-quote' | 'list-quotes' | 'list-invoices' | 'edit-quote' | 'edit-invoice' | 'view-quote' | 'view-invoice' | 'edit-banking'>('create-quote');
  const [editingQuotationId, setEditingQuotationId] = useState<string | null>(null);
  const [editingInvoiceId, setEditingInvoiceId] = useState<string | null>(null);

  // --- Loading states for API calls ---
  const [isSendingDocument, setIsSendingDocument] = useState(false);
  const [isDeletingQuotation, setIsDeletingQuotation] = useState(false);
  const [isDeletingInvoice, setIsDeletingInvoice] = useState(false);

  // --- Load company details, banking details, and data from localStorage on mount ---
  useEffect(() => {
    // Load company details from localStorage
    const storedCompanyDetails = localStorage.getItem('companyDetails');
    if (storedCompanyDetails) {
      try {
        setCompanyDetails(JSON.parse(storedCompanyDetails));
      } catch (e) {
        console.error("Failed to parse company details from localStorage", e);
      }
    }

    // Load banking details from localStorage
    const storedBankingDetails = localStorage.getItem('bankingDetails');
    if (storedBankingDetails) {
      try {
        setBankingDetails(JSON.parse(storedBankingDetails));
      } catch (e) {
        console.error("Failed to parse banking details from localStorage", e);
        // Initialize with defaults if parsing fails
        setBankingDetails({
          bankName: "ABSA",
          bankAccountNumber: "409 7457 454",
          bankBranchCode: "632005",
        });
      }
    } else {
        // Initialize with defaults if not found
        setBankingDetails({
          bankName: "ABSA",
          bankAccountNumber: "409 7457 454",
          bankBranchCode: "632005",
        });
    }

    const storedSnapshotId = localStorage.getItem('selectedQuotationSnapshotId');
    const storedProducts = localStorage.getItem('selectedQuotationProducts');
    const storedQuotations = localStorage.getItem('quotations');
    const storedInvoices = localStorage.getItem('invoices');

    if (storedSnapshotId) {
      setSelectedSnapshotId(storedSnapshotId);
    }
    if (storedProducts) {
      try {
        const parsedProducts: any[] = JSON.parse(storedProducts);
        const mappedProducts: Product[] = parsedProducts.map((p: any) => ({
          id: Number(p.id),
          name: p.name || 'Unnamed Product',
          price: parseFloat(p.suggestedPrice || p.price || 0),
          costPerUnit: parseFloat(p.costPerUnit || p.cost_per_unit || 0),
          expectedUnits: parseInt(p.expectedUnits || p.expected_units || 1),
          notes: p.notes || ''
        }));
        setAvailableProducts(mappedProducts);
      } catch (error) {
        console.error('Error loading products from localStorage:', error);
        toast({
          title: "Error loading products",
          description: "Could not load products from the selected snapshot.",
          variant: "destructive"
        });
      }
    }
    if (storedQuotations) {
      setQuotationsList(JSON.parse(storedQuotations));
    }
    if (storedInvoices) {
      setInvoicesList(JSON.parse(storedInvoices));
    }
  }, [toast]);

  // --- Save company details to localStorage whenever they change ---
  useEffect(() => {
    localStorage.setItem('companyDetails', JSON.stringify(companyDetails));
  }, [companyDetails]);

  // --- Save banking details to localStorage whenever they change ---
  useEffect(() => {
    localStorage.setItem('bankingDetails', JSON.stringify(bankingDetails));
  }, [bankingDetails]);

  // --- Save data to localStorage whenever lists change ---
  useEffect(() => {
    localStorage.setItem('quotations', JSON.stringify(quotationsList));
  }, [quotationsList]);

  useEffect(() => {
    localStorage.setItem('invoices', JSON.stringify(invoicesList));
  }, [invoicesList]);

  // --- Auto-update status based on dates ---
  useEffect(() => {
    const now = new Date();
    const today = now.toISOString().split('T')[0];

    // Update quotation statuses
    setQuotationsList(prevQuotes => {
      let updated = false;
      const newQuotes = prevQuotes.map(quote => {
        if (quote.status !== 'expired' && quote.validUntil && new Date(quote.validUntil) < now) {
          updated = true;
          return { ...quote, status: 'expired', updatedAt: new Date().toISOString() };
        }
        return quote;
      });
      return updated ? newQuotes : prevQuotes;
    });

    // Update invoice statuses
    setInvoicesList(prevInvoices => {
      let updated = false;
      const newInvoices = prevInvoices.map(invoice => {
        if (invoice.paymentStatus === 'pending' && invoice.dueDate && new Date(invoice.dueDate) < now) {
          updated = true;
          return { ...invoice, paymentStatus: 'overdue', updatedAt: new Date().toISOString() };
        }
        return invoice;
      });
      return updated ? newInvoices : prevInvoices;
    });
  }, [quotationsList.length, invoicesList.length]);

  // --- Calculations (Ensure correct order) ---
  const calculateLineTotal = (product: QuotedProduct) => {
    return product.sellingPrice * product.quantity;
  };

  // 1. First, define calculateSubtotal
  const calculateSubtotal = useCallback(() => {
    return quotedProducts.reduce((sum, p) => sum + calculateLineTotal(p), 0);
  }, [quotedProducts]); // Assuming calculateLineTotal is stable

  // 2. Second, define calculateGrandTotal
  const calculateGrandTotal = useCallback(() => {
    return calculateSubtotal() + designCost + sampleCost + handlingCost;
  }, [calculateSubtotal, designCost, sampleCost, handlingCost]);

  // 3. Finally, define calculateVatAndSubtotal
  const calculateVatAndSubtotal = useCallback(() => {
    const grandTotal = calculateGrandTotal();
    const vatRate = 0.15;
    const vatAmount = grandTotal * vatRate / (1 + vatRate);
    const subtotalAmount = grandTotal - vatAmount;
    return { vatAmount, subtotalAmount };
  }, [calculateGrandTotal]);

  // --- Form Actions ---
  const handleAddProduct = () => {
    if (!selectedProductId) return;
    const product = availableProducts.find(p => String(p.id) === selectedProductId);
    if (!product) return;

    if (quotedProducts.some(p => p.originalId === product.id)) {
      toast({
        title: "Product already added",
        description: `"${product.name}" is already in your quote.`,
        variant: "warning"
      });
      return;
    }

    const quotedProduct: QuotedProduct = {
      ...product,
      quoteId: `quote-item-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      originalId: product.id,
      quantity: 1,
      sellingPrice: product.price
    };

    setQuotedProducts([...quotedProducts, quotedProduct]);
    setSelectedProductId('');
  };

  const updateQuotedProduct = (quoteId: string, field: keyof QuotedProduct, value: any) => {
    setQuotedProducts(products =>
      products.map(p =>
        p.quoteId === quoteId ? { ...p, [field]: value } : p
      )
    );
  };

  const removeQuotedProduct = (quoteId: string) => {
    setQuotedProducts(products => products.filter(p => p.quoteId !== quoteId));
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
    setTermsAccepted(false);
    setEditingQuotationId(null);
    setEditingInvoiceId(null);
  }, []);

  // --- Quotation Management Functions ---
  const saveQuotation = () => {
    if (!customerName || quotedProducts.length === 0) {
      toast({
        title: "Validation Error",
        description: "Customer name and at least one product are required to save a quotation.",
        variant: "destructive",
      });
      return;
    }

    const newQuotation: QuotationRecord = {
      id: editingQuotationId || `quote-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      customerName,
      customerEmail,
      customerPhone,
      quoteDate,
      validUntil,
      quotedProducts,
      designCost,
      sampleCost,
      handlingCost,
      grandTotal: calculateGrandTotal(),
      status: editingQuotationId ? (quotationsList.find(q => q.id === editingQuotationId)?.status || 'draft') : 'draft',
      createdAt: editingQuotationId ? quotationsList.find(q => q.id === editingQuotationId)?.createdAt || new Date().toISOString() : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if (editingQuotationId) {
      setQuotationsList(prev => prev.map(q => q.id === editingQuotationId ? newQuotation : q));
      toast({ title: "Quotation Updated", description: `Quotation for ${customerName} has been updated.` });
    } else {
      setQuotationsList(prev => [...prev, newQuotation]);
      toast({ title: "Quotation Saved", description: `Quotation for ${customerName} has been saved.` });
    }

    resetForm();
    setCurrentView('list-quotes');
  };

  const loadQuotationForEdit = (id: string) => {
    const quoteToEdit = quotationsList.find(q => q.id === id);
    if (quoteToEdit) {
      setCustomerName(quoteToEdit.customerName);
      setCustomerEmail(quoteToEdit.customerEmail);
      setCustomerPhone(quoteToEdit.customerPhone);
      setQuoteDate(quoteToEdit.quoteDate);
      setValidUntil(quoteToEdit.validUntil);
      setQuotedProducts(quoteToEdit.quotedProducts);
      setDesignCost(quoteToEdit.designCost);
      setSampleCost(quoteToEdit.sampleCost);
      setHandlingCost(quoteToEdit.handlingCost);
      setEditingQuotationId(id);
      setCurrentView('edit-quote');
    } else {
      toast({ title: "Error", description: "Quotation not found.", variant: "destructive" });
    }
  };

  const updateQuotationStatus = (id: string, newStatus: QuotationRecord['status']) => {
    setQuotationsList(prev =>
      prev.map(quote =>
        quote.id === id ? { ...quote, status: newStatus, updatedAt: new Date().toISOString() } : quote
      )
    );
    toast({ title: "Quotation Status Updated", description: `Status for quotation ${id} changed to ${newStatus}.` });
  };

  const deleteQuotation = (id: string) => {
    toast({
      title: "Confirm Deletion",
      description: "Are you sure you want to delete this quotation? This will also delete any related invoices.",
      variant: "destructive",
      action: (
        <Button
          variant="secondary"
          onClick={() => {
            setIsDeletingQuotation(true);
            setQuotationsList(prev => prev.filter(q => q.id !== id));
            setInvoicesList(prev => prev.filter(inv => inv.relatedQuotationId !== id));
            toast({ title: "Quotation Deleted", description: "The quotation and its related invoices have been removed." });
            setIsDeletingQuotation(false);
          }}
          disabled={isDeletingQuotation}
        >
          {isDeletingQuotation ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
          Delete
        </Button>
      ),
    });
  };

  const convertToInvoice = (quoteId: string) => {
    const quote = quotationsList.find(q => q.id === quoteId);
    if (quote) {
      const newInvoice: InvoiceRecord = {
        ...quote,
        id: `invoice-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        invoiceNumber: `INV-${Math.floor(10000 + Math.random() * 90000)}`,
        issueDate: new Date().toISOString().split('T')[0],
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        paymentStatus: 'pending',
        relatedQuotationId: quoteId,
        status: 'draft'
      };

      setInvoicesList(prev => [...prev, newInvoice]);
      setQuotationsList(prev => prev.map(q => q.id === quoteId ? { ...q, status: 'converted_to_invoice' } : q));
      toast({ title: "Quotation Converted", description: `Quotation for ${quote.customerName} converted to Invoice ${newInvoice.invoiceNumber}.` });
      setCurrentView('list-invoices');
    }
  };

  // --- Invoice Management Functions ---
  const saveInvoice = () => {
    if (!customerName || quotedProducts.length === 0) {
      toast({
        title: "Validation Error",
        description: "Customer name and at least one product are required to save an invoice.",
        variant: "destructive",
      });
      return;
    }

    const currentInvoiceData: InvoiceRecord = {
      id: editingInvoiceId || `invoice-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      invoiceNumber: editingInvoiceId ? invoicesList.find(inv => inv.id === editingInvoiceId)?.invoiceNumber || `INV-${Math.floor(10000 + Math.random() * 90000)}` : `INV-${Math.floor(10000 + Math.random() * 90000)}`,
      customerName,
      customerEmail,
      customerPhone,
      quoteDate: '',
      validUntil: '',
      issueDate: new Date().toISOString().split('T')[0],
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      quotedProducts,
      designCost,
      sampleCost,
      handlingCost,
      grandTotal: calculateGrandTotal(),
      status: editingInvoiceId ? (invoicesList.find(inv => inv.id === editingInvoiceId)?.status || 'draft') : 'draft',
      paymentStatus: editingInvoiceId ? (invoicesList.find(inv => inv.id === editingInvoiceId)?.paymentStatus || 'pending') : 'pending',
      relatedQuotationId: null,
      createdAt: editingInvoiceId ? invoicesList.find(inv => inv.id === editingInvoiceId)?.createdAt || new Date().toISOString() : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if (editingInvoiceId) {
      setInvoicesList(prev => prev.map(inv => inv.id === editingInvoiceId ? currentInvoiceData : inv));
      toast({ title: "Invoice Updated", description: `Invoice ${currentInvoiceData.invoiceNumber} has been updated.` });
    } else {
      setInvoicesList(prev => [...prev, currentInvoiceData]);
      toast({ title: "Invoice Saved", description: `Invoice ${currentInvoiceData.invoiceNumber} has been saved.` });
    }

    resetForm();
    setCurrentView('list-invoices');
  };

  const loadInvoiceForEdit = (id: string) => {
    const invoiceToEdit = invoicesList.find(inv => inv.id === id);
    if (invoiceToEdit) {
      setCustomerName(invoiceToEdit.customerName);
      setCustomerEmail(invoiceToEdit.customerEmail);
      setCustomerPhone(invoiceToEdit.customerPhone);
      setQuoteDate(invoiceToEdit.quoteDate);
      setValidUntil(invoiceToEdit.validUntil);
      setQuotedProducts(invoiceToEdit.quotedProducts);
      setDesignCost(invoiceToEdit.designCost);
      setSampleCost(invoiceToEdit.sampleCost);
      setHandlingCost(invoiceToEdit.handlingCost);
      setEditingInvoiceId(id);
      setCurrentView('edit-invoice');
    } else {
      toast({ title: "Error", description: "Invoice not found.", variant: "destructive" });
    }
  };

  const updateInvoicePaymentStatus = (id: string, newStatus: InvoiceRecord['paymentStatus']) => {
    setInvoicesList(prev =>
      prev.map(invoice =>
        invoice.id === id ? { ...invoice, paymentStatus: newStatus, updatedAt: new Date().toISOString() } : invoice
      )
    );
    toast({ title: "Invoice Status Updated", description: `Payment status for invoice ${id} changed to ${newStatus}.` });
  };

  const deleteInvoice = (id: string) => {
    toast({
      title: "Confirm Deletion",
      description: "Are you sure you want to delete this invoice?",
      variant: "destructive",
      action: (
        <Button
          variant="secondary"
          onClick={() => {
            setIsDeletingInvoice(true);
            setInvoicesList(prev => prev.filter(inv => inv.id !== id));
            toast({ title: "Invoice Deleted", description: "The invoice has been removed." });
            setIsDeletingInvoice(false);
          }}
          disabled={isDeletingInvoice}
        >
          {isDeletingInvoice ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
          Delete
        </Button>
      ),
    });
  };

  // --- Document Generation & Download/Send ---
  const generateHtmlContent = (data: QuotationRecord | InvoiceRecord, type: 'quotation' | 'invoice') => {
    const isInvoice = type === 'invoice';
    const title = isInvoice ? 'INVOICE' : 'QUOTE';
    const docNumberLabel = isInvoice ? 'Invoice Number:' : 'Estimate Number:';
    const docNumber = isInvoice ? data.invoiceNumber : data.id;
    const issueDateLabel = isInvoice ? 'Invoice Date:' : 'Estimate Date:';
    const issueDate = isInvoice ? data.issueDate : data.quoteDate;
    const dueDateLabel = isInvoice ? 'Payment Due:' : 'Valid Until:';
    const dueDate = isInvoice ? data.dueDate : data.validUntil;
    const subtotalLabel = isInvoice ? 'Subtotal:' : 'Subtotal:';
    const vatLabel = isInvoice ? 'VAT 15%:' : 'VAT 15%:';
    const totalLabel = isInvoice ? 'Total:' : 'Grand Total(ZAR):';
    const amountDueLabel = isInvoice ? 'Amount Due(ZAR):' : '';
    const amountDueValue = isInvoice ? `R${data.grandTotal.toFixed(2)}` : '';

    // Calculate VAT and Subtotal based on grand total
    const { vatAmount, subtotalAmount } = calculateVatAndSubtotal();

    // --- Use Company Details from State ---
    const companyAddress = `${companyDetails.addressLine1}${companyDetails.addressLine2 ? `<br>${companyDetails.addressLine2}` : ''}<br>${companyDetails.city}, ${companyDetails.province} ${companyDetails.postalCode}<br>${companyDetails.country}`;
    const companyContact = `Mobile: ${companyDetails.phone}<br>${companyDetails.website}`;
    const companyRegistration = `Registration No: ${companyDetails.registrationNumber} VAT No: ${companyDetails.vatNumber}`;

    // --- Use Banking Details from State ---
    const bankingDetailsText = `Banking Details: ${bankingDetails.bankName} Account No: ${bankingDetails.bankAccountNumber} Branch Code: ${bankingDetails.bankBranchCode}<br>PLEASE USE YOUR COMPANY NAME AS A REFERENCE (AS IT APPEARS ON THIS DOCUMENT). ANY OTHER REFERENCE WILL CAUSE A DELAY IN PROCESSING YOUR PAYMENT WHICH WILL DELAY COMPLETION OF YOUR ORDER.`;

    // --- Terms & Conditions (Standard text from PDFs) ---
    const termsAndConditions = `
      <p><strong>Terms & Conditions:</strong> Please note that a 80% deposit is payable on order approval. Balance due on collection. We require full payment for any invoice of R2,000.00 and below. All goods remain the property of ${companyDetails.name} until paid in full.</p>
      <p><strong>ARTWORK:</strong> Please note it is company policy that all artwork is signed off by the customer before production can commence. Confirmations must be in writing regardless of the simplicity of the sign. Once signed off artwork is received by ${companyDetails.name}, any errors or omissions are the responsibility of the customer and any corrections will be charged to the customer at the appropriate rate. Any delays in supplying suitable artwork will delay the proofing and production process.</p>
      <p><strong>ARTWORK NOT SUPPLIED AND DESIGN IS REQUIRED.</strong> Where graphic design services to prepare artwork for your signage are required, all elements to be included in the artwork must be supplied in the correct formats. Once all the relevant information has been received, a proof for your approval will be provided within 3 working days.</p>
      <p><strong>FULL COLOUR IMAGES.</strong> Minimum resolution required - 300dpi. Pictures sourced from the internet cannot be used. Quality of an image cannot be improved.</p>
      <p><strong>TEXT CONTENT</strong> Can be supplied by e-mail or if a menu or heavy content sign is needed, please supply in a Word document. If a particular font is required, please supply the name of the font. If the required font is not available on our system, it can be sourced from internet based font business.</p>
      <p><strong>ARTWORK - SUPPLIED READY BY US.</strong> If applicable, please arrange for your artwork to be e-mailed or supplied in a suitable format. Preferred formats - outlined EPS, PDF and Vector. If files are very large, we can download from FTP sites or similar. Before supplying artwork, please check with our designers to confirm all dimensions are correct; as a certain setup may require e.g bleed. To prevent delays in providing proofs, please ensure the following are provided: LOGO - Required in an outlined EPS format or PDF containing outlined graphics. JPEGS or similar flat images are rarely useable or suitable for full colour printing unless supplied in a resolution for the sign size in question. An EPS format can be sourced from the original designer or from your printer. Supply us with the relevant contact details to source it on your behalf.</p>
      <p><strong>PAYMENT TERMS</strong> Due to the custom nature of the signage, production cannot commence until receipt of 80% deposit(non-refundable). Balance required upon collection or completion of installation. Please email proof of payment to the sales consultant assisting you. Once payment is reflected on our account, a payment receipt will be emailed to you. If required, the original invoice can also be emailed to you. As per company policy, all orders under R2,000.00 excl VAT to be paid in full, prior to commencement of production, due to the custom nature of your signage. Please use your company name or quote/ order numbers reference.(As it appears on this document).</p>
      <p><strong>IMPORTANT NOTICE:</strong> All signage remains the property of ${companyDetails.name} until paid if full. Late payments are subject to a 24% interest charge per annum.</p>
      <p><strong>COMPLETION</strong> *Normal completion time is 7- 10 working days(weekends excluded) from the date artwork and deposit is approved/received. *Due to the volume, size and complexity of a specific order, the completion times may change accordingly and you will be notified by your sales consultant of the new expected delivery, installation or collection dates. This order is subject to availability of stock and materials from supplier. If out of stock, completion dates will be communicated to the client. Or alternative materials may be supplemented to assist in the timeous completion. Due to the nature of signage and weather conditions, lifespans cannot be guaranteed; however advice and indications of longevity will be discussed and indicated to the client. Any complaints about signage and/ or installation MUST be put in writing to; info@tshepisobranding.co.za- within 5 working days from the date of completion. Failing to do so, will constitute complete satisfaction.</p>
      <p><strong>FORCE MAJEURE:</strong> * ${companyDetails.name} shall not be held responsible in delivery or non-delivery of the products or services due to Force Majeure. *${companyDetails.name} is not responsible for the late or non-delivery in the event of Force Majeure of any contingencies beyond ${companyDetails.name}'s control. *Either party shall not be held responsible for failure or delay to perform all or any part of this agreement due to natural disasters, war or any other events of Force Majeure.</p>
      <p>${isInvoice ? '' : 'This estimate is valid for a period of 15 working days, weekends included.'}</p>
      <p>${companyDetails.name} "FOR PROGRESSIVE BRANDS."</p>
    `;

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>${title} - ${data.customerName}</title>
        <style>
          @page {
            margin: 0;
            size: A4;
          }
          body { font-family: Arial, sans-serif; margin: 0; padding: 0; color: #000; font-size: 12px; }
          .page { padding: 20px; position: relative; min-height: 100vh; box-sizing: border-box; }
          .page-number { position: absolute; bottom: 10px; right: 10px; font-size: 10px; }
          .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; }
          .company-info { text-align: left; }
          .company-name { color: #E68A2E; font-size: 16px; font-weight: bold; margin-bottom: 5px; }
          .company-address, .company-contact, .company-registration { font-size: 10px; line-height: 1.2; }
          .document-info-box { border: 1px solid #000; padding: 10px; width: 40%; }
          .document-title { text-align: center; font-size: 16px; font-weight: bold; margin-bottom: 10px; color: #000000; }
          .info-table { width: 100%; border-collapse: collapse; font-size: 10px; }
          .info-table td { padding: 2px 5px; }
          .bill-to { margin-bottom: 20px; font-size: 10px; }
          .bill-to-title { font-weight: bold; margin-bottom: 5px; }
          .bill-to-details { line-height: 1.2; }
          .product-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 10px; }
          .product-table th, .product-table td { border: 1px solid #000; padding: 5px; text-align: left; }
          .product-table th { background-color: #E68A2E; color: white; font-weight: bold; text-align: center; }
          .product-table .product-name { width: 40%; }
          .product-table .product-description { font-size: 9px; color: #555; }
          .totals-table { width: 50%; border-collapse: collapse; margin-left: auto; font-size: 10px; }
          .totals-table td { padding: 3px 5px; }
          .border-top { border-top: 1px solid #000; }
          .text-right { text-align: right; }
          .text-center { text-align: center; }
          .font-bold { font-weight: bold; }
          .notes-terms { margin-top: 20px; font-size: 9px; line-height: 1.3; }
          .footer { margin-top: 40px; font-size: 9px; text-align: center; }
          .footer p { margin: 2px 0; }
          .page-break { page-break-before: always; }
          .logo { 
  max-height: 100px;   /* increase height */
  max-width: 250px;    /* increase width */
  margin-bottom: 15px; 
} /* Adjust size as needed */
        </style>
      </head>
      <body>
        <div class="page">
          <div class="header">
            <div class="company-info">
              <img src="${logoUrl}" alt="${companyDetails.name} Logo" class="logo" crossorigin="anonymous" onerror="this.style.display='none';">

              <div class="company-name">${companyDetails.name}</div>
              <div class="company-address">${companyAddress}</div>
              <div class="company-contact">${companyContact}</div>
              ${isInvoice ? `<div class="company-registration">${companyRegistration}</div>` : ''}
            </div>
            <div class="document-info-box">
              <div class="document-title">${title}</div>
              <table class="info-table">
                <tr><td><strong>BILL TO</strong></td><td></td></tr>
                <tr><td colspan="2">${data.customerName}</td></tr>
                <tr><td colspan="2">${data.customerEmail || ''}</td></tr>
                <tr><td colspan="2">${data.customerPhone || ''}</td></tr>
                <tr><td>${docNumberLabel}</td><td>${docNumber}</td></tr>
                <tr><td>${issueDateLabel}</td><td>${issueDate}</td></tr>
                <tr><td>${dueDateLabel}</td><td>${dueDate}</td></tr>
                ${isInvoice && amountDueValue ? `<tr><td><strong>${amountDueLabel}</strong></td><td><strong>${amountDueValue}</strong></td></tr>` : ''}
              </table>
            </div>
          </div>

          <table class="product-table">
            <thead>
              <tr>
                <th class="product-name">Products</th>
                <th>Quantity</th>
                <th>Price</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>
              ${data.quotedProducts.map(product => `
                <tr>
                  <td>
                    ${product.name}
                    ${product.notes ? `<br><span class="product-description">${product.notes}</span>` : ''}
                  </td>
                  <td class="text-center">${product.quantity}</td>
                  <td class="text-right">R${product.sellingPrice.toFixed(2)}</td>
                  <td class="text-right">R${(product.sellingPrice * product.quantity).toFixed(2)}</td>
                </tr>
              `).join('')}

              <!-- Totals Section -->
              <tr>
                <td colspan="3" class="text-right"><strong>${subtotalLabel}</strong></td>
                <td class="text-right">R${subtotalAmount.toFixed(2)}</td>
              </tr>
              <tr>
                <td colspan="3" class="text-right"><strong>${vatLabel}</strong></td>
                <td class="text-right">R${vatAmount.toFixed(2)}</td>
              </tr>
              <tr>
                 <td colspan="3" class="text-right font-bold">${totalLabel}</td>
                 <td class="text-right font-bold">R${data.grandTotal.toFixed(2)}</td>
              </tr>
              <!-- Add rows for additional costs if they exist -->
              ${data.designCost > 0 ? `<tr><td colspan="3" class="text-right">Design Cost:</td><td class="text-right">R${data.designCost.toFixed(2)}</td></tr>` : ''}
              ${data.sampleCost > 0 ? `<tr><td colspan="3" class="text-right">Sample Cost:</td><td class="text-right">R${data.sampleCost.toFixed(2)}</td></tr>` : ''}
              ${data.handlingCost > 0 ? `<tr><td colspan="3" class="text-right">Handling Cost:</td><td class="text-right">R${data.handlingCost.toFixed(2)}</td></tr>` : ''}
            </tbody>
          </table>

          <div class="notes-terms">
            <p><strong>Notes/ Terms</strong></p>
            <p>${bankingDetailsText}</p>
            ${termsAndConditions}
          </div>

          <div class="footer">
             <p>Thank you for your business!!!</p>
             <div class="page-number">Page 1</div>
          </div>
        </div>
      </body>
      </html>
    `;
  };

  // --- PDF Generation ---
  const downloadPdf = (data: QuotationRecord | InvoiceRecord, type: 'quotation' | 'invoice') => {
    const element = document.createElement('div');
    element.innerHTML = generateHtmlContent(data, type);
    // Ensure the logo path is relative for PDF generation


    const opt = {
      margin:       10,
      filename:     `${type}-${data.customerName.replace(/\s+/g, '-')}-${type === 'quotation' ? data.quoteDate : data.issueDate}.pdf`,
      image:        { type: 'jpeg', quality: 0.98 },
      html2canvas:  { scale: 2, useCORS: true },
      jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    html2pdf().set(opt).from(element).save().then(() => {
        toast({ title: `${type === 'quotation' ? 'Quotation' : 'Invoice'} Downloaded`, description: `${type === 'quotation' ? 'Quotation' : 'Invoice'} for ${data.customerName} downloaded as PDF.` });
    }).catch(err => {
        console.error('PDF generation error:', err);
        toast({
            title: `Failed to Download ${type === 'quotation' ? 'Quotation' : 'Invoice'}`,
            description: "An error occurred while generating the PDF.",
            variant: "destructive",
        });
    });
  };

  const sendDocument = async (data: QuotationRecord | InvoiceRecord, type: 'quotation' | 'invoice') => {
    setIsSendingDocument(true);
    // For sending, we might want to generate a PDF blob and send it via email API
    // This example still sends HTML, but you could modify it to send the PDF blob
    const htmlContent = generateHtmlContent(data, type);
    const subject = `${type === 'quotation' ? 'Quotation' : 'Invoice'} from Tshepiso Branding Solutions`;

    try {
      const response = await fetch('/api/send-document-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          recipientEmail: data.customerEmail,
          subject: subject,
          htmlBody: htmlContent,
          documentType: type,
          customerName: data.customerName,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Failed to send ${type}.`);
      }

      const result = await response.json();
      toast({
        title: `${type === 'quotation' ? 'Quotation' : 'Invoice'} Sent`,
        description: result.message,
      });

      if (type === 'quotation') {
        setQuotationsList(prev => prev.map(q => q.id === data.id ? { ...q, status: 'sent', updatedAt: new Date().toISOString() } : q));
      } else {
        setInvoicesList(prev => prev.map(inv => inv.id === data.id ? { ...inv, status: 'sent', updatedAt: new Date().toISOString() } : inv));
      }
    } catch (error) {
      console.error(`Error sending ${type}:`, error);
      toast({
        title: `Failed to Send ${type === 'quotation' ? 'Quotation' : 'Invoice'}`,
        description: error instanceof Error ? error.message : "An unknown error occurred while sending the document. Please check console.",
        variant: "destructive",
      });
    } finally {
      setIsSendingDocument(false);
    }
  };

  // Helper to get current form data as a QuotationRecord
  const getCurrentFormDataAsQuotation = (): QuotationRecord => ({
    id: editingQuotationId || `temp-quote-${Date.now()}`,
    customerName,
    customerEmail,
    customerPhone,
    quoteDate,
    validUntil,
    quotedProducts,
    designCost,
    sampleCost,
    handlingCost,
    grandTotal: calculateGrandTotal(),
    status: 'draft',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  const getCurrentFormDataAsInvoice = (): InvoiceRecord => {
    const existingInvoice = editingInvoiceId ? invoicesList.find(inv => inv.id === editingInvoiceId) : null;
    return {
      id: editingInvoiceId || `temp-invoice-${Date.now()}`,
      invoiceNumber: existingInvoice?.invoiceNumber || `INV-${Math.floor(10000 + Math.random() * 90000)}`,
      customerName,
      customerEmail,
      customerPhone,
      issueDate: existingInvoice?.issueDate || new Date().toISOString().split('T')[0],
      dueDate: existingInvoice?.dueDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      quoteDate: existingInvoice?.quoteDate || '',
      validUntil: existingInvoice?.validUntil || '',
      quotedProducts,
      designCost,
      sampleCost,
      handlingCost,
      grandTotal: calculateGrandTotal(),
      status: existingInvoice?.status || 'draft',
      paymentStatus: existingInvoice?.paymentStatus || 'pending',
      relatedQuotationId: existingInvoice?.relatedQuotationId || null,
      createdAt: existingInvoice?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  };

  // --- Banking Details Form ---
  const renderBankingDetailsForm = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          Company Banking Details
        </CardTitle>
        <p className="text-sm text-gray-500">Edit your company's banking information. Changes are saved automatically.</p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="bankName">Bank Name</Label>
            <Input
              id="bankName"
              value={bankingDetails.bankName}
              onChange={(e) => setBankingDetails(prev => ({ ...prev, bankName: e.target.value }))}
              placeholder="e.g., ABSA"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="bankAccountNumber">Account Number</Label>
            <Input
              id="bankAccountNumber"
              value={bankingDetails.bankAccountNumber}
              onChange={(e) => setBankingDetails(prev => ({ ...prev, bankAccountNumber: e.target.value }))}
              placeholder="e.g., 409 7457 454"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="bankBranchCode">Branch Code</Label>
            <Input
              id="bankBranchCode"
              value={bankingDetails.bankBranchCode}
              onChange={(e) => setBankingDetails(prev => ({ ...prev, bankBranchCode: e.target.value }))}
              placeholder="e.g., 632005"
            />
          </div>
        </div>
        <div className="pt-4">
          <Button onClick={() => setCurrentView('list-quotes')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Quotations
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  // --- Render Logic based on currentView ---
  const renderQuotationForm = () => (
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
              <Input
                id="customerName"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Enter customer name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="customerEmail">Email</Label>
              <Input
                id="customerEmail"
                type="email"
                value={customerEmail}
                onChange={(e) => setCustomerEmail(e.target.value)}
                placeholder="customer@example.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="customerPhone">Phone</Label>
              <Input
                id="customerPhone"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                placeholder="+27 123 456 789"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="validUntil">Valid Until</Label>
              <Input
                id="validUntil"
                type="date"
                value={validUntil}
                onChange={(e) => setValidUntil(e.target.value)}
              />
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
                        {product.name} - Suggested Price: R{product.price.toFixed(2)}
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
                        onChange={(e) => updateQuotedProduct(product.quoteId, 'quantity', parseInt(e.target.value) || 1)}
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
              <Input
                id="designCost"
                type="number"
                step="0.01"
                value={designCost}
                onChange={(e) => setDesignCost(parseFloat(e.target.value) || 0)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sampleCost">Sample Cost</Label>
              <Input
                id="sampleCost"
                type="number"
                step="0.01"
                value={sampleCost}
                onChange={(e) => setSampleCost(parseFloat(e.target.value) || 0)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="handlingCost">Handling Cost</Label>
              <Input
                id="handlingCost"
                type="number"
                step="0.01"
                value={handlingCost}
                onChange={(e) => setHandlingCost(parseFloat(e.target.value) || 0)}
              />
            </div>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Quote Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span>Subtotal:</span>
              <span>R{calculateSubtotal().toFixed(2)}</span>
            </div>
            {(designCost > 0 || sampleCost > 0 || handlingCost > 0) && (
              <div className="flex justify-between">
                <span>Additional Costs:</span>
                <span>R{(designCost + sampleCost + handlingCost).toFixed(2)}</span>
              </div>
            )}
            <Separator />
            <div className="flex justify-between text-lg font-bold text-amber-600">
              <span>Grand Total:</span>
              <span>R{calculateGrandTotal().toFixed(2)}</span>
            </div>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4 flex-wrap">
            <Button
              onClick={saveQuotation}
              disabled={!customerName || quotedProducts.length === 0}
              className="flex-1 md:flex-initial"
            >
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
            <Button variant="outline" onClick={resetForm} className="flex-1 md:flex-initial">
              Reset Form
            </Button>
            <Button variant="outline" onClick={() => setCurrentView('edit-banking')} className="flex-1 md:flex-initial">
              <Settings className="h-4 w-4 mr-2" />
              Edit Banking
            </Button>
          </div>
        </CardContent>
      </Card>
    </>
  );

  const renderInvoiceForm = () => (
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
              <Input
                id="customerName"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Enter customer name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="customerEmail">Email</Label>
              <Input
                id="customerEmail"
                type="email"
                value={customerEmail}
                onChange={(e) => setCustomerEmail(e.target.value)}
                placeholder="customer@example.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="customerPhone">Phone</Label>
              <Input
                id="customerPhone"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                placeholder="+27 123 456 789"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="issueDate">Issue Date</Label>
              <Input
                id="issueDate"
                type="date"
                value={new Date().toISOString().split('T')[0]}
                onChange={(e) => {}}
                readOnly
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dueDate">Due Date</Label>
              <Input
                id="dueDate"
                type="date"
                value={new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}
                onChange={(e) => {}}
                readOnly
              />
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
                        {product.name} - Suggested Price: R{product.price.toFixed(2)}
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
                        onChange={(e) => updateQuotedProduct(product.quoteId, 'quantity', parseInt(e.target.value) || 1)}
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
              <Input
                id="designCost"
                type="number"
                step="0.01"
                value={designCost}
                onChange={(e) => setDesignCost(parseFloat(e.target.value) || 0)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sampleCost">Sample Cost</Label>
              <Input
                id="sampleCost"
                type="number"
                step="0.01"
                value={sampleCost}
                onChange={(e) => setSampleCost(parseFloat(e.target.value) || 0)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="handlingCost">Handling Cost</Label>
              <Input
                id="handlingCost"
                type="number"
                step="0.01"
                value={handlingCost}
                onChange={(e) => setHandlingCost(parseFloat(e.target.value) || 0)}
              />
            </div>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Invoice Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span>Subtotal:</span>
              <span>R{calculateSubtotal().toFixed(2)}</span>
            </div>
            {(designCost > 0 || sampleCost > 0 || handlingCost > 0) && (
              <div className="flex justify-between">
                <span>Additional Costs:</span>
                <span>R{(designCost + sampleCost + handlingCost).toFixed(2)}</span>
              </div>
            )}
            <Separator />
            <div className="flex justify-between text-lg font-bold text-amber-600">
              <span>Grand Total:</span>
              <span>R{calculateGrandTotal().toFixed(2)}</span>
            </div>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4 flex-wrap">
            <Button
              onClick={saveInvoice}
              disabled={!customerName || quotedProducts.length === 0}
              className="flex-1 md:flex-initial"
            >
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
            <Button variant="outline" onClick={resetForm} className="flex-1 md:flex-initial">
              Reset Form
            </Button>
            <Button variant="outline" onClick={() => setCurrentView('edit-banking')} className="flex-1 md:flex-initial">
              <Settings className="h-4 w-4 mr-2" />
              Edit Banking
            </Button>
          </div>
        </CardContent>
      </Card>
    </>
  );

  const renderQuotationList = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <List className="h-5 w-5" />
          Saved Quotations ({quotationsList.length})
        </CardTitle>
        <p className="text-sm text-gray-500">Manage your saved quotations. You can edit, delete, download, convert to invoice, or send them.</p>
      </CardHeader>
      <CardContent>
        {quotationsList.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <FileText className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <p>No quotations saved yet. Start by creating a new one!</p>
            <Button onClick={() => { resetForm(); setCurrentView('create-quote'); }} className="mt-4">Create New Quotation</Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {quotationsList.map((quote) => (
                  <tr key={quote.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{quote.customerName}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{quote.quoteDate}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">R{quote.grandTotal.toFixed(2)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <Select
                        value={quote.status}
                        onValueChange={(newStatus: QuotationRecord['status']) => updateQuotationStatus(quote.id, newStatus)}
                        disabled={isSendingDocument || isDeletingQuotation || quote.status === 'converted_to_invoice' || quote.status === 'expired'}
                      >
                        <SelectTrigger className={`w-[140px] capitalize ${
                          quote.status === 'sent' ? 'bg-blue-100 text-blue-800' :
                          quote.status === 'accepted' ? 'bg-green-100 text-green-800' :
                          quote.status === 'converted_to_invoice' ? 'bg-purple-100 text-purple-800' :
                          quote.status === 'expired' ? 'bg-red-100 text-red-800' :
                          'bg-gray-100 text-gray-800'
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
                      <div className="flex justify-end space-x-2">
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
        <p className="text-sm text-gray-500">Manage your created invoices. You can edit, delete, download, or send them.</p>
      </CardHeader>
      <CardContent>
        {invoicesList.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <FileText className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <p>No invoices created yet. Convert a quotation or create a new invoice.</p>
            <Button onClick={() => { resetForm(); setCurrentView('create-quote'); }} className="mt-4">Create New Quotation</Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Invoice No.</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Issue Date</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {invoicesList.map((invoice) => (
                  <tr key={invoice.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{invoice.invoiceNumber}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{invoice.customerName}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{invoice.issueDate}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">R{invoice.grandTotal.toFixed(2)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <Select
                        value={invoice.paymentStatus}
                        onValueChange={(newStatus: InvoiceRecord['paymentStatus']) => updateInvoicePaymentStatus(invoice.id, newStatus)}
                        disabled={isSendingDocument || isDeletingInvoice}
                      >
                        <SelectTrigger className={`w-[140px] capitalize ${
                          invoice.paymentStatus === 'paid' ? 'bg-green-100 text-green-800' :
                          invoice.paymentStatus === 'overdue' ? 'bg-red-100 text-red-800' :
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
                      <div className="flex justify-end space-x-2">
                        <Button variant="outline" size="sm" onClick={() => loadInvoiceForEdit(invoice.id)} title="Edit">
                          <SquarePen className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => downloadPdf(invoice, 'invoice')} title="Download PDF">
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => sendDocument(invoice, 'invoice')} title="Send" disabled={isSendingDocument}>
                          {isSendingDocument ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
                        </Button>
                        <Button variant="destructive" size="sm" onClick={() => deleteInvoice(invoice.id)} title="Delete" disabled={isDeletingInvoice}>
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
          <h1 className="text-3xl font-bold text-amber-600">Quotation & Invoice Manager</h1>
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
              <Settings className="h-4 w-4 mr-2" /> Banking
            </Button>
          </div>
        </div>
        {selectedSnapshotId && (
          <Card className="mb-6 border-amber-300 bg-amber-50 shadow-md">
            <CardContent className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Tag className="h-5 w-5 text-amber-600" />
                <span className="text-lg font-semibold text-amber-800">
                  Current Snapshot for Quotations:
                </span>
                <Badge variant="secondary" className="bg-amber-200 text-amber-900">
                  ID: {selectedSnapshotId}
                </Badge>
              </div>
              <Button variant="ghost" size="sm" onClick={() => {
                localStorage.removeItem('selectedQuotationSnapshotId');
                localStorage.removeItem('selectedQuotationProducts');
                setSelectedSnapshotId(null);
                setAvailableProducts([]);
                setQuotedProducts([]);
                toast({
                  title: "Snapshot cleared",
                  description: "You can now select a new snapshot from the Pricing Calculator.",
                });
              }}>
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
          {currentView === 'edit-banking' && renderBankingDetailsForm()}
        </div>
      </div>
    </div>
  );
}
