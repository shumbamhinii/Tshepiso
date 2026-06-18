// components/pricing/sidebar-navigation.tsx
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
  FileSpreadsheet,
  Hammer,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

// ── Auth ──────────────────────────────────────────────────────────────
type Area = "pricing" | "quotations";
const AUTH = { pricing: "tb_auth_pricing", quotations: "tb_auth_quotations" } as const;
const ADMIN_KEY = "supersecretadminkey";

async function setServerPassword(area: Area, newPassword: string) {
  const res = await fetch("/api/passwords/set", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-admin-key": ADMIN_KEY },
    body: JSON.stringify({ area, newPassword }),
  });
  if (!res.ok) {
    let msg = "Failed to set password";
    try { const j = await res.json(); msg = j?.message || msg; } catch {}
    throw new Error(msg);
  }
  return res.json();
}

// ── Nav structure ─────────────────────────────────────────────────────

type NavSection = {
  label: string;
  items: Array<{ id: PricingTab | "security"; label: string; icon: React.ComponentType<any>; badge?: string }>;
};

const SECURITY_TAB = "security" as unknown as PricingTab;

const NAV: NavSection[] = [
  {
    label: "Quoting",
    items: [
      { id: "quote-builder" as PricingTab, label: "Build a Quote",   icon: Hammer,        badge: "new" },
      { id: "snapshots"     as PricingTab, label: "Saved Quotes",    icon: Camera },
      { id: "tenders"       as PricingTab, label: "Tender Pricing",  icon: FileSpreadsheet },
    ],
  },
  {
    label: "My Business",
    items: [
      { id: "setup"    as PricingTab, label: "My Monthly Costs",   icon: Settings },
      { id: "products" as PricingTab, label: "Product Pricing",    icon: Package },
      { id: "suppliers"as PricingTab, label: "Suppliers",          icon: BoxSelectIcon },
    ],
  },
  {
    label: "Reports & Analysis",
    items: [
      { id: "dashboard"   as PricingTab, label: "Dashboard",           icon: LayoutDashboard },
      { id: "scenarios"   as PricingTab, label: "Pricing Scenarios",   icon: FlaskConical },
      { id: "competitors" as PricingTab, label: "Competitor Prices",   icon: Users },
      { id: "budget"      as PricingTab, label: "Budget",              icon: Wallet },
    ],
  },
  {
    label: "Business Admin",
    items: [
      { id: "projects"            as PricingTab, label: "Projects",      icon: Folder },
      { id: "financial-management"as PricingTab, label: "Financials",    icon: Wallet },
    ],
  },
  {
    label: "Settings",
    items: [
      { id: "pricingchat" as PricingTab, label: "AI Pricing Help",   icon: BrainIcon },
      { id: SECURITY_TAB,                label: "Change Passwords",   icon: Lock },
    ],
  },
];

// ── Props ─────────────────────────────────────────────────────────────

interface SidebarNavigationProps {
  activeTab: PricingTab;
  onTabChange: (mainTab: PricingTab, subTab?: FinancialSubTab) => void;
  onBack?: () => void;
  onSave?: () => void;
  isSaving?: boolean;
  activeFinancialSubTab?: FinancialSubTab;
}

