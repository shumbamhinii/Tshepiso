import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Mic,
  Paperclip,
  Send,
  Upload,
  StopCircle,
  Trash2,
  CheckCircle,
  XCircle,
  Edit3,
  FileText,
  Play,
  Loader2, // Import Loader2 icon for loading state
} from 'lucide-react';
import { motion } from 'framer-motion';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';

// Define interfaces
interface Transaction {
  id?: string;
  type: 'income' | 'expense' | 'debt';
  amount: number;
  description: string;
  date: string;
  category: string;
  account_id: string;
  account_name?: string;
  source: string;
  is_verified: boolean;
  file_url?: string;
  _tempId?: string;
  original_text?: string;
  confidenceScore?: number;
}

interface Account {
  id: string;
  code: string;
  name: string;
  type: string;
}

// ===========================================
// SUGGESTION FUNCTION FOR FILE UPLOADS (PDF)
// ===========================================
/**
 * Optimized for PDF/file upload data structures.
 * Uses simpler keyword matching and focuses on category-to-account mapping.
 */
const suggestAccountForUpload = (
  transaction: { type: string; category: string; description: string; },
  accounts: Account[]
): { accountId: string | null; confidence: number } => {
  if (!accounts || accounts.length === 0) return { accountId: null, confidence: 0 };

  const safeText = (txt?: string | null) => (txt ? txt.toLowerCase() : '');
  const includesAny = (text: string, keywords: string[]) =>
    keywords.some(keyword => text.includes(keyword));

  const lowerTransactionType = safeText(transaction.type);
  const lowerCategory = safeText(transaction.category);
  const lowerDescription = safeText(transaction.description);

  // Helper to find an account by name keywords and optional type
  const findAccountByName = (nameKeywords: string[], accountType?: string) => {
    return accounts.find(acc => {
      const lowerAccName = safeText(acc.name);
      const typeMatch = accountType ? safeText(acc.type) === safeText(accountType) : true;
      return typeMatch && includesAny(lowerAccName, nameKeywords);
    });
  };

  // --- 1. Direct Category/Description to Account Name Matches (Highest Priority) ---

  // Expenses
  if (lowerTransactionType === 'expense') {
    if (includesAny(lowerCategory, ['fuel']) || includesAny(lowerDescription, ['fuel', 'petrol'])) {
      const acc = findAccountByName(['fuel expense'], 'expense');
      if (acc) return { accountId: String(acc.id), confidence: 90 };
    }
    if (includesAny(lowerCategory, ['salaries and wages']) || includesAny(lowerDescription, ['salary', 'wages', 'payroll'])) {
      const acc = findAccountByName(['salaries and wages expense'], 'expense');
      if (acc) return { accountId: String(acc.id), confidence: 90 };
    }
    if (includesAny(lowerCategory, ['projects expenses']) || includesAny(lowerDescription, ['project', 'materials', 'contractor'])) {
      const acc = findAccountByName(['projects expenses'], 'expense');
      if (acc) return { accountId: String(acc.id), confidence: 90 };
    }
    if (includesAny(lowerCategory, ['accounting fees']) || includesAny(lowerDescription, ['accountant', 'audit', 'tax fee'])) {
      const acc = findAccountByName(['accounting fees expense'], 'expense');
      if (acc) return { accountId: String(acc.id), confidence: 90 };
    }
    if (includesAny(lowerCategory, ['repairs & maintenance']) || includesAny(lowerDescription, ['repair', 'maintenance', 'fix', 'electrician'])) {
      const acc = findAccountByName(['repairs & maintenance expense'], 'expense');
      if (acc) return { accountId: String(acc.id), confidence: 90 };
    }
    if (includesAny(lowerCategory, ['water and electricity']) || includesAny(lowerDescription, ['electricity', 'water bill', 'utilities'])) {
      const acc = findAccountByName(['water and electricity expense'], 'expense');
      if (acc) return { accountId: String(acc.id), confidence: 90 };
    }
    if (includesAny(lowerCategory, ['bank charges']) || includesAny(lowerDescription, ['bank charge', 'service fee', 'card fee'])) {
      const acc = findAccountByName(['bank charges & fees'], 'expense');
      if (acc) return { accountId: String(acc.id), confidence: 90 };
    }
    if (includesAny(lowerCategory, ['insurance']) || includesAny(lowerDescription, ['insurance', 'policy'])) {
      const acc = findAccountByName(['insurance expense'], 'expense');
      if (acc) return { accountId: String(acc.id), confidence: 90 };
    }
    if (includesAny(lowerCategory, ['loan interest']) || includesAny(lowerDescription, ['loan interest', 'interest on debit', 'int on debit'])) {
      const acc = findAccountByName(['loan interest expense'], 'expense');
      if (acc) return { accountId: String(acc.id), confidence: 90 };
    }
    if (includesAny(lowerCategory, ['computer internet and telephone']) || includesAny(lowerDescription, ['internet', 'airtime', 'telephone', 'wifi', 'data'])) {
      const acc = findAccountByName(['communication expense'], 'expense');
      if (acc) return { accountId: String(acc.id), confidence: 90 };
    }
    if (includesAny(lowerCategory, ['website hosting fees']) || includesAny(lowerDescription, ['website', 'hosting', 'domain'])) {
      const acc = findAccountByName(['website hosting fees'], 'expense');
      if (acc) return { accountId: String(acc.id), confidence: 90 };
    }
    if (includesAny(lowerCategory, ['other expenses']) || includesAny(lowerDescription, ['misc', 'sundries', 'general expense'])) {
      const acc = findAccountByName(['miscellaneous expense'], 'expense');
      if (acc) return { accountId: String(acc.id), confidence: 85 };
    }
    if (includesAny(lowerCategory, ['rent']) || includesAny(lowerDescription, ['rent', 'rental'])) {
      const acc = findAccountByName(['rent expense'], 'expense');
      if (acc) return { accountId: String(acc.id), confidence: 85 };
    }
    if (includesAny(lowerCategory, ['cost of goods sold', 'cogs']) || includesAny(lowerDescription, ['cost of goods sold', 'cogs', 'purchases'])) {
      const acc = findAccountByName(['cost of goods sold'], 'expense');
      if (acc) return { accountId: String(acc.id), confidence: 85 };
    }
  }

  // Income
  if (lowerTransactionType === 'income') {
    if (includesAny(lowerCategory, ['sales', 'revenue']) || includesAny(lowerDescription, ['sale', 'revenue', 'customer payment'])) {
      const acc = findAccountByName(['sales revenue'], 'income');
      if (acc) return { accountId: String(acc.id), confidence: 90 };
    }
    if (includesAny(lowerCategory, ['interest income']) || includesAny(lowerDescription, ['interest received', 'interest income'])) {
      const acc = findAccountByName(['interest income'], 'income');
      if (acc) return { accountId: String(acc.id), confidence: 90 };
    }
    if (includesAny(lowerCategory, ['income', 'general income']) || includesAny(lowerDescription, ['transfer from', 'deposit'])) {
      const acc = findAccountByName(['other income'], 'income');
      if (acc) return { accountId: String(acc.id), confidence: 80 };
    }
  }

  // Debt/Liability
  if (lowerTransactionType === 'debt') {
    if (includesAny(lowerCategory, ['car loans', 'loan repayment']) || includesAny(lowerDescription, ['car loan', 'vehicle finance'])) {
      const acc = findAccountByName(['car loans'], 'liability');
      if (acc) return { accountId: String(acc.id), confidence: 90 };
    }
    if (includesAny(lowerCategory, ['loan', 'debt']) || includesAny(lowerDescription, ['loan', 'debt', 'borrow'])) {
      const acc = findAccountByName(['loan payable', 'long-term loan payable', 'short-term loan payable'], 'liability');
      if (acc) return { accountId: String(acc.id), confidence: 85 };
    }
    if (includesAny(lowerCategory, ['accounts payable']) || includesAny(lowerDescription, ['payable', 'creditor'])) {
      const acc = findAccountByName(['accounts payable'], 'liability');
      if (acc) return { accountId: String(acc.id), confidence: 90 };
    }
    if (includesAny(lowerCategory, ['credit facility']) || includesAny(lowerDescription, ['credit facility', 'line of credit'])) {
      const acc = findAccountByName(['credit facility payable'], 'liability');
      if (acc) return { accountId: String(acc.id), confidence: 90 };
    }
  }

  // --- 2. Fallback to General Account Types ---
  if (lowerTransactionType === 'income') {
    const acc = accounts.find(acc => safeText(acc.type) === 'income');
    if (acc) return { accountId: String(acc.id), confidence: 60 };
  }
  if (lowerTransactionType === 'expense') {
    const acc = accounts.find(acc => safeText(acc.type) === 'expense');
    if (acc) return { accountId: String(acc.id), confidence: 60 };
  }
  if (lowerTransactionType === 'debt') {
    const acc = accounts.find(acc => safeText(acc.type) === 'liability');
    if (acc) return { accountId: String(acc.id), confidence: 60 };
  }

  // --- 3. Final Fallback ---
  const defaultBank = findAccountByName(['bank account'], 'asset');
  if (defaultBank) return { accountId: String(defaultBank.id), confidence: 40 };

  const defaultCash = findAccountByName(['cash'], 'asset');
  if (defaultCash) return { accountId: String(defaultCash.id), confidence: 40 };

  return accounts.length > 0 ? { accountId: String(accounts[0].id), confidence: 20 } : { accountId: null, confidence: 0 };
};

