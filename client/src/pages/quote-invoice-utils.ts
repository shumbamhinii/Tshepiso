// src/pages/quote-invoice-utils.ts
// Shared types + helpers for Quotations.tsx

import html2pdf from 'html2pdf.js';

export type Product = {
  id: number;
  name: string;
  expectedUnits: number;
  costPerUnit: number;
  price: number;
  notes?: string;
};

export type QuotedProduct = Product & {
  quoteId: string;
  originalId: number;
  quantity: number;
  sellingPrice: number;
};

export type QuoteStatus = 'draft' | 'sent' | 'accepted' | 'rejected' | 'converted_to_invoice' | 'expired';
export type PaymentStatus = 'pending' | 'paid' | 'overdue' | 'cancelled';

export type CompanyDetails = {
  name: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  province?: string;
  postalCode?: string;
  country?: string;
  phone?: string;
  website?: string;
  vatNumber?: string;
  registrationNumber?: string;
};

export type BankAccount = {
  id: string; // uuid on server or 'legacy'
  label?: string;
  bankName: string;
  bankAccountNumber: string;
  bankBranchCode?: string;
  isActive?: boolean;
};

export type DiscountType = 'percent' | 'fixed';
export type Promotion = {
  code?: string;
  discountType: DiscountType;
  discountValue: number; // percent value (0-100) or fixed R amount
};

export type QuotationRecord = {
  id: string;
  displayName?: string;
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
  quoteDate: string;
  validUntil: string;
  quotedProducts: QuotedProduct[];
  designCost: number;
  sampleCost: number;
  handlingCost: number;
  grandTotal: number;
  status: QuoteStatus;
  createdAt: string;
  updatedAt: string;
  promo?: Promotion;            // <-- persist discount on the quote
};

export type InvoiceRecord = {
  id: string;
  invoiceNumber: string; // can be "Invoice X" or INV-xxxxx
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
  issueDate: string;
  dueDate: string;
  quoteDate?: string;
  validUntil?: string;
  quotedProducts: QuotedProduct[];
  designCost: number;
  sampleCost: number;
  handlingCost: number;
  grandTotal: number;
  status: QuoteStatus;
  paymentStatus: PaymentStatus;
  relatedQuotationId: string | null;
  createdAt: string;
  updatedAt: string;
  promo?: Promotion;            // <-- persist discount on the invoice
};

// ---------- Calculations ----------

export function calculateLineTotal(p: QuotedProduct): number {
  const qty = Number(p.quantity ?? 0);
  const unit = Number(
    (p as any).sellingPrice ??
    (p as any).unitPrice ??
    (p as any).price ??
    p.costPerUnit ??
    0
  );
  return qty * unit;
}



type TotalsInput = {
  items: QuotedProduct[];
  designCost: number;
  sampleCost: number;
  handlingCost: number;
  vatRate: number; // e.g., 0.15
  promo?: Promotion;
};

export function calculateTotals(input: TotalsInput) {
  const linesSubtotal = (input.items || []).reduce((sum, p) => sum + calculateLineTotal(p), 0);
  const additionalCosts = (input.designCost || 0) + (input.sampleCost || 0) + (input.handlingCost || 0);
  const preDiscount = linesSubtotal + additionalCosts;

  let discount = 0;
  if (input.promo) {
    if (input.promo.discountType === 'percent') {
      discount = Math.max(0, Math.min(preDiscount * (input.promo.discountValue / 100), preDiscount));
    } else {
      discount = Math.max(0, Math.min(input.promo.discountValue, preDiscount));
    }
  }

  const baseAfterDiscount = preDiscount - discount;
  // VAT is applied on the discount-adjusted base
  const vatAmount = baseAfterDiscount * input.vatRate;
  const grandTotal = baseAfterDiscount + vatAmount;

  return {
    linesSubtotal,
    additionalCosts,
    discount,
    vatAmount,
    grandTotal,
    vatRate: input.vatRate,
  };
}

export function buildHumanDocName(prefix: 'Quotation' | 'Invoice', n: number) {
  return `${prefix} ${n}`;
}

// ---------- HTML Builder + PDF ----------

type BuildHtmlArgs = {
  data: QuotationRecord | InvoiceRecord;
  type: 'quotation' | 'invoice';
  company: CompanyDetails;
  bankAccounts: BankAccount[];
  /** Multiple selection supported (these IDs will be printed). */
  selectedBankAccountIds?: string[];
  /** Canonical HTML for terms (already converted from plain if needed). */
  termsHtml?: string;
  /**
   * URL or data: URI for the company logo.
   * For best PDF + email compatibility:
   *  - Prefer a public https URL with CORS enabled, OR
   *  - Use a data: URI (base64).
   */
  logoUrl?: string;
  promo?: Promotion;
};

