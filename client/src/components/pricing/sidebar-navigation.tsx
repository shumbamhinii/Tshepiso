import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PricingTab, FinancialSubTab } from "@/types/pricing";
import {
  Settings,
  Package,
  FlaskConical,
  Users,
  Wallet,
  Camera,
  ArrowLeft,
  Save,
  BrainIcon,
  Folder,
  LayoutDashboard,
  BoxSelectIcon,
  Lock,
} from "lucide-react";
import { FileSpreadsheet } from "lucide-react";
import SuppliersTab from "./SuppliersTab";

// ---------- Password storage (client-only) ----------
type Area = "pricing" | "quotations";
const AUTH = { pricing: "tb_auth_pricing", quotations: "tb_auth_quotations" } as const;
const PWD  = { pricing: "tb_pwd_pricing", quotations: "tb_pwd_quotations" } as const;

function ensureDefaults() {
  if (!localStorage.getItem(PWD.pricing)) localStorage.setItem(PWD.pricing, "pricing123");
  if (!localStorage.getItem(PWD.quotations)) localStorage.setItem(PWD.quotations, "quotes123");
}
// ----------------------------------------------------

interface SidebarNavigationProps {
  activeTab: PricingTab;
  onTabChange: (mainTab: PricingTab, subTab?: FinancialSubTab) => void;
  onBack?: () => void;
  onSave?: () => void;
  isSaving?: boolean;
  activeFinancialSubTab?: FinancialSubTab;
}

// If your PricingTab type doesn’t include 'security', we cast to keep TS happy.
const SECURITY_TAB = "security" as unknown as PricingTab;

const tabs = [
  { id: 'dashboard'  as PricingTab, label: 'Dashboard',           icon: LayoutDashboard },
  { id: 'setup'      as PricingTab, label: 'Setup',               icon: Settings },
  { id: 'products'   as PricingTab, label: 'Pricing',             icon: Package },
  { id: 'suppliers'  as PricingTab, label: 'Suppliers',           icon: BoxSelectIcon  },
  { id: 'scenarios'  as PricingTab, label: 'What-If Scenarios',   icon: FlaskConical },
  { id: 'competitors'as PricingTab, label: 'Competitor Pricing',  icon: Users },
  { id: 'budget'     as PricingTab, label: 'Budget',              icon: Wallet },
  { id: 'snapshots'  as PricingTab, label: 'Snapshot Manager',    icon: Camera },
  { id: 'projects'   as PricingTab, label: 'Projects',            icon: Folder },
  { id: 'tenders'    as PricingTab, label: 'Tender Management',   icon: FileSpreadsheet },
  { id: 'pricingchat'as PricingTab, label: 'Pricing Chat',        icon: BrainIcon },

  // NEW: Change Passwords tab (client-only)
  { id: SECURITY_TAB,              label: 'Change Passwords',     icon: Lock },
];

export default function SidebarNavigation({
  activeTab,
  onTabChange,
  onBack,
  onSave,
  isSaving,
  activeFinancialSubTab
}: SidebarNavigationProps) {

  // Local state for the security tab
  const [pricingPwd, setPricingPwd] = useState("");
  const [quotesPwd, setQuotesPwd] = useState("");
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    // Ensure defaults exist on first load
    ensureDefaults();
  }, []);

  const savePwd = (area: Area, value: string) => {
    setStatus(null);
    if (!value || value.length < 4) {
      setStatus("Password too short (min 4 characters).");
      return;
    }
    localStorage.setItem(PWD[area], value);
    // Force re-login for that area next time
    localStorage.removeItem(AUTH[area]);
    setStatus(`Password updated for ${area}. Users must re-enter it next visit.`);
    if (area === "pricing") setPricingPwd("");
    if (area === "quotations") setQuotesPwd("");
  };

  const resetDefaults = () => {
    localStorage.setItem(PWD.pricing, "pricing123");
    localStorage.setItem(PWD.quotations, "quotes123");
    localStorage.removeItem(AUTH.pricing);
    localStorage.removeItem(AUTH.quotations);
    setStatus("Reset to defaults. You’ll be asked again next visit.");
  };

  const forceReprompt = () => {
    localStorage.removeItem(AUTH.pricing);
    localStorage.removeItem(AUTH.quotations);
    setStatus("Cleared unlock flags. You’ll be prompted again for both areas.");
  };

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
            const Icon = tab.icon as React.ComponentType<any>;
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id as string}
                onClick={() => onTabChange(tab.id)}
                className={`pricing-tab-button ${isActive ? 'active' : ''}`}
              >
                <Icon className="w-4 h-4 mr-3" />
                <span className="text-sm">{tab.label}</span>
                {isActive && <div className="pricing-tab-indicator" />}
              </button>
            );
          })}
        </div>

        {/* Inline content for the Change Passwords tab */}
        {activeTab === SECURITY_TAB && (
          <div className="mt-6 space-y-6 rounded-lg border border-sidebar-border p-4">
            <div>
              <h2 className="text-sm font-semibold mb-2 flex items-center gap-2">
                <Lock className="w-4 h-4" /> Change Passwords (client-only)
              </h2>
              <p className="text-xs text-muted-foreground">
                These passwords are stored in your browser’s localStorage for simplicity. For production-grade security, move them server-side.
              </p>
            </div>

            <div className="grid gap-4">
              <div className="space-y-2">
                <Label htmlFor="pricing_new">New Pricing Password</Label>
                <div className="flex gap-2">
                  <Input
                    id="pricing_new"
                    type="password"
                    value={pricingPwd}
                    onChange={(e) => setPricingPwd(e.target.value)}
                    placeholder="•••••••"
                  />
                  <Button onClick={() => savePwd("pricing", pricingPwd)}>Save</Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="quotes_new">New Quotations Password</Label>
                <div className="flex gap-2">
                  <Input
                    id="quotes_new"
                    type="password"
                    value={quotesPwd}
                    onChange={(e) => setQuotesPwd(e.target.value)}
                    placeholder="•••••••"
                  />
                  <Button onClick={() => savePwd("quotations", quotesPwd)}>Save</Button>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button variant="secondary" onClick={resetDefaults}>Reset to defaults</Button>
                <Button variant="ghost" onClick={forceReprompt}>Force re-prompt</Button>
              </div>

              {status && <p className="text-xs">{status}</p>}
            </div>
          </div>
        )}
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