// ==========================================
// SUGGESTION FUNCTION FOR TEXT INPUT
// ==========================================
/**
 * Optimized for natural language text input with contextual phrase matching.
 * Uses sophisticated scoring and contextual analysis.
 */
const suggestAccountForText = (
  transaction: { type: string; category: string; description: string; },
  accounts: Account[]
): { accountId: string | null; confidence: number } => {
  if (!accounts || accounts.length === 0) return { accountId: null, confidence: 0 };

  const safeText = (txt?: string | null) => (txt ? txt.toLowerCase() : '');
  const lowerTransactionType = safeText(transaction.type);
  const lowerCategory = safeText(transaction.category);
  const lowerDescription = safeText(transaction.description);

  let bestMatch: Account | null = null;
  let highestScore = -1;

  for (const account of accounts) {
    const lowerAccName = safeText(account.name);
    const lowerAccType = safeText(account.type);
    let currentScore = 0;

    // --- Scoring Logic (Prioritized) ---

    // 1. **Direct Account Name Inclusion (Highest Priority: 100 points)**
    if (lowerDescription.includes(lowerAccName) && lowerAccName.length > 3) {
      currentScore += 100;
    }
    if (lowerCategory.includes(lowerAccName) && lowerAccName.length > 3) {
      currentScore += 80;
    }

    // 2. **Contextual Phrase Matching (Very High Priority Boost: +70 points)**
    if (lowerDescription.includes("owner's cash investment") && lowerAccName.includes("owner's capital") && lowerAccType === 'equity') {
        currentScore += 70;
    }
    if (lowerDescription.includes("bank loan") && lowerAccName.includes("bank loan payable") && lowerAccType === 'liability') {
        currentScore += 70;
    }
    if (lowerDescription.includes("purchase of office equipment") && lowerAccName.includes("office equipment") && lowerAccType === 'asset') {
        currentScore += 70;
    }
    if (lowerDescription.includes("purchase of supplies on credit") && lowerAccName.includes("accounts payable") && lowerAccType === 'liability') {
        currentScore += 70;
    }
    if (lowerDescription.includes("revenue from services provided") && lowerAccName.includes("sales revenue") && lowerAccType === 'income') {
        currentScore += 70;
    }
    if (lowerDescription.includes("revenue from services on credit") && lowerAccName.includes("accounts receivable") && lowerAccType === 'asset') {
        currentScore += 70;
    }
    if (lowerDescription.includes("january rent payment") && lowerAccName.includes("rent expense") && lowerAccType === 'expense') {
        currentScore += 70;
    }
    if (lowerDescription.includes("salaries disbursement") && lowerAccName.includes("salaries and wages expense") && lowerAccType === 'expense') {
        currentScore += 70;
    }
    if (lowerDescription.includes("january salaries payment") && lowerAccName.includes("salaries and wages expense") && lowerAccType === 'expense') {
        currentScore += 70;
    }
    if (lowerDescription.includes("february salaries payment") && lowerAccName.includes("salaries and wages expense") && lowerAccType === 'expense') {
        currentScore += 70;
    }
    if (lowerDescription.includes("march salaries payment") && lowerAccName.includes("salaries and wages expense") && lowerAccType === 'expense') {
        currentScore += 70;
    }
    if (lowerDescription.includes("payment for january 15th supplies") && lowerAccName.includes("accounts payable") && lowerAccType === 'liability') {
        currentScore += 70;
    }
    if (lowerDescription.includes("collection from client") && lowerAccName.includes("accounts receivable") && lowerAccType === 'asset') {
        currentScore += 70;
    }
    if (lowerDescription.includes("purchase of supplies") && lowerAccName.includes("supplies expense") && lowerAccType === 'expense') {
        currentScore += 70;
    }
    if (lowerDescription.includes("utility bill payment") && lowerAccName.includes("utilities expense") && lowerAccType === 'expense') {
        currentScore += 70;
    }
    if (lowerDescription.includes("loan repayment") && lowerAccName.includes("loan payable") && lowerAccType === 'liability') {
        currentScore += 70;
    }
    if (lowerDescription.includes("cash from client") && lowerAccName.includes("sales revenue") && lowerAccType === 'income') {
        currentScore += 70;
    }
    if (lowerDescription.includes("marketing expenses") && lowerAccName.includes("marketing expense") && lowerAccType === 'expense') {
        currentScore += 70;
    }
    if (lowerDescription.includes("purchase of new vehicle") && lowerAccName.includes("vehicle") && lowerAccType === 'asset') {
        currentScore += 70;
    }
    if (lowerDescription.includes("maintenance costs") && lowerAccName.includes("repairs & maintenance expense") && lowerAccType === 'expense') {
        currentScore += 70;
    }

    // 3. **Strong Keyword Overlap (Medium Priority: 10-30 points)**
    const accountNameKeywords = lowerAccName.split(/\s+/)
                                     .filter(word => word.length > 2 && !['and', 'of', 'for', 'the', 'a', 'an', 'expense', 'income', 'payable', 'receivable'].includes(word));
    for (const keyword of accountNameKeywords) {
      if (lowerDescription.includes(keyword)) {
        currentScore += 10;
      }
      if (lowerCategory.includes(keyword)) {
        currentScore += 8;
      }
    }

    // 4. **Transaction Type and Account Type Alignment (Moderate Priority: 15 points)**
    if ((lowerTransactionType === 'income' && lowerAccType === 'income') ||
        (lowerTransactionType === 'expense' && lowerAccType === 'expense') ||
        (lowerTransactionType === 'debt' && lowerAccType === 'liability') ||
        (lowerTransactionType === 'income' && lowerAccType === 'asset' && lowerAccName.includes('receivable')) ||
        (lowerTransactionType === 'expense' && lowerAccType === 'liability' && lowerAccName.includes('payable'))
        ) {
      currentScore += 15;
    }
    if ((lowerAccName.includes('bank') || lowerAccName.includes('cash')) && lowerAccType === 'asset') {
        currentScore += 5;
    }

    // --- Update Best Match ---
    if (currentScore > highestScore) {
      highestScore = currentScore;
      bestMatch = account;
    }
  }

  let suggestedAccountId: string | null = null;
  let confidence: number = 0;

  // --- Final Decision and Fallbacks ---
  if (bestMatch && highestScore > 60) {
    suggestedAccountId = String(bestMatch.id);
    confidence = Math.min(100, highestScore);
  } else {
    // Fallback logic (same as before)
    if (lowerTransactionType === 'income') {
      const defaultTypeAccount = accounts.find(acc => safeText(acc.type) === 'income');
      if (defaultTypeAccount) {
        suggestedAccountId = String(defaultTypeAccount.id);
        confidence = 40;
      }
    } else if (lowerTransactionType === 'expense') {
      const defaultTypeAccount = accounts.find(acc => safeText(acc.type) === 'expense');
      if (defaultTypeAccount) {
        suggestedAccountId = String(defaultTypeAccount.id);
        confidence = 40;
      }
    } else if (lowerTransactionType === 'debt') {
      const defaultTypeAccount = accounts.find(acc => safeText(acc.type) === 'liability');
      if (defaultTypeAccount) {
        suggestedAccountId = String(defaultTypeAccount.id);
        confidence = 40;
      }
    }

    if (!suggestedAccountId) {
      const defaultBankOrCash = accounts.find(acc =>
        (safeText(acc.name).includes('bank') || safeText(acc.name).includes('cash')) && safeText(acc.type) === 'asset'
      );
      if (defaultBankOrCash) {
        suggestedAccountId = String(defaultBankOrCash.id);
        confidence = 20;
      }
    }

    if (!suggestedAccountId && accounts.length > 0) {
      suggestedAccountId = String(accounts[0].id);
      confidence = 10;
    }
  }

  return { accountId: suggestedAccountId, confidence: confidence };
};