export function buildDocumentHtml(args: BuildHtmlArgs) {
  const { data, type, company, bankAccounts, selectedBankAccountIds, termsHtml, logoUrl } = args;
  const isInvoice = type === 'invoice';
  const title = isInvoice ? 'INVOICE' : 'QUOTE';

  // Select banks: ids -> all active -> first (fallback)
  const chosenList: BankAccount[] =
    (selectedBankAccountIds && selectedBankAccountIds.length)
      ? bankAccounts.filter(b => selectedBankAccountIds.includes(b.id))
      : bankAccounts.filter(b => b.isActive);

  const finalChosen = chosenList.length
    ? chosenList
    : (bankAccounts.length ? [bankAccounts[0]] : []);

  // Prefer promo passed in; otherwise, use promo saved on the record
  const effectivePromo: Promotion | undefined = args.promo ?? (data as any).promo;

  // choose items from quotedProducts (quotes) or items (invoices)
  const list =
    Array.isArray((data as any).quotedProducts) && (data as any).quotedProducts.length
      ? (data as any).quotedProducts
      : (Array.isArray((data as any).items) ? (data as any).items : []);

  const totals = calculateTotals({
    items: list as any,
    designCost: (data as any).designCost || 0,
    sampleCost: (data as any).sampleCost || 0,
    handlingCost: (data as any).handlingCost || 0,
    vatRate: 0.15,
    promo: effectivePromo,
  });


  const docNumberLabel = isInvoice ? 'Invoice Number:' : 'Estimate Number:';
  const docNumber = isInvoice ? (data as InvoiceRecord).invoiceNumber : (data as QuotationRecord).displayName || (data as QuotationRecord).id;
  const issueDateLabel = isInvoice ? 'Invoice Date:' : 'Estimate Date:';
  const issueDate = isInvoice ? (data as InvoiceRecord).issueDate : (data as QuotationRecord).quoteDate;
  const dueDateLabel = isInvoice ? 'Payment Due:' : 'Valid Until:';
  const dueDate = isInvoice ? (data as InvoiceRecord).dueDate : (data as QuotationRecord).validUntil;

  const companyAddress = [
    company.addressLine1,
    company.addressLine2,
    [company.city, company.province, company.postalCode].filter(Boolean).join(', '),
    company.country
  ].filter(Boolean).join('<br>');

  const companyContact = [
    company.phone ? `Mobile: ${escapeHtml(company.phone)}` : '',
    company.website ? escapeHtml(company.website) : ''
  ].filter(Boolean).join('<br>');

  const companyRegistration = [
    company.registrationNumber ? `Registration No: ${escapeHtml(company.registrationNumber)}` : '',
    company.vatNumber ? `VAT No: ${escapeHtml(company.vatNumber)}` : ''
  ].filter(Boolean).join(' &nbsp;&nbsp; ');

  // HTML
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${title} - ${escapeHtml(data.customerName)}</title>
  <style>
    :root{
      --brand:#E68A2E;           /* amber */
      --brand-ink:#7A3F00;
      --ink:#111;
      --muted:#555;
      --border:#222;
      --slate:#f7f7f7;
      --soft:#fff9f2;
    }
    @page { margin: 0; size: A4; }
    * { box-sizing: border-box; }
    body { font-family: Arial, sans-serif; margin: 0; padding: 0; color: var(--ink); font-size: 12px; -webkit-print-color-adjust: exact; }
    .page { padding: 22px; position: relative; min-height: 100vh; }

    /* Header layout */
    .topbar {
      background: linear-gradient(90deg, var(--brand) 0%, #f3b467 100%);
      height: 6px; border-radius: 0 0 6px 6px; margin-bottom: 12px;
    }
    .header { display: grid; grid-template-columns: 1.3fr 1fr; gap: 14px; align-items: start; margin-bottom: 12px; }
    .brand {
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 12px;
      background: var(--soft);
    }
    .logo { max-height: 90px; max-width: 260px; margin-bottom: 8px; display:block; }
    .company-name { color: var(--brand); font-size: 16px; font-weight: bold; margin: 2px 0 6px; }
    .company-address,.company-contact,.company-registration { font-size: 10px; line-height: 1.35; color: var(--muted); }

    .docbox {
      border: 1px solid var(--border);
      border-radius: 8px;
      overflow: hidden;
      background: #fff;
    }
    .docbox-head {
      background: #fff3e0;
      color: var(--brand-ink);
      font-weight: 700;
      text-align: center;
      padding: 8px 10px;
      font-size: 15px;
      border-bottom: 1px dashed var(--brand);
    }
    .infotable { width: 100%; border-collapse: collapse; font-size: 10px; }
    .infotable td { padding: 4px 8px; vertical-align: top; }
    .infotable .label { color: var(--muted); width: 42%; }
    .billto { font-weight: 700; color: var(--ink); padding-top: 6px; }

    /* Items table */
    .product-table { width: 100%; border-collapse: collapse; margin-top: 8px; margin-bottom: 14px; font-size: 10px; }
    .product-table th { background: var(--brand); color: #fff; font-weight: bold; text-align: center; padding: 6px 5px; }
    .product-table td { border-bottom: 1px solid #ddd; padding: 6px 5px; }
    .product-table tbody tr:nth-child(odd) td { background: #faf7f2; }
    .product-name { width: 45%; }
    .product-description { font-size: 9px; color: #666; }

    /* Totals card */
    .totals-card {
      width: 52%;
      margin-left: auto;
      border: 1px solid var(--border);
      border-radius: 8px;
      overflow: hidden;
      background: #fff;
    }
    .totals-head {
      background: #fff3e0;
      padding: 6px 10px;
      border-bottom: 1px dashed var(--brand);
      font-weight: 700; color: var(--brand-ink);
      text-align: left;
    }
    .totals-row { display:flex; justify-content:space-between; padding: 6px 10px; }
    .totals-row + .totals-row { border-top: 1px dashed #e7e2db; }
    .totals-row .label { color:#333; }
    .totals-row.total { background: #fffaf2; font-weight: 800; color: var(--brand-ink); }

    /* Banking cards */
    .section {
      margin-top: 16px;
      border: 1px solid var(--border);
      border-radius: 8px;
      overflow: hidden;
    }
    .section-head {
      background: var(--brand);
      color: #fff;
      padding: 7px 10px;
      font-weight: 700;
      letter-spacing: .3px;
    }
    .banking-wrap { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 8px; padding: 10px; background: #fff; }
    .bank-card {
      border: 1px solid #222;
      border-radius: 8px;
      padding: 8px 10px;
      background: #fff;
      position: relative;
    }
    .bank-card::before {
      content:"";
      position:absolute; left:0; top:0; height:4px; width:100%;
      background: linear-gradient(90deg, var(--brand) 0%, #f3b467 100%);
      border-radius: 8px 8px 0 0;
    }
    .bank-title { font-weight: 700; margin: 6px 0 4px; color: #222; }
    .bank-row { font-size: 10.5px; color:#333; }
    .mono { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono","Courier New", monospace; }

    /* Terms */
    .terms-body { padding: 10px; background: #fff; line-height: 1.45; font-size: 10.5px; }
    .terms-body p { margin: 6px 0; }

    /* Footer */
    .footer { margin-top: 24px; font-size: 9.5px; text-align: center; color:#333; }
    .page-number { position: absolute; bottom: 10px; right: 12px; font-size: 10px; color:#444; }
  </style>
</head>
<body>
  <div class="topbar"></div>
  <div class="page">
    <div class="header">
      <div class="brand">
        ${logoUrl ? `<img src="${logoUrl}" alt="${escapeHtml(company.name)} Logo" class="logo" crossorigin="anonymous" referrerpolicy="no-referrer" onerror="this.style.display='none';">` : ''}
        <div class="company-name">${escapeHtml(company.name)}</div>
        ${companyAddress ? `<div class="company-address">${companyAddress}</div>` : ''}
        ${companyContact ? `<div class="company-contact" style="margin-top:4px">${companyContact}</div>` : ''}
        ${companyRegistration ? `<div class="company-registration" style="margin-top:4px">${companyRegistration}</div>` : ''}
      </div>

      <div class="docbox">
        <div class="docbox-head">${title}</div>
        <table class="infotable">
          <tr><td class="label billto">BILL TO</td><td></td></tr>
          <tr><td colspan="2" style="padding-top:2px;"><strong>${escapeHtml(data.customerName)}</strong></td></tr>
          ${data.customerEmail ? `<tr><td colspan="2">${escapeHtml(data.customerEmail)}</td></tr>` : ''}
          ${data.customerPhone ? `<tr><td colspan="2">${escapeHtml(data.customerPhone)}</td></tr>` : ''}
          <tr><td class="label">${docNumberLabel}</td><td><strong>${escapeHtml(docNumber)}</strong></td></tr>
          <tr><td class="label">${issueDateLabel}</td><td>${escapeHtml(issueDate)}</td></tr>
          <tr><td class="label">${dueDateLabel}</td><td>${escapeHtml(dueDate || '')}</td></tr>
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
        ${list.map((product: any) => {
          const qty = Number(product.quantity ?? 0);
          const unit = Number(
            product.sellingPrice ??
            product.unitPrice ??
            product.price ??
            product.costPerUnit ??
            0
          );
          const amount = unit * qty;
          return `
            <tr>
              <td>
                ${escapeHtml(product.name ?? '')}
                ${product.notes ? `<br><span class="product-description">${escapeHtml(product.notes)}</span>` : ''}
              </td>
              <td style="text-align:center">${isFinite(qty) ? qty : 0}</td>
              <td style="text-align:right">R${isFinite(unit) ? unit.toFixed(2) : '0.00'}</td>
              <td style="text-align:right">R${isFinite(amount) ? amount.toFixed(2) : '0.00'}</td>
            </tr>
          `;
        }).join('')}
      </tbody>


    </table>

    <div class="totals-card">
      <div class="totals-head">${isInvoice ? 'Invoice Totals' : 'Quote Totals'}</div>
      <div class="totals-row"><span class="label">Lines Subtotal</span><span>R${totals.linesSubtotal.toFixed(2)}</span></div>
      ${((data as any).designCost || 0) > 0 ? `<div class="totals-row"><span class="label">Design Cost</span><span>R${Number((data as any).designCost).toFixed(2)}</span></div>` : ''}
      ${((data as any).sampleCost || 0) > 0 ? `<div class="totals-row"><span class="label">Sample Cost</span><span>R${Number((data as any).sampleCost).toFixed(2)}</span></div>` : ''}
      ${((data as any).handlingCost || 0) > 0 ? `<div class="totals-row"><span class="label">Handling Cost</span><span>R${Number((data as any).handlingCost).toFixed(2)}</span></div>` : ''}
      ${totals.discount > 0 ? `<div class="totals-row"><span class="label">Promotion / Discount</span><span>-R${totals.discount.toFixed(2)}</span></div>` : ''}
      <div class="totals-row"><span class="label">VAT ${(totals.vatRate * 100).toFixed(0)}%</span><span>R${totals.vatAmount.toFixed(2)}</span></div>
      <div class="totals-row total"><span class="label">${isInvoice ? 'Total' : 'Grand Total (ZAR)'}</span><span>R${totals.grandTotal.toFixed(2)}</span></div>
    </div>

    <!-- Banking -->
    <div class="section" style="margin-top:16px;">
      <div class="section-head">Banking Details</div>
      <div class="banking-wrap">
        ${finalChosen.length ? finalChosen.map(b => `
          <div class="bank-card">
            <div class="bank-title">${escapeHtml(b.label || b.bankName)}</div>
            <div class="bank-row">Bank: <strong>${escapeHtml(b.bankName)}</strong></div>
            <div class="bank-row">Account: <span class="mono">${escapeHtml(b.bankAccountNumber)}</span></div>
            <div class="bank-row">Branch: <span class="mono">${escapeHtml(b.bankBranchCode || '-')}</span></div>
          </div>
        `).join('') : '<div style="padding:6px 10px;">Banking details on request.</div>'}
      </div>
    </div>

    <!-- Terms -->
    ${termsHtml ? `
      <div class="section" style="margin-top:12px;">
        <div class="section-head">Terms &amp; Conditions</div>
        <div class="terms-body">${termsHtml}</div>
      </div>
    ` : ''}

    <div class="footer">
      <p>Thank you for your business!</p>
      <div class="page-number">Page 1</div>
    </div>
  </div>
</body>
</html>
`;
}

export async function downloadPdfFromHtml(html: string, filename: string) {
  const element = document.createElement('div');
  element.innerHTML = html;

  const opt = {
    margin: 10,
    filename,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: {
      scale: 2,
      useCORS: true,     // IMPORTANT for logos loaded from https://
      allowTaint: true,
    },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' as const },
  };

  // @ts-ignore — html2pdf types are loose
  return html2pdf().set(opt).from(element).save();
}

// ---------- tiny helper ----------

function escapeHtml(s: any) {
  const str = String(s ?? '');
  return str
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}