export default function SidebarNavigation({
  activeTab,
  onTabChange,
  onBack,
  onSave,
  isSaving,
}: SidebarNavigationProps) {
  const [collapsed,  setCollapsed]  = useState(false);
  const [pricingPwd, setPricingPwd] = useState("");
  const [quotesPwd,  setQuotesPwd]  = useState("");
  const [status,     setStatus]     = useState<string | null>(null);
  const [busy,       setBusy]       = useState<null | "pricing" | "quotations" | "reset" | "reprompt">(null);

  useEffect(() => {
    if (!ADMIN_KEY) setStatus("Warning: VITE_ADMIN_PANEL_KEY is not configured.");
  }, []);

  const savePwd = async (area: Area, value: string) => {
    setStatus(null);
    if (!value || value.length < 6) { setStatus("Password too short (min 6 characters)."); return; }
    try {
      setBusy(area);
      await setServerPassword(area, value);
      localStorage.removeItem(AUTH[area]);
      setStatus(`Password updated for ${area}. Users must re-enter it next visit.`);
      if (area === "pricing")    setPricingPwd("");
      if (area === "quotations") setQuotesPwd("");
    } catch (e: any) { setStatus(e?.message || "Failed to update password."); }
    finally { setBusy(null); }
  };

  const resetDefaults = async () => {
    setStatus(null);
    try {
      setBusy("reset");
      await setServerPassword("pricing",    "pricing123");
      await setServerPassword("quotations", "quotes123");
      localStorage.removeItem(AUTH.pricing);
      localStorage.removeItem(AUTH.quotations);
      setStatus("Reset to defaults. You'll be asked again next visit.");
    } catch (e: any) { setStatus(e?.message || "Failed to reset defaults."); }
    finally { setBusy(null); }
  };

  const forceReprompt = () => {
    localStorage.removeItem(AUTH.pricing);
    localStorage.removeItem(AUTH.quotations);
    setStatus("Cleared local unlock flags.");
  };

  const isSecurityActive = (activeTab as string) === "security";

  return (
    <aside
      className={`flex flex-col bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 shadow-sm transition-all duration-200 ${collapsed ? "w-16" : "w-64"}`}
      style={{ minHeight: "100vh" }}
    >
      {/* ── Header ── */}
      <div className={`border-b border-gray-200 dark:border-gray-800 flex items-center ${collapsed ? "px-3 py-4 justify-center" : "p-4"}`}>
        {!collapsed && (
          <div className="flex-1 min-w-0">
            {onBack && (
              <button onClick={onBack} className="flex items-center text-xs text-muted-foreground hover:text-foreground mb-3 gap-1">
                <ArrowLeft className="w-3 h-3" /> Back to Home
              </button>
            )}
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-md bg-primary flex items-center justify-center flex-shrink-0">
                <span className="text-primary-foreground font-bold text-xs">TB</span>
              </div>
              <div className="min-w-0">
                <div className="text-sm font-bold text-foreground leading-tight truncate">Tshepiso</div>
                <div className="text-xs text-muted-foreground leading-tight">Branding Solutions</div>
              </div>
            </div>
          </div>
        )}
        {collapsed && (
          <div className="w-7 h-7 rounded-md bg-primary flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-xs">TB</span>
          </div>
        )}
        <button
          onClick={() => setCollapsed(c => !c)}
          className="ml-auto flex-shrink-0 w-6 h-6 rounded hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center justify-center text-muted-foreground"
        >
          {collapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* ── Nav ── */}
      <nav className="flex-1 overflow-y-auto py-3 px-2">
        {NAV.map((section) => (
          <div key={section.label} className="mb-3">
            {!collapsed && (
              <div className="px-2 mb-1 text-[10px] font-semibold tracking-widest text-muted-foreground/70 uppercase">
                {section.label}
              </div>
            )}
            {section.items.map((item) => {
              const Icon = item.icon;
              const isActive = (activeTab as string) === item.id || (isSecurityActive && item.id === SECURITY_TAB);
              return (
                <button
                  key={item.id as string}
                  title={collapsed ? item.label : undefined}
                  onClick={() => onTabChange(item.id as PricingTab)}
                  className={`w-full flex items-center gap-3 px-2 py-2 rounded-lg text-left transition-all duration-150 mb-0.5 relative group
                    ${isActive
                      ? "bg-amber-100 dark:bg-amber-900/25 text-amber-700 dark:text-amber-400 font-medium"
                      : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-200"
                    }
                    ${collapsed ? "justify-center" : ""}`}
                >
                  <Icon className={`w-4 h-4 flex-shrink-0 ${isActive ? "text-amber-600 dark:text-amber-400" : ""}`} />
                  {!collapsed && (
                    <>
                      <span className="text-sm flex-1 truncate">{item.label}</span>
                      {item.badge === "new" && (
                        <span className="text-[9px] font-bold bg-primary text-primary-foreground rounded px-1 py-0.5 leading-none">NEW</span>
                      )}
                      {isActive && <div className="absolute right-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-amber-600 dark:bg-amber-400 rounded-full" />}
                    </>
                  )}
                  {collapsed && item.badge === "new" && (
                    <span className="absolute top-0 right-0 w-2 h-2 bg-primary rounded-full" />
                  )}
                </button>
              );
            })}
            {!collapsed && <div className="mx-2 my-2 border-b border-gray-100 dark:border-gray-800" />}
          </div>
        ))}

        {/* ── Security panel (inline) ── */}
        {isSecurityActive && !collapsed && (
          <div className="mx-1 mt-2 space-y-4 rounded-lg border border-gray-200 dark:border-gray-700 p-3">
            <div>
              <h2 className="text-xs font-semibold mb-1 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5" /> Change Passwords
              </h2>
              <p className="text-[10px] text-muted-foreground">Stored server-side. Calls /api/passwords/set.</p>
            </div>
            <div className="space-y-2">
              <Label className="text-xs">New Pricing Password</Label>
              <div className="flex gap-1.5">
                <Input type="password" value={pricingPwd} onChange={e => setPricingPwd(e.target.value)} placeholder="••••••" className="h-7 text-xs" />
                <Button onClick={() => savePwd("pricing", pricingPwd)} disabled={busy === "pricing" || !pricingPwd} size="sm" className="h-7 px-2 text-xs">
                  {busy === "pricing" ? "…" : "Save"}
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-xs">New Quotations Password</Label>
              <div className="flex gap-1.5">
                <Input type="password" value={quotesPwd} onChange={e => setQuotesPwd(e.target.value)} placeholder="••••••" className="h-7 text-xs" />
                <Button onClick={() => savePwd("quotations", quotesPwd)} disabled={busy === "quotations" || !quotesPwd} size="sm" className="h-7 px-2 text-xs">
                  {busy === "quotations" ? "…" : "Save"}
                </Button>
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5">
              <Button variant="secondary" onClick={resetDefaults} disabled={busy === "reset"} size="sm" className="h-7 text-xs">
                {busy === "reset" ? "Resetting…" : "Reset defaults"}
              </Button>
              <Button variant="ghost" onClick={forceReprompt} disabled={busy !== null} size="sm" className="h-7 text-xs">
                Force re-prompt
              </Button>
            </div>
            {status && <p className="text-[10px] text-muted-foreground">{status}</p>}
          </div>
        )}
      </nav>

      {/* ── Footer save button ── */}
      {onSave && !collapsed && (
        <div className="p-3 border-t border-gray-200 dark:border-gray-800">
          <Button onClick={onSave} disabled={isSaving} className="w-full h-8 text-sm gap-2">
            {isSaving ? (
              <><div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" /> Saving…</>
            ) : (
              <><Save className="w-3.5 h-3.5" /> Save Changes</>
            )}
          </Button>
        </div>
      )}

      {collapsed && onSave && (
        <div className="p-2 border-t border-gray-200 dark:border-gray-800">
          <button
            title="Save Changes"
            onClick={onSave}
            disabled={isSaving}
            className="w-10 h-10 rounded-lg bg-primary hover:bg-primary/90 flex items-center justify-center mx-auto"
          >
            <Save className="w-4 h-4 text-primary-foreground" />
          </button>
        </div>
      )}
    </aside>
  );
}