// --- EditableTransactionTable Component ---
const EditableTransactionTable = ({ transactions: initialTransactions, accounts, categories, onConfirm, onCancel }) => {
  const [transactions, setTransactions] = useState(initialTransactions);
  const [editingRowId, setEditingRowId] = useState(null);

  const handleTransactionChange = (id, field, value) => {
    setTransactions(prevData =>
      prevData.map(tx =>
        tx.id === id || tx._tempId === id ? { ...tx, [field]: value } : tx
      )
    );
  };

  const handleTransactionDelete = (idToDelete) => {
    setTransactions(prevData => prevData.filter(tx => tx.id !== idToDelete && tx._tempId !== idToDelete));
  };

  return (
    <div className="p-4 bg-white rounded-lg shadow-md">
      <h4 className="text-lg font-semibold mb-3">Review & Edit Transactions:</h4>
      <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Type</TableHead>
              <TableHead>Amount (R)</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Account</TableHead>
              <TableHead>Confidence</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(transactions || []).map((transaction) => (
              <TableRow key={transaction.id || transaction._tempId}>
                <TableCell>
                  {editingRowId === (transaction.id || transaction._tempId) ? (
                    <Select
                      value={transaction.type}
                      onValueChange={(value) => handleTransactionChange(transaction.id || transaction._tempId, 'type', value)}
                    >
                      <SelectTrigger className="w-[100px]">
                        <SelectValue placeholder="Type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="income">Income</SelectItem>
                        <SelectItem value="expense">Expense</SelectItem>
                        <SelectItem value="debt">Debt</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    transaction.type
                  )}
                </TableCell>
                <TableCell>
                  {editingRowId === (transaction.id || transaction._tempId) ? (
                    <Input
                      type="number"
                      step="0.01"
                      value={transaction.amount}
                      onChange={(e) => handleTransactionChange(transaction.id || transaction._tempId, 'amount', e.target.value)}
                      className="w-[100px]"
                    />
                  ) : (
                    parseFloat(transaction.amount).toFixed(2)
                  )}
                </TableCell>
                <TableCell className="max-w-[200px] truncate">
                  {editingRowId === (transaction.id || transaction._tempId) ? (
                    <Textarea
                      value={transaction.description}
                      onChange={(e) => handleTransactionChange(transaction.id || transaction._tempId, 'description', e.target.value)}
                      rows="2"
                      className="w-[200px]"
                    />
                  ) : (
                    transaction.description
                  )}
                </TableCell>
                <TableCell>
                  {editingRowId === (transaction.id || transaction._tempId) ? (
                    <Input
                      type="date"
                      value={transaction.date}
                      onChange={(e) => handleTransactionChange(transaction.id || transaction._tempId, 'date', e.target.value)}
                      className="w-[150px]"
                    />
                  ) : (
                    transaction.date
                  )}
                </TableCell>
                <TableCell>
                  {editingRowId === (transaction.id || transaction._tempId) ? (
                    <Select
                      value={transaction.category}
                      onValueChange={(value) => handleTransactionChange(transaction.id || transaction._tempId, 'category', value)}
                    >
                      <SelectTrigger className="w-[150px]">
                        <SelectValue placeholder="Category" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((cat) => (
                          <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    transaction.category
                  )}
                </TableCell>
                <TableCell>
                  {editingRowId === (transaction.id || transaction._tempId) ? (
                    <Select
                      value={transaction.account_id}
                      onValueChange={(value) => handleTransactionChange(transaction.id || transaction._tempId, 'account_id', value)}
                    >
                      <SelectTrigger className="w-[150px]">
                        <SelectValue placeholder="Account" />
                      </SelectTrigger>
                      <SelectContent>
                        {(accounts || []).map((account) => (
                          <SelectItem key={account.id} value={String(account.id)}>{account.name} ({account.type})</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    accounts.find(acc => String(acc.id) === String(transaction.account_id))?.name || 'N/A'
                  )}
                </TableCell>
                <TableCell>
                  {transaction.confidenceScore !== undefined ? (
                    <Badge
                      variant={
                        transaction.confidenceScore >= 90 ? "success" :
                        transaction.confidenceScore >= 60 ? "default" : "destructive"
                      }
                    >
                      {transaction.confidenceScore.toFixed(0)}%
                    </Badge>
                  ) : (
                    'N/A'
                  )}
                </TableCell>
                <TableCell className="flex space-x-2">
                  {editingRowId === (transaction.id || transaction._tempId) ? (
                    <>
                      <Button variant="outline" size="sm" onClick={() => setEditingRowId(null)} className="flex items-center">
                        <XCircle size={16} className="mr-1" /> Cancel
                      </Button>
                      <Button size="sm" onClick={() => setEditingRowId(null)} className="flex items-center">
                        <CheckCircle size={16} className="mr-1" /> Save
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button variant="outline" size="sm" onClick={() => setEditingRowId(transaction.id || transaction._tempId)} className="flex items-center">
                        <Edit3 size={16} className="mr-1" /> Edit
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleTransactionDelete(transaction.id || transaction._tempId)}
                        className="flex items-center"
                      >
                        <Trash2 className="h-4 w-4" /> Delete
                      </Button>
                    </>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <div className="flex justify-end space-x-4 mt-4">
        <Button variant="secondary" onClick={onCancel}>
          <XCircle size={18} className="mr-2" /> Cancel Review
        </Button>
        <Button onClick={() => onConfirm(transactions)}>
          <CheckCircle size={18} className="mr-2" /> Confirm & Submit All
        </Button>
      </div>
    </div>
  );
};

// --- Main ChatInterface Component ---
const ChatInterface = () => {
  // REMOVED: const RAIRO_API_BASE_URL = 'https://rairo-stmt-api.hf.space';
  // REMOVED: const API_BASE_URL = 'https://quantnow.onrender.com';

  const [messages, setMessages] = useState<Array<{ id: string; sender: string; content: string | JSX.Element }>>([]);
  // HARDCODED ACCOUNTS
  const [accounts, setAccounts] = useState<Account[]>([
    { id: 'a1', name: 'Bank Account', type: 'Asset', code: '1001' },
    { id: 'a2', name: 'Accounts Receivable', type: 'Asset', code: '1002' },
    { id: 'a3', name: 'Inventory', type: 'Asset', code: '1003' },
    { id: 'a4', name: 'Fixed Assets', type: 'Asset', code: '1004' },
    { id: 'a5', name: 'Accounts Payable', type: 'Liability', code: '2001' },
    { id: 'a6', name: 'Short-term Debt', type: 'Liability', code: '2002' },
    { id: 'a7', name: 'Long-term Debt', type: 'Liability', code: '2003' },
    { id: 'a8', name: 'Owner\'s Capital', type: 'Equity', code: '3001' },
    { id: 'a9', name: 'Sales Revenue', type: 'Income', code: '4001' },
    { id: 'a10', name: 'Consulting Income', type: 'Income', code: '4002' },
    { id: 'a11', name: 'Interest Income', type: 'Income', code: '4003' },
    { id: 'a12', name: 'Rent Expense', type: 'Expense', code: '5001' },
    { id: 'a13', name: 'Salaries and Wages Expense', type: 'Expense', code: '5002' },
    { id: 'a14', name: 'Utilities Expense', type: 'Expense', code: '5003' },
    { id: 'a15', name: 'Marketing Expense', type: 'Expense', code: '5004' },
    { id: 'a16', name: 'Cost of Goods Sold', type: 'Expense', code: '5005' },
    { id: 'a17', name: 'Office Supplies Expense', type: 'Expense', code: '5006' },
    { id: 'a18', name: 'Fuel Expense', type: 'Expense', code: '5007' },
    { id: 'a19', name: 'Projects Expenses', type: 'Expense', code: '5008' },
    { id: 'a20', name: 'Accounting Fees Expense', type: 'Expense', code: '5009' },
    { id: 'a21', name: 'Repairs & Maintenance Expense', type: 'Expense', code: '5010' },
    { id: 'a22', name: 'Water and Electricity Expense', type: 'Expense', code: '5011' },
    { id: 'a23', name: 'Bank Charges & Fees', type: 'Expense', code: '5012' },
    { id: 'a24', name: 'Insurance Expense', type: 'Expense', code: '5013' },
    { id: 'a25', name: 'Loan Interest Expense', type: 'Expense', code: '5014' },
    { id: 'a26', name: 'Communication Expense', type: 'Expense', code: '5015' },
    { id: 'a27', name: 'Website Hosting Fees', type: 'Expense', code: '5016' },
    { id: 'a28', name: 'Miscellaneous Expense', type: 'Expense', code: '5017' },
    { id: 'a29', name: 'Car Loans', type: 'Liability', code: '2004' },
    { id: 'a30', name: 'Credit Facility Payable', type: 'Liability', code: '2005' },
    { id: 'a31', name: 'Other Income', type: 'Income', code: '4004' },
  ]);
  const [typedDescription, setTypedDescription] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);
  const chatContainerRef = useRef<HTMLDivElement | null>(null);

  const [showDocumentGeneration, setShowDocumentGeneration] = useState(false);
  const [selectedDocumentType, setSelectedDocumentType] = useState('');
  const [documentStartDate, setDocumentStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [documentEndDate, setDocumentEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [isGeneratingDocument, setIsGeneratingDocument] = useState(false);
  const [isLoadingAccounts, setIsLoadingAccounts] = useState(false); // Set to false directly

  // NEW: State to hold submitted transactions for display and review
  const [submittedTransactions, setSubmittedTransactions] = useState<Transaction[]>([]);
  const [reviewTransactionsModalOpen, setReviewTransactionsModalOpen] = useState(false);
  const [transactionsToReview, setTransactionsToReview] = useState<Transaction[]>([]);


  // Removed: Helper to get authorization headers
  const getAuthHeaders = useCallback(() => {
    return {}; // Return empty object since no auth needed
  }, []);


  const categories = [
    'Groceries', 'Rent', 'Utilities', 'Transport', 'Food', 'Salary', 'Deposit',
    'Loan', 'Debt Payment', 'Entertainment', 'Shopping', 'Healthcare', 'Education',
    'Travel', 'Investments', 'Insurance', 'Bills', 'Dining Out', 'Subscriptions', 'Other',
    'Sales Revenue', 'Interest Income', 'Cost of Goods Sold', 'Accounts Payable', 'Rent Expense',
    'Utilities Expense', 'Car Loans', 'Consulting Income', 'General Expense', 'Fees', 'Purchases', 'Refund',
    'Fuel', 'Salaries and Wages Expense', 'Projects Expenses', 'Accounting Fees', 'Repairs & Maintenance',
    'Water and Electricity', 'Bank Charges', 'Insurance Expense',
    'Loan Interest', 'Communication Expense', 'Website Hosting Fees', 'Credit Facility', 'Fixed Assets',
    'Long-term Debt', 'Accounts Receivable', 'Office Supplies Expense', 'Miscellaneous Expense', 'Other Income'
  ];

  // Scroll to bottom of chat messages when new message arrives
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    return () => {
      // Clean up audio URL if it was created
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [audioUrl]);

  useEffect(() => {
    // Simulate accounts loading
    // In a real app, you might fetch them here, but for hardcoded, just set them
    setIsLoadingAccounts(false);
    addAssistantMessage('Accounts loaded successfully. You can now import transactions.');
  }, []); // Empty dependency array means this runs once on mount

  const addMessage = (sender: string, content: string | JSX.Element) => {
    setMessages(prev => [...prev, { id: `${Date.now()}-${Math.random()}`, sender, content }]);
  };

  const addAssistantMessage = (content: string | JSX.Element) => {
    setMessages(prev => [...prev, { id: `${Date.now()}-${Math.random()}`, sender: 'assistant', content }]);
  };

  const addUserMessage = (content: string) => {
    setMessages(prev => [...prev, { id: `${Date.now()}-${Math.random()}`, sender: 'user', content }]);
  };

  const submitTransaction = async (dataToSubmit: Transaction) => {
    // Simulate API call success
    return new Promise((resolve) => {
      setTimeout(() => {
        const newTransaction: Transaction = {
          ...dataToSubmit,
          id: `tx-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`, // Generate unique ID
          is_verified: true, // Mark as verified on submission
          source: dataToSubmit.source || 'manual',
          created_at: new Date().toISOString(),
          account_name: accounts.find(acc => acc.id === dataToSubmit.account_id)?.name || dataToSubmit.account_name,
        };
        setSubmittedTransactions(prev => [...prev, newTransaction]);
        resolve({ success: true, transaction: newTransaction });
      }, 500); // Simulate network delay
    });
  };

  const handleSendMessage = async () => {
    if (typedDescription.trim() === '') return;

    addUserMessage(typedDescription);
    const userText = typedDescription;
    setTypedDescription('');

    addAssistantMessage('Processing your request...');

    // Simulate LLM response for text input
    setTimeout(async () => {
      const llmResponse = {
        type: 'expense', // Default or infer from text
        amount: 0, // Placeholder
        description: userText,
        date: new Date().toISOString().split('T')[0],
        category: 'Other', // Default or infer
      };

      // Attempt to infer type, amount, date, category from userText
      const lowerText = userText.toLowerCase();
      if (lowerText.includes('income') || lowerText.includes('received') || lowerText.includes('sales')) {
        llmResponse.type = 'income';
      } else if (lowerText.includes('expense') || lowerText.includes('paid') || lowerText.includes('bill')) {
        llmResponse.type = 'expense';
      } else if (lowerText.includes('loan') || lowerText.includes('debt')) {
        llmResponse.type = 'debt';
      }

      // Simple amount extraction (e.g., "R1500" or "1500")
      const amountMatch = lowerText.match(/r?(\d+(\.\d{1,2})?)/);
      if (amountMatch) {
        llmResponse.amount = parseFloat(amountMatch[1]);
      }

      // Simple date extraction (YYYY-MM-DD, MM/DD/YYYY, DD-MM-YYYY)
      const dateMatch = lowerText.match(/(\d{4}-\d{2}-\d{2})|(\d{1,2}\/\d{1,2}\/\d{4})|(\d{1,2}-\d{1,2}-\d{4})/);
      if (dateMatch) {
        let parsedDate = dateMatch[0];
        // Convert to YYYY-MM-DD if in other formats
        if (parsedDate.includes('/')) { // MM/DD/YYYY or DD/MM/YYYY
          const parts = parsedDate.split('/');
          if (parts[2].length === 2) parts[2] = `20${parts[2]}`; // Handle 2-digit year
          parsedDate = `${parts[2]}-${parts[0].padStart(2, '0')}-${parts[1].padStart(2, '0')}`;
        } else if (parsedDate.includes('-') && parsedDate.split('-')[0].length < 4) { // DD-MM-YYYY
          const parts = parsedDate.split('-');
          if (parts[2].length === 2) parts[2] = `20${parts[2]}`; // Handle 2-digit year
          parsedDate = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
        }
        llmResponse.date = parsedDate;
      }

      // Simple category inference
      const matchedCategory = categories.find(cat => lowerText.includes(cat.toLowerCase()));
      if (matchedCategory) {
        llmResponse.category = matchedCategory;
      }

      const { accountId, confidence } = suggestAccountForText(llmResponse as any, accounts);

      const suggestedTransaction: Transaction = {
        _tempId: `temp-${Date.now()}`, // Temporary ID for unconfirmed transactions
        type: llmResponse.type as 'income' | 'expense' | 'debt',
        amount: llmResponse.amount,
        description: llmResponse.description,
        date: llmResponse.date,
        category: llmResponse.category,
        account_id: accountId || (accounts.length > 0 ? accounts[0].id : ''),
        account_name: accounts.find(acc => acc.id === accountId)?.name || 'N/A',
        source: 'text_input',
        is_verified: false,
        original_text: userText,
        confidenceScore: confidence,
      };

      setTransactionsToReview([suggestedTransaction]);
      setReviewTransactionsModalOpen(true);

    }, 1000); // Simulate LLM processing time
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFile = event.target.files?.[0];
    if (!uploadedFile) return;

    setFile(uploadedFile);
    addUserMessage(`Uploaded file: ${uploadedFile.name}`);
    addAssistantMessage('Analyzing document...');

    // Simulate file analysis and LLM response
    setTimeout(async () => {
      // In a real scenario, you'd send the file to a backend for OCR/parsing
      // and then to an LLM for extraction. Here, we'll mock the response.
      const mockTransactions: Transaction[] = [
        {
          _tempId: `temp-${Date.now()}-1`, type: 'expense', amount: 1250.75, description: 'Invoice for graphic design services',
          date: '2025-07-28', category: 'Marketing Expense', account_id: 'a15', source: 'file_upload', is_verified: false,
          original_text: `Invoice from DesignCo for R1250.75 on 2025-07-28 for graphic design.`, confidenceScore: 95,
        },
        {
          _tempId: `temp-${Date.now()}-2`, type: 'expense', amount: 300, description: 'Office supplies purchase',
          date: '2025-07-29', category: 'Office Supplies Expense', account_id: 'a17', source: 'file_upload', is_verified: false,
          original_text: `Receipt from Stationery Mart for R300 on 2025-07-29 for pens and paper.`, confidenceScore: 88,
        },
        {
          _tempId: `temp-${Date.now()}-3`, type: 'income', amount: 5000, description: 'Client payment for project Alpha',
          date: '2025-07-25', category: 'Sales Revenue', account_id: 'a9', source: 'file_upload', is_verified: false,
          original_text: `Bank statement entry: Deposit R5000 from ABC Corp (Project Alpha).`, confidenceScore: 92,
        },
        {
          _tempId: `temp-${Date.now()}-4`, type: 'expense', amount: 750, description: 'Monthly internet bill',
          date: '2025-07-26', category: 'Communication Expense', account_id: 'a26', source: 'file_upload', is_verified: false,
          original_text: `Bank statement entry: Debit R750 for Internet Service Provider.`, confidenceScore: 90,
        },
        {
          _tempId: `temp-${Date.now()}-5`, type: 'expense', amount: 150, description: 'Fuel for company vehicle',
          date: '2025-07-27', category: 'Fuel', account_id: 'a18', source: 'file_upload', is_verified: false,
          original_text: `Petrol receipt R150.`, confidenceScore: 85,
        },
        {
          _tempId: `temp-${Date.now()}-6`, type: 'income', amount: 2500, description: 'Consulting income for Q3 planning',
          date: '2025-07-30', category: 'Consulting Income', account_id: 'a10', source: 'file_upload', is_verified: false,
          original_text: `Consulting fee received from XYZ Ltd.`, confidenceScore: 90,
        },
        {
          _tempId: `temp-${Date.now()}-7`, type: 'expense', amount: 450, description: 'Electricity bill payment',
          date: '2025-07-31', category: 'Utilities Expense', account_id: 'a14', source: 'file_upload', is_verified: false,
          original_text: `Utility bill payment R450.`, confidenceScore: 80,
        },
        {
          _tempId: `temp-${Date.now()}-8`, type: 'debt', amount: 10000, description: 'New short-term loan received',
          date: '2025-08-01', category: 'Loan', account_id: 'a6', source: 'file_upload', is_verified: false,
          original_text: `Loan disbursement from bank.`, confidenceScore: 92,
        },
        {
          _tempId: `temp-${Date.now()}-9`, type: 'expense', amount: 200, description: 'Bank charges for July',
          date: '2025-08-02', category: 'Bank Charges', account_id: 'a23', source: 'file_upload', is_verified: false,
          original_text: `Monthly bank service fees.`, confidenceScore: 87,
        },
        {
          _tempId: `temp-${Date.now()}-10`, type: 'income', amount: 100, description: 'Interest earned on savings account',
          date: '2025-08-03', category: 'Interest Income', account_id: 'a11', source: 'file_upload', is_verified: false,
          original_text: `Interest credit on account.`, confidenceScore: 90,
        },
        {
          _tempId: `temp-${Date.now()}-11`, type: 'expense', amount: 1800, description: 'Monthly rent for office space',
          date: '2025-08-05', category: 'Rent Expense', account_id: 'a12', source: 'file_upload', is_verified: false,
          original_text: `Rent payment for August.`, confidenceScore: 95,
        },
        {
          _tempId: `temp-${Date.now()}-12`, type: 'expense', amount: 3500, description: 'Salaries paid to staff',
          date: '2025-08-06', category: 'Salaries and Wages Expense', account_id: 'a13', source: 'file_upload', is_verified: false,
          original_text: `Payroll run for period.`, confidenceScore: 93,
        },
        {
          _tempId: `temp-${Date.now()}-13`, type: 'debt', amount: 500, description: 'Loan repayment installment',
          date: '2025-08-07', category: 'Loan', account_id: 'a6', source: 'file_upload', is_verified: false,
          original_text: `Installment paid on short-term loan.`, confidenceScore: 88,
        },
        {
          _tempId: `temp-${Date.now()}-14`, type: 'expense', amount: 600, description: 'Software subscription renewal',
          date: '2025-08-08', category: 'Subscriptions', account_id: 'a26', source: 'file_upload', is_verified: false,
          original_text: `Annual software license.`, confidenceScore: 80,
        },
        {
          _tempId: `temp-${Date.now()}-15`, type: 'income', amount: 7000, description: 'Sale of custom branded t-shirts',
          date: '2025-08-09', category: 'Sales Revenue', account_id: 'a9', source: 'file_upload', is_verified: false,
          original_text: `Payment for t-shirt order.`, confidenceScore: 94,
        },
        {
          _tempId: `temp-${Date.now()}-16`, type: 'expense', amount: 120, description: 'Coffee and snacks for team meeting',
          date: '2025-08-10', category: 'Food', account_id: 'a1', source: 'file_upload', is_verified: false,
          original_text: `Cafe receipt.`, confidenceScore: 70,
        },
        {
          _tempId: `temp-${Date.now()}-17`, type: 'expense', amount: 2500, description: 'Purchase of new printer for office',
          date: '2025-08-11', category: 'Fixed Assets', account_id: 'a4', source: 'file_upload', is_verified: false,
          original_text: `Printer purchase.`, confidenceScore: 90,
        },
        {
          _tempId: `temp-${Date.now()}-18`, type: 'income', amount: 300, description: 'Refund received for overcharged utility bill',
          date: '2025-08-12', category: 'Refund', account_id: 'a1', source: 'file_upload', is_verified: false,
          original_text: `Utility bill refund.`, confidenceScore: 85,
        },
        {
          _tempId: `temp-${Date.now()}-19`, type: 'expense', amount: 900, description: 'Repair of company vehicle after minor incident',
          date: '2025-08-13', category: 'Repairs & Maintenance', account_id: 'a21', source: 'file_upload', is_verified: false,
          original_text: `Vehicle repair invoice.`, confidenceScore: 91,
        },
      ];

      // Apply account suggestions using the suggestAccountForUpload function
      const transactionsWithSuggestions = mockTransactions.map(tx => {
        const { accountId, confidence } = suggestAccountForUpload(tx as any, accounts);
        return {
          ...tx,
          account_id: accountId || tx.account_id,
          account_name: accounts.find(acc => acc.id === accountId)?.name || tx.account_name,
          confidenceScore: confidence,
        };
      });

      setTransactionsToReview(transactionsWithSuggestions);
      setReviewTransactionsModalOpen(true);
      setFile(null); // Clear the file input
    }, 2000); // Simulate processing time
  };

  const handleStartRecording = async () => {
    if (!navigator.mediaDevices) {
      alert('Microphone access not supported in this browser.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorderRef.current.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        setAudioBlob(audioBlob);
        const url = URL.createObjectURL(audioBlob);
        setAudioUrl(url);
        addAssistantMessage('Audio recorded. Analyzing speech...');
        handleAudioUpload(audioBlob); // Automatically send for analysis
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
      addAssistantMessage('Recording started...');
    } catch (err) {
      console.error('Error accessing microphone:', err);
      alert('Failed to access microphone. Please ensure it is connected and permissions are granted.');
    }
  };

  const handleStopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop()); // Stop microphone track
      setIsRecording(false);
      addAssistantMessage('Recording stopped.');
    }
  };

  const handleAudioUpload = async (audioBlob: Blob) => {
    // Removed: if (!isAuthenticated || !token) { ... return; }
    addAssistantMessage('Transcribing audio and suggesting transactions...');

    // Simulate audio transcription and LLM response
    setTimeout(async () => {
      // In a real scenario, you'd send the audioBlob to a speech-to-text API
      // then send the text to an LLM. Here, we'll mock the response.
      const mockTranscription = "I paid R500 for office rent on March 1st, 2025.";
      const llmResponse = {
        type: 'expense',
        amount: 500,
        description: 'Office rent payment',
        date: '2025-03-01',
        category: 'Rent Expense',
      };

      const { accountId, confidence } = suggestAccountForText(llmResponse as any, accounts);

      const suggestedTransaction: Transaction = {
        _tempId: `temp-${Date.now()}`,
        type: llmResponse.type as 'income' | 'expense' | 'debt',
        amount: llmResponse.amount,
        description: llmResponse.description,
        date: llmResponse.date,
        category: llmResponse.category,
        account_id: accountId || (accounts.length > 0 ? accounts[0].id : ''),
        account_name: accounts.find(acc => acc.id === accountId)?.name || 'N/A',
        source: 'voice_input',
        is_verified: false,
        original_text: mockTranscription,
        confidenceScore: confidence,
      };

      setTransactionsToReview([suggestedTransaction]);
      setReviewTransactionsModalOpen(true);
    }, 2000); // Simulate processing time
  };

  const handleConfirmTransactions = async (transactionsToSubmit: Transaction[]) => {
    addAssistantMessage('Submitting confirmed transactions...');
    let allSuccess = true;
    for (const tx of transactionsToSubmit) {
      const result = await submitTransaction(tx);
      if (!result.success) {
        allSuccess = false;
        addAssistantMessage(`Failed to submit transaction: ${tx.description}. Error: ${result.error}`);
      }
    }

    if (allSuccess) {
      addAssistantMessage('All transactions submitted successfully!');
    } else {
      addAssistantMessage('Some transactions failed to submit. Please check the console for details.');
    }
    setReviewTransactionsModalOpen(false);
    setTransactionsToReview([]); // Clear transactions in review
  };

  const handleCancelReview = () => {
    setReviewTransactionsModalOpen(false);
    setTransactionsToReview([]);
    addAssistantMessage('Transaction review cancelled.');
  };

  const handleGenerateDocument = async () => {
    // Removed: if (!isAuthenticated || !token) { ... return; }
    if (!selectedDocumentType) {
      alert('Please select a document type.');
      return;
    }
    setIsGeneratingDocument(true);
    addAssistantMessage(`Generating ${selectedDocumentType} from ${documentStartDate} to ${documentEndDate}...`);

    // Simulate document generation
    setTimeout(() => {
      const mockDocumentContent = `
        <html>
        <head>
          <title>${selectedDocumentType.toUpperCase()} Report</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            h1 { color: #333; }
            pre { background-color: #f4f4f4; padding: 10px; border-radius: 5px; }
          </style>
        </head>
        <body>
          <h1>${selectedDocumentType.toUpperCase()} Report</h1>
          <p>Generated for the period: ${documentStartDate} to ${documentEndDate}</p>
          <pre>
            This is a simulated ${selectedDocumentType} report.
            In a real application, this would contain detailed financial data
            based on your transactions within the selected date range.

            Example Data:
            Total Income: R50,000
            Total Expenses: R20,000
            Net Profit: R30,000
            ...
          </pre>
          <p>Generated on: ${new Date().toLocaleDateString()}</p>
        </body>
        </html>
      `;
      const blob = new Blob([mockDocumentContent], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${selectedDocumentType}-report-${documentStartDate}-to-${documentEndDate}.html`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      addAssistantMessage(`Your ${selectedDocumentType} report has been generated and downloaded.`);
      setIsGeneratingDocument(false);
      setShowDocumentGeneration(false);
    }, 2000); // Simulate generation time
  };


  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Header */}
      <div className="bg-white p-4 border-b shadow-sm flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-800">Financial Chatbot</h2>
        <Button onClick={() => setShowDocumentGeneration(true)} variant="outline" className="flex items-center">
          <FileText className="h-4 w-4 mr-2" /> Generate Report
        </Button>
      </div>

      {/* Chat Messages Area */}
      <div ref={chatContainerRef} className="flex-1 p-4 overflow-y-auto space-y-4">
        {messages.map((msg) => (
          <motion.div
            key={msg.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-md p-3 rounded-lg shadow-md ${
                msg.sender === 'user'
                  ? 'bg-blue-500 text-white rounded-br-none'
                  : 'bg-gray-200 text-gray-800 rounded-bl-none'
              }`}
            >
              {typeof msg.content === 'string' ? (
                <p>{msg.content}</p>
              ) : (
                msg.content
              )}
            </div>
          </motion.div>
        ))}
        {isLoadingAccounts && (
          <div className="flex justify-start">
            <div className="max-w-md p-3 rounded-lg shadow-md bg-gray-200 text-gray-800 rounded-bl-none flex items-center">
              <Loader2 className="h-4 w-4 animate-spin mr-2" /> Loading accounts...
            </div>
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="p-4 bg-white border-t flex items-center space-x-2">
        <Button
          variant="outline"
          size="icon"
          onClick={isRecording ? handleStopRecording : handleStartRecording}
          className={isRecording ? 'bg-red-500 text-white hover:bg-red-600' : ''}
        >
          {isRecording ? <StopCircle className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
        </Button>
        <label htmlFor="file-upload" className="cursor-pointer">
          <Button variant="outline" size="icon" asChild>
            <Paperclip className="h-5 w-5" />
          </Button>
          <input id="file-upload" type="file" className="hidden" onChange={handleFileUpload} />
        </label>
        {audioUrl && (
          <div className="flex items-center space-x-2">
            <audio ref={audioPlayerRef} src={audioUrl} controls className="hidden" />
            <Button variant="outline" size="icon" onClick={() => audioPlayerRef.current?.play()}>
              <Play className="h-5 w-5" />
            </Button>
            <Button variant="outline" size="icon" onClick={() => { setAudioUrl(null); setAudioBlob(null); }}>
              <Trash2 className="h-5 w-5" />
            </Button>
          </div>
        )}
        <Input
          placeholder="Type your financial query or transaction..."
          className="flex-1"
          value={typedDescription}
          onChange={(e) => setTypedDescription(e.target.value)}
          onKeyPress={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSendMessage();
            }
          }}
          disabled={isRecording}
        />
        <Button onClick={handleSendMessage} disabled={isRecording || typedDescription.trim() === ''}>
          <Send className="h-5 w-5" />
        </Button>
      </div>

      {/* Review Transactions Modal */}
      <Dialog open={reviewTransactionsModalOpen} onOpenChange={setReviewTransactionsModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Review Suggested Transactions</DialogTitle>
            <DialogDescription>
              Please review the extracted transactions. You can edit or delete them before confirming.
            </DialogDescription>
          </DialogHeader>
          <EditableTransactionTable
            transactions={transactionsToReview}
            accounts={accounts}
            categories={categories}
            onConfirm={handleConfirmTransactions}
            onCancel={handleCancelReview}
          />
        </DialogContent>
      </Dialog>

      {/* Generate Document Modal */}
      <Dialog open={showDocumentGeneration} onOpenChange={setShowDocumentGeneration}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Generate Financial Report</DialogTitle>
            <DialogDescription>
              Select the type of report and the date range.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="document-type">Report Type</Label>
              <Select value={selectedDocumentType} onValueChange={setSelectedDocumentType}>
                <SelectTrigger id="document-type">
                  <SelectValue placeholder="Select report type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="income_statement">Income Statement</SelectItem>
                  <SelectItem value="balance_sheet">Balance Sheet</SelectItem>
                  <SelectItem value="cash_flow">Cash Flow Statement</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="start-date">Start Date</Label>
                <Input
                  id="start-date"
                  type="date"
                  value={documentStartDate}
                  onChange={(e) => setDocumentStartDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="end-date">End Date</Label>
                <Input
                  id="end-date"
                  type="date"
                  value={documentEndDate}
                  onChange={(e) => setDocumentEndDate(e.target.value)}
                />
              </div>
            </div>
            <Button onClick={handleGenerateDocument} className="w-full" disabled={isGeneratingDocument || !selectedDocumentType}>
              {isGeneratingDocument ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <FileText className="h-4 w-4 mr-2" />
              )}
              {isGeneratingDocument ? 'Generating...' : 'Generate Report'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ChatInterface;
