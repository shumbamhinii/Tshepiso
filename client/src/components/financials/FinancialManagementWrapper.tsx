import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { FinancialSubTab } from '@/types/pricing'; // Import the new FinancialSubTab type

// Import your financial components
import Financials from './Financials';
import ImportScreen from './ImportScreen';
import Transactions from './Transactions';

interface FinancialManagementWrapperProps {
  activeSubTab: FinancialSubTab;
  onSubTabChange: (tab: FinancialSubTab) => void; // Keeping this prop for consistency, though it won't be used internally
}

export default function FinancialManagementWrapper({
  activeSubTab,
}: FinancialManagementWrapperProps) { // Removed onSubTabChange from destructuring as it's not used
  const renderSubTabContent = () => {
    switch (activeSubTab) {
      case 'transactions':
        return <Transactions />;
      case 'import':
        return <ImportScreen />;
      case 'financials-reports':
        return <Financials />;
      default:
        return <Transactions />; // Fallback to Transactions if no valid sub-tab is active
    }
  };

  return (
    <div className="flex-1 space-y-4 p-4 md:p-6 lg:p-8">
      <Card className="pricing-form-section">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-card-foreground">
            Financial Management
          </CardTitle>
          <p className="text-muted-foreground mt-1">
            Manage your transactions, import data, and view financial reports.
          </p>
        </CardHeader>
        <CardContent>
          {/* Removed the Tabs component and its internal structure */}
          {renderSubTabContent()}
        </CardContent>
      </Card>
    </div>
  );
}
