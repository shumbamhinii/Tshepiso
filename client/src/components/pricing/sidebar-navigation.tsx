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

// ---------- Auth flags (client-only unlock flags) ----------
type Area = "pricing" | "quotations";
const AUTH = { pricing: "tb_auth_pricing", quotations: "tb_auth_quotations" } as const;
// -----------------------------------------------------------

// Pull admin key from env (Vite-style). Fallback to empty string.
const ADMIN_KEY = "supersecretadminkey";

// Helper to call server route to set a password
async function setServerPassword(area: Area, newPassword: string) {
  const res = await fetch("/api/passwords/set", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-admin-key": ADMIN_KEY, // must match process.env.ADMIN_PANEL_KEY on server
    },
    body: JSON.stringify({ area, newPassword }),
  });
  if (!res.ok) {
    let msg = "Failed to set password";
    try {
      const j = await res.json();
      msg = j?.message || msg;
    } catch {}
    throw new Error(msg);
  }
  return res.json();
}

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
  { id: 'dashboard' as PricingTab, label: 'Dashboard', icon: LayoutDashboard },
  { id: 'setup' as PricingTab, label: 'Setup', icon: Settings },
  { id: 'products' as PricingTab, label: 'Pricing', icon: Package },
  { id: 'suppliers' as PricingTab, label: 'Suppliers', icon: BoxSelectIcon },
  { id: 'scenarios' as PricingTab, label: 'What-If Scenarios', icon: FlaskConical },
  { id: 'competitors' as PricingTab, label: 'Competitor Pricing', icon: Users },
  { id: 'budget' as PricingTab, label: 'Budget', icon: Wallet },
  { id: 'snapshots' as PricingTab, label: 'Snapshot Manager', icon: Camera },
  { id: 'projects' as PricingTab, label: 'Projects', icon: Folder },
  { id: 'tenders' as PricingTab, label: 'Tender Management', icon: FileSpreadsheet },
  { id: 'pricingchat' as PricingTab, label: 'Pricing Chat', icon: BrainIcon },

  // NEW: Change Passwords tab (server-backed)
  { id: SECURITY_TAB, label: 'Change Passwords', icon: Lock },
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
  const [busy, setBusy] = useState<null | "pricing" | "quotations" | "reset" | "reprompt">(null);

  // Provide a little warning if admin key is missing
  useEffect(() => {
    if (!ADMIN_KEY) {
      setStatus("Warning: VITE_ADMIN_PANEL_KEY is not configured; password changes will fail.");
    }
  }, []);

  const savePwd = async (area: Area, value: string) => {
    setStatus(null);
    if (!value || value.length < 6) {
      setStatus("Password too short (min 6 characters).");
      return;
    }
    try {
      setBusy(area);
      await setServerPassword(area, value);
      // Force re-login for that area next time by clearing client unlock flag
      localStorage.removeItem(AUTH[area]);
      setStatus(`Password updated for ${area}. Users must re-enter it next visit.`);
      if (area === "pricing") setPricingPwd("");
      if (area === "quotations") setQuotesPwd("");
    } catch (e: any) {
      setStatus(e?.message || "Failed to update password.");
    } finally {
      setBusy(null);
    }
  };

  const resetDefaults = async () => {
    setStatus(null);
    try {
      setBusy("reset");
      // Set both defaults on the server
      await setServerPassword("pricing", "pricing123");
      await setServerPassword("quotations", "quotes123");
      // Clear unlock flags locally so user is re-prompted
      localStorage.removeItem(AUTH.pricing);
      localStorage.removeItem(AUTH.quotations);
      setStatus("Reset to defaults on server. You’ll be asked again next visit.");
    } catch (e: any) {
      setStatus(e?.message || "Failed to reset defaults.");
    } finally {
      setBusy(null);
    }
  };

  const forceReprompt = () => {
    localStorage.removeItem(AUTH.pricing);
    localStorage.removeItem(AUTH.quotations);
    setStatus("Cleared local unlock flags. You’ll be prompted again for both areas.");
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
                <Lock className="w-4 h-4" /> Change Passwords
              </h2>
              <p className="text-xs text-muted-foreground">
                Passwords are stored server-side (DB). Updating here calls <code>/api/passwords/set</code>.
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
                  <Button
                    onClick={() => savePwd("pricing", pricingPwd)}
                    disabled={busy === "pricing" || !pricingPwd}
                  >
                    {busy === "pricing" ? "Saving..." : "Save"}
                  </Button>
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
                  <Button
                    onClick={() => savePwd("quotations", quotesPwd)}
                    disabled={busy === "quotations" || !quotesPwd}
                  >
                    {busy === "quotations" ? "Saving..." : "Save"}
                  </Button>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button variant="secondary" onClick={resetDefaults} disabled={busy === "reset"}>
                  {busy === "reset" ? "Resetting..." : "Reset to defaults"}
                </Button>
                <Button variant="ghost" onClick={forceReprompt} disabled={busy !== null}>
                  Force re-prompt
                </Button>
              </div>

              {status && <p className="text-xs">{status}</p>}
              {!ADMIN_KEY && (
                <p className="text-xs text-red-600">
                  Set <code>VITE_ADMIN_PANEL_KEY</code> in your frontend env to match the server’s <code>ADMIN_PANEL_KEY</code>.
                </p>
              )}
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