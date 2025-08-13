import React, { useEffect, useState, useCallback } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { motion } from 'framer-motion';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Edit, Printer, FileText } from 'lucide-react';

// Define an interface for your transaction data
interface Transaction {
  id: string;
  type: string; // 'income' or 'expense' or 'debt'
  amount: number | string;
  description: string;
  date: string; // Stored as YYYY-MM-DD
  category: string | null;
  account_id: string | null;
  account_name: string | null;
  created_at: string;
}

// Interface for Account
interface Account {
  id: string;
  code: string;
  name: string;
  type: string; // e.g., 'Asset', 'Liability', 'Equity', 'Income', 'Expense'
}

// REMOVED: const API_BASE_URL = 'https://quantnow.onrender.com'; // Your backend URL

const Transactions = () => {
  const [selectedAccountFilter, setSelectedAccountFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  // HARDCODED DATA
  const [transactions, setTransactions] = useState<Transaction[]>([
    { id: 't1', type: 'income', amount: 15000, description: 'Sales Revenue Q1', date: '2025-01-15', category: 'Sales Revenue', account_id: 'a1', account_name: 'Bank Account', created_at: '2025-01-15T10:00:00Z' },
    { id: 't2', type: 'expense', amount: 2000, description: 'Office Rent Jan', date: '2025-01-20', category: 'Rent Expense', account_id: 'a1', account_name: 'Bank Account', created_at: '2025-01-20T11:00:00Z' },
    { id: 't3', type: 'expense', amount: 3000, description: 'Salaries Jan', date: '2025-01-25', category: 'Salaries and Wages Expense', account_id: 'a1', account_name: 'Bank Account', created_at: '2025-01-25T12:00:00Z' },
    { id: 't4', type: 'income', amount: 8000, description: 'Consulting Fee', date: '2025-02-10', category: 'Consulting Income', account_id: 'a1', account_name: 'Bank Account', created_at: '2025-02-10T13:00:00Z' },
    { id: 't5', type: 'expense', amount: 500, description: 'Utilities Feb', date: '2025-02-15', category: 'Utilities Expense', account_id: 'a1', account_name: 'Bank Account', created_at: '2025-02-15T14:00:00Z' },
    { id: 't6', type: 'debt', amount: 10000, description: 'Loan Received', date: '2025-03-01', category: 'Long-term Debt', account_id: 'a1', account_name: 'Bank Account', created_at: '2025-03-01T15:00:00Z' },
    { id: 't7', type: 'expense', amount: 1500, description: 'Marketing Campaign', date: '2025-03-05', category: 'Marketing Expense', account_id: 'a1', account_name: 'Bank Account', created_at: '2025-03-05T16:00:00Z' },
    { id: 't8', type: 'income', amount: 500, description: 'Interest Income', date: '2025-03-10', category: 'Interest Income', account_id: 'a1', account_name: 'Bank Account', created_at: '2025-03-10T17:00:00Z' },
    { id: 't9', type: 'expense', amount: 4000, description: 'Purchase of Inventory', date: '2025-04-01', category: 'Cost of Goods Sold', account_id: 'a3', account_name: 'Inventory', created_at: '2025-04-01T09:00:00Z' },
    { id: 't10', type: 'income', amount: 20000, description: 'Sales Revenue Q2', date: '2025-04-10', category: 'Sales Revenue', account_id: 'a1', account_name: 'Bank Account', created_at: '2025-04-10T10:00:00Z' },
    { id: 't11', type: 'expense', amount: 1000, description: 'Office Supplies', date: '2025-04-12', category: 'Office Supplies Expense', account_id: 'a1', account_name: 'Bank Account', created_at: '2025-04-12T11:00:00Z' },
    { id: 't12', type: 'expense', amount: 5000, description: 'Equipment Purchase', date: '2025-05-01', category: 'Fixed Assets', account_id: 'a4', account_name: 'Fixed Assets', created_at: '2025-05-01T12:00:00Z' },
    { id: 't13', type: 'expense', amount: 1000, description: 'Loan Repayment', date: '2025-05-15', category: 'Long-term Debt', account_id: 'a1', account_name: 'Bank Account', created_at: '2025-05-15T13:00:00Z' },
    { id: 't14', type: 'income', amount: 2000, description: 'Accounts Receivable Collection', date: '2025-06-01', category: 'Accounts Receivable', account_id: 'a1', account_name: 'Bank Account', created_at: '2025-06-01T14:00:00Z' },
  ]);

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
  ]);

  const [loading, setLoading] = useState(false); // Set to false as data is hardcoded

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [editFormData, setEditFormData] = useState<any>({});

  // Callback to "fetch" transactions (now filters hardcoded data)
  const filterTransactions = useCallback(() => {
    let filtered = transactions;

    if (selectedAccountFilter !== 'all') {
      if (selectedAccountFilter === 'revenue_accounts') {
        const revenueAccountIds = accounts.filter(acc => acc.type === 'Income').map(acc => acc.id);
        filtered = filtered.filter(tx => tx.account_id && revenueAccountIds.includes(tx.account_id));
      } else {
        filtered = filtered.filter(tx => tx.account_id === selectedAccountFilter);
      }
    }

    if (searchTerm) {
      const lowerSearchTerm = searchTerm.toLowerCase();
      filtered = filtered.filter(tx =>
        tx.description?.toLowerCase().includes(lowerSearchTerm) ||
        tx.type.toLowerCase().includes(lowerSearchTerm) ||
        tx.account_name?.toLowerCase().includes(lowerSearchTerm) ||
        tx.category?.toLowerCase().includes(lowerSearchTerm)
      );
    }

    if (fromDate) {
      const from = new Date(fromDate);
      filtered = filtered.filter(tx => new Date(tx.date) >= from);
    }
    if (toDate) {
      const to = new Date(toDate);
      filtered = filtered.filter(tx => new Date(tx.date) <= to);
    }

    // Update the displayed transactions (this is effectively what fetchTransactions would do)
    setTransactions(filtered); // Note: This will re-filter the original hardcoded list.
                               // If you want to persist filtered state, you'd need a separate `displayTransactions` state.
                               // For hardcoded data, re-filtering the original is generally fine.
  }, [selectedAccountFilter, searchTerm, fromDate, toDate, transactions, accounts]); // Added transactions and accounts to dependencies

  useEffect(() => {
    // Trigger initial filtering and re-filtering when filter criteria change
    filterTransactions();
  }, [filterTransactions]);


  const handleEditClick = (transaction: Transaction) => {
    setEditingTransaction(transaction);
    setEditFormData({
      id: transaction.id,
      type: transaction.type,
      amount: transaction.amount,
      description: transaction.description || '',
      date: transaction.date,
      category: transaction.category,
      account_id: transaction.account_id,
    });
    setIsEditModalOpen(true);
  };

  const handleEditFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setEditFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleEditSelectChange = (name: string, value: string) => {
    const finalValue = value === "NULL_CATEGORY_PLACEHOLDER" || value === "NO_ACCOUNT_PLACEHOLDER" ? null : value;
    setEditFormData(prev => ({ ...prev, [name]: finalValue }));
  };

  const handleUpdateSubmit = async () => {
    if (!editingTransaction) return;

    const parsedAmount = parseFloat(editFormData.amount);
    if (isNaN(parsedAmount) || !editFormData.type || !editFormData.date) {
      alert('Please fill in all required fields (Type, Amount, Date).');
      return;
    }

    // For hardcoded data, we update the local state directly
    setTransactions(prevTransactions =>
      prevTransactions.map(tx =>
        tx.id === editingTransaction.id
          ? {
              ...tx,
              type: editFormData.type,
              amount: parsedAmount,
              description: editFormData.description || null,
              date: editFormData.date,
              category: editFormData.category || null,
              account_id: editFormData.account_id || null,
              account_name: accounts.find(acc => acc.id === editFormData.account_id)?.name || null, // Update account_name
            }
          : tx
      )
    );

    setIsEditModalOpen(false);
    setEditingTransaction(null);
    setEditFormData({});
    // Re-filter to ensure changes are reflected in the displayed list
    filterTransactions();
  };

  const handleExportCsv = () => {
    if (transactions.length === 0) {
      alert('No transactions to export.');
      return;
    }

    const headers = [
      'ID',
      'Type',
      'Amount',
      'Description',
      'Date',
      'Category',
      'Account Name',
      'Created At',
    ];

    const csvRows = transactions.map(t => [
      `"${t.id}"`,
      `"${t.type}"`,
      `${(+t.amount).toFixed(2)}`,
      `"${t.description ? t.description.replace(/"/g, '""') : ''}"`,
      `"${new Date(t.date).toLocaleDateString()}"`,
      `"${t.category || ''}"`,
      `"${t.account_name || ''}"`,
      `"${new Date(t.created_at).toLocaleString()}"`,
    ]);

    const csvContent = [
      headers.join(','),
      ...csvRows.map(row => row.join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'transactions.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className='flex-1 space-y-4'>
      {loading ? ( // Use the local loading state, which is now always false
        <div className="text-center text-gray-600">Loading transactions...</div>
      ) : null}

      {/* Transactions Table */}
      <Card>
        <CardHeader>
          <CardTitle>Transaction Filters</CardTitle>
          <CardDescription>Filter transactions by account and date range</CardDescription>
        </CardHeader>
        <CardContent>
          {/* Account Filter */}
          <div>
              <Label className='mb-2 block font-medium'>Filter by Account</Label>
              <Select
                  value={selectedAccountFilter}
                  onValueChange={setSelectedAccountFilter}
              >
                  <SelectTrigger className="w-[220px]">
                      <SelectValue placeholder="Select an account" />
                  </SelectTrigger>
                  <SelectContent>
                      <SelectItem value="all">All Accounts</SelectItem>
                      <SelectItem value="revenue_accounts">Revenue Accounts</SelectItem>
                      {accounts.map(account => (
                          <SelectItem key={account.id} value={account.id}>
                              {account.name} ({account.code})
                          </SelectItem>
                      ))}
                  </SelectContent>
              </Select>
          </div>
        </CardContent>
      </Card>

      {/* Search and Date Range Filters */}
      <div className='flex flex-col md:flex-row gap-4 items-start md:items-center justify-between'>
        <div className='flex flex-col sm:flex-row gap-4 flex-1'>
          <Input
            placeholder='Search description, type, account...'
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className='max-w-sm'
          />
          <div className='flex gap-2'>
            <Input
              type='date'
              placeholder='From date'
              className='max-w-40'
              value={fromDate}
              onChange={e => setFromDate(e.target.value)}
            />
            <Input
              type='date'
              placeholder='To date'
              className='max-w-40'
              value={toDate}
              onChange={e => setToDate(e.target.value)}
            />
          </div>
        </div>
        <div className='flex gap-2'>
          <Button variant='outline' onClick={handleExportCsv}>
            <FileText className='h-4 w-4 mr-2' /> Export CSV
          </Button>
          <Button onClick={handlePrint}>
            <Printer className='h-4 w-4 mr-2' /> Print
          </Button>
        </div>
      </div>

      {/* Transactions Table */}
      <Card>
        <CardHeader>
          <CardTitle>Transaction History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className='overflow-x-auto'>
            <table className='w-full'>
              <thead>
                <tr className='border-b'>
                  <th className='text-left p-3'>Transaction Type</th>
                  <th className='text-left p-3'>Description</th>
                  <th className='text-left p-3'>Date</th>
                  <th className='text-left p-3'>Account</th>
                  <th className='text-left p-3'>Category</th>
                  <th className='text-left p-3'>Amount</th>
                  <th className='text-left p-3'>Action</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={7} className='text-center py-12 text-muted-foreground'>
                      Loading transactions...
                    </td>
                  </tr>
                ) : transactions.length === 0 ? (
                  <tr>
                    <td colSpan={7} className='text-center py-12 text-muted-foreground'>
                      No transactions found for the selected criteria
                    </td>
                  </tr>
                ) : (
                  transactions.map(transaction => (
                    <tr key={transaction.id} className='border-b last:border-b-0 hover:bg-muted/50'>
                      <td className='p-3'>
                        <Badge variant={transaction.type === 'income' ? 'default' : 'secondary'}>
                          {transaction.type}
                        </Badge>
                      </td>
                      <td className='p-3'>{transaction.description || '-'}</td>
                      <td className='p-3'>{new Date(transaction.date).toLocaleDateString()}</td>
                      <td className='p-3'>{transaction.account_name || 'N/A'}</td>
                      <td className='p-3'>{transaction.category || '-'}</td>
                      <td className='p-3'>R{(+transaction.amount).toFixed(2)}</td>
                      <td className='p-3'>
                        <div className='flex gap-2'>
                          <Button
                            variant='ghost'
                            size='sm'
                            onClick={() => handleEditClick(transaction)}
                          >
                            <Edit className='h-4 w-4' />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Edit Transaction Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Transaction</DialogTitle>
          </DialogHeader>
          {editingTransaction && (
            <div className='space-y-4 py-4'>
              <Label htmlFor='edit-type'>Transaction Type</Label>
              <Select
                name='type'
                value={editFormData.type || ''}
                onValueChange={value => handleEditSelectChange('type', value)}
              >
                <SelectTrigger id='edit-type'>
                  <SelectValue placeholder='Select type' />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='income'>Income</SelectItem>
                  <SelectItem value='expense'>Expense</SelectItem>
                  <SelectItem value='debt'>Debt</SelectItem> {/* Added 'debt' type */}
                </SelectContent>
              </Select>

              <Label htmlFor='edit-amount'>Amount (R)</Label>
              <Input
                id='edit-amount'
                type='number'
                name='amount'
                value={editFormData.amount}
                onChange={handleEditFormChange}
                placeholder='Amount'
              />

              <Label htmlFor='edit-date'>Date</Label>
              <Input
                id='edit-date'
                type='date'
                name='date'
                value={editFormData.date}
                onChange={handleEditFormChange}
              />

              <Label htmlFor='edit-description'>Description</Label>
              <Input
                id='edit-description'
                type='text'
                name='description'
                value={editFormData.description}
                onChange={handleEditFormChange}
                placeholder='Description'
              />

              <Label htmlFor='edit-category'>Category</Label>
              <Select
                name='category'
                value={editFormData.category || "NULL_CATEGORY_PLACEHOLDER"}
                onValueChange={value => handleEditSelectChange('category', value)}
              >
                <SelectTrigger id='edit-category'>
                  <SelectValue placeholder='Select category (Optional)' />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NULL_CATEGORY_PLACEHOLDER">None</SelectItem>
                  <SelectItem value='Sales Revenue'>Sales Revenue</SelectItem> {/* Updated categories */}
                  <SelectItem value='Consulting Income'>Consulting Income</SelectItem>
                  <SelectItem value='Interest Income'>Interest Income</SelectItem>
                  <SelectItem value='Rent Expense'>Rent Expense</SelectItem>
                  <SelectItem value='Salaries and Wages Expense'>Salaries and Wages Expense</SelectItem>
                  <SelectItem value='Utilities Expense'>Utilities Expense</SelectItem>
                  <SelectItem value='Marketing Expense'>Marketing Expense</SelectItem>
                  <SelectItem value='Cost of Goods Sold'>Cost of Goods Sold</SelectItem>
                  <SelectItem value='Office Supplies Expense'>Office Supplies Expense</SelectItem>
                  <SelectItem value='Fixed Assets'>Fixed Assets</SelectItem>
                  <SelectItem value='Long-term Debt'>Long-term Debt</SelectItem>
                  <SelectItem value='Accounts Receivable'>Accounts Receivable</SelectItem>
                </SelectContent>
              </Select>

              <Label htmlFor='edit-account'>Account</Label>
              <Select
                name='account_id'
                value={editFormData.account_id || "NO_ACCOUNT_PLACEHOLDER"}
                onValueChange={value => handleEditSelectChange('account_id', value)}
              >
                <SelectTrigger id='edit-account'>
                  <SelectValue placeholder='Select account' />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NO_ACCOUNT_PLACEHOLDER">No Account</SelectItem>
                  {accounts.map(acc => (
                    <SelectItem key={acc.id} value={acc.id}>
                      {acc.name} ({acc.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <div className='flex justify-end gap-2 mt-4'>
                <Button variant='outline' onClick={() => setIsEditModalOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleUpdateSubmit}>Save Changes</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Transactions;
