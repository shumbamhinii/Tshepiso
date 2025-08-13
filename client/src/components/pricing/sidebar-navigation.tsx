import { Button } from "@/components/ui/button";
import { PricingTab, FinancialSubTab } from "@/types/pricing"; // Import FinancialSubTab
import {
  Settings,
  Package,
  TrendingUp,
  FlaskConical,
  Users,
  Wallet,
  Camera,
  ArrowLeft,
  Save,
  BrainIcon,
  Folder,
  DollarSign, // Icon for Financial Management
  Banknote, // Icon for Transactions
  FileInput, // Icon for Import Data
  BarChart3, // Icon for Financial Reports
  ChevronDown, // Icon for dropdown/expandable
  ChevronUp,
  LayoutDashboard,   // Icon for dropdown/collapsible
} from "lucide-react";
import { FileSpreadsheet } from "lucide-react";
// Removed: import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"; // No longer needed for this style

interface SidebarNavigationProps {
  activeTab: PricingTab;
  onTabChange: (mainTab: PricingTab, subTab?: FinancialSubTab) => void; // Updated signature
  onBack?: () => void;
  onSave?: () => void;
  isSaving?: boolean;
  activeFinancialSubTab?: FinancialSubTab; // New prop to indicate active sub-tab
}

const tabs = [
  {id: 'dashboard' as PricingTab, label: 'Dashboard', icon: LayoutDashboard},
  { id: 'setup' as PricingTab, label: 'Setup', icon: Settings },
  { id: 'products' as PricingTab, label: 'Products', icon: Package },
  { id: 'results' as PricingTab, label: 'Pricing', icon: TrendingUp },
  { id: 'scenarios' as PricingTab, label: 'What-If Scenarios', icon: FlaskConical },
  { id: 'competitors' as PricingTab, label: 'Competitor Pricing', icon: Users },
  { id: 'budget' as PricingTab, label: 'Budget', icon: Wallet },
  { id: 'snapshots' as PricingTab, label: 'Snapshot Manager', icon: Camera },
  { id: 'projects' as PricingTab, label: 'Projects', icon: Folder },
  {
    id: 'financial-management' as PricingTab,
    label: 'Financials',
    icon: DollarSign,
    subTabs: [ // Define sub-tabs for the expandable menu
      { id: 'transactions' as FinancialSubTab, label: 'Transactions', icon: Banknote },
      { id: 'import' as FinancialSubTab, label: 'Import Data', icon: FileInput },
      { id: 'financials-reports' as FinancialSubTab, label: 'Financial Reports', icon: BarChart3 },
    ]
  },
  { id: 'tenders' as PricingTab, label: 'Tender Management', icon: FileSpreadsheet },
  { id: 'pricingchat' as PricingTab, label: 'Pricing Chat', icon: BrainIcon },
];

export default function SidebarNavigation({
  activeTab,
  onTabChange,
  onBack,
  onSave,
  isSaving,
  activeFinancialSubTab
}: SidebarNavigationProps) {
  console.log("SidebarNavigation: onBack prop value:", onBack);

  return (
    <aside className="pricing-sidebar">
      {/* Header */}
      <div className="p-6 border-b border-sidebar-border">
        {onBack && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onBack}
            className="flex items-center text-sidebar-foreground hover:text-sidebar-foreground mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </Button>
        )}
        <h1 className="text-xl font-bold text-sidebar-foreground">Pricing Calculator</h1>
        <p className="text-sm text-sidebar-foreground/70 mt-1">Configure your pricing strategy</p>
      </div>

      {/* Navigation Tabs */}
      <nav className="flex-1 p-4">
        <div className="space-y-2">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            if (tab.subTabs) {
              // Render as an expandable section
              const isFinancialsActive = activeTab === tab.id;
              const ChevronIcon = isFinancialsActive ? ChevronUp : ChevronDown; // Change icon based on active state

              return (
                <div key={tab.id} className="space-y-1">
                  <button
                    onClick={() => onTabChange(tab.id)} // Click to activate/toggle parent tab
                    className={`pricing-tab-button w-full justify-between ${isFinancialsActive ? 'active' : ''}`}
                  >
                    <span className="flex items-center">
                      <Icon className="w-4 h-4 mr-3" />
                      <span className="text-sm">{tab.label}</span>
                    </span>
                    <ChevronIcon className="w-4 h-4 ml-2" /> {/* Chevron icon */}
                  </button>
                  {isFinancialsActive && ( // Render sub-tabs only if parent is active
                    <div className="ml-6 space-y-1"> {/* Indent sub-tabs */}
                      {tab.subTabs.map((subTab) => {
                        const SubIcon = subTab.icon;
                        const isSubTabActive = activeFinancialSubTab === subTab.id; // Check if this specific sub-tab is active
                        return (
                          <button
                            key={subTab.id}
                            onClick={() => onTabChange(tab.id, subTab.id)} // Pass both main and sub-tab ID
                            className={`pricing-tab-button w-full justify-start text-sm ${isSubTabActive ? 'active' : ''}`}
                          >
                            <SubIcon className="w-4 h-4 mr-2" />
                            {subTab.label}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            } else {
              // Render as a regular button
              return (
                <button
                  key={tab.id}
                  onClick={() => onTabChange(tab.id)} // Only pass main tab ID
                  className={`pricing-tab-button ${isActive ? 'active' : ''}`}
                >
                  <Icon className="w-4 h-4 mr-3" />
                  <span className="text-sm">{tab.label}</span>
                  {isActive && <div className="pricing-tab-indicator" />}
                </button>
              );
            }
          })}
        </div>
      </nav>

      {/* Footer Actions */}
      {onSave && (
        <div className="p-4 border-t border-sidebar-border">
          <Button
            onClick={onSave}
            disabled={isSaving}
            className="w-full bg-sidebar-primary hover:bg-sidebar-primary/90 text-sidebar-primary-foreground"
          >
            {isSaving ? (
              <>
                <div className="loading-spinner w-4 h-4 mr-2 border-2 border-white border-t-transparent rounded-full" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      )}
    </aside>
  );
}
