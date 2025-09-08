import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calculator, FileText, TrendingUp, Users, Shield, Settings, X } from "lucide-react";
import { useLocation } from "wouter";

type Area = "pricing" | "quotations";

const AUTH = { pricing: "tb_auth_pricing", quotations: "tb_auth_quotations" } as const;
const PWD  = { pricing: "tb_pwd_pricing", quotations: "tb_pwd_quotations" } as const;
const PATH = { pricing: "/pricing-calculator", quotations: "/quotations" } as const;

function ensureDefaults() {
  if (!localStorage.getItem(PWD.pricing)) localStorage.setItem(PWD.pricing, "pricing123");
  if (!localStorage.getItem(PWD.quotations)) localStorage.setItem(PWD.quotations, "quotes123");
}

export default function Home() {
  const [, navigate] = useLocation();

  const [showPrompt, setShowPrompt] = useState(false);
  const [activeArea, setActiveArea] = useState<Area | null>(null);
  const [pwd, setPwd] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [showSecurity, setShowSecurity] = useState(false);
  const [pricingPwd, setPricingPwd] = useState("");
  const [quotesPwd, setQuotesPwd] = useState("");
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    ensureDefaults();
  }, []);

  const isAuthed = (area: Area) => localStorage.getItem(AUTH[area]) === "1";

  const handleStart = (area: Area) => {
    setStatus(null);
    if (isAuthed(area)) {
      navigate(PATH[area]);
      return;
    }
    setActiveArea(area);
    setPwd("");
    setErr(null);
    setShowPrompt(true);
  };

  const handleSubmitPwd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeArea) return;
    setBusy(true);
    setErr(null);

    const expected = localStorage.getItem(PWD[activeArea]) || "";
    if (pwd === expected) {
      localStorage.setItem(AUTH[activeArea], "1");
      setShowPrompt(false);
      setBusy(false);
      navigate(PATH[activeArea]);
      return;
    }
    setErr("Incorrect password.");
    setBusy(false);
  };

  const logoutArea = () => {
    if (!activeArea) return;
    localStorage.removeItem(AUTH[activeArea]);
    setErr(null);
    setPwd("");
  };

  const savePwd = (area: Area, value: string) => {
    if (!value || value.length < 4) {
      setStatus("Password too short (min 4 chars).");
      return;
    }
    localStorage.setItem(PWD[area], value);
    localStorage.removeItem(AUTH[area]); // force re-login next time
    setStatus(`Password updated for ${area}. Users must re-enter it next visit.`);
    if (area === "pricing") setPricingPwd("");
    if (area === "quotations") setQuotesPwd("");
  };

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-orange-50 to-amber-50">
      {/* PASSWORD PROMPT MODAL */}
      {showPrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/30" onClick={() => setShowPrompt(false)} />
          <Card className="relative z-10 w-full max-w-md mx-4">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-amber-700 flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Enter Password · {activeArea === "pricing" ? "Pricing Calculator" : "Quotation Manager"}
                </CardTitle>
                <Button variant="ghost" size="icon" onClick={() => setShowPrompt(false)}>
                  <X className="h-5 w-5" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmitPwd} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="area_pwd">Password</Label>
                  <Input
                    id="area_pwd"
                    type="password"
                    value={pwd}
                    onChange={(e) => setPwd(e.target.value)}
                    placeholder="••••••••"
                    autoFocus
                    required
                  />
                </div>

                {err && <div className="text-sm text-red-600">{err}</div>}

                <div className="flex gap-2">
                  <Button type="submit" className="flex-1" disabled={busy}>
                    {busy ? "Checking..." : "Unlock"}
                  </Button>
                  <Button type="button" variant="secondary" onClick={logoutArea}>
                    Logout
                  </Button>
                </div>

                <p className="text-xs text-gray-500 text-center">
                  Protected · Tshepiso Branding Solutions
                </p>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {/* HEADER + CARDS */}
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <h1 className="text-6xl font-bold text-amber-600 mb-4">
            Tshepiso Branding Solutions
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Professional pricing calculator and quotation management system designed to help you optimize your business pricing strategy
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {/* PRICING */}
          <Card className="hover:shadow-xl transition-all duration-300 border-amber-200 bg-white/80 backdrop-blur-sm">
            <CardHeader className="text-center pb-4">
              <div className="mx-auto mb-4 p-3 bg-amber-100 rounded-full w-fit">
                <Calculator className="h-8 w-8 text-amber-600" />
              </div>
              <CardTitle className="text-2xl text-gray-800">Pricing Calculator</CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-gray-600 mb-6">
                Calculate optimal pricing for your products and services with advanced algorithms, competitor analysis, and profit optimization
              </p>
              <Button
                onClick={() => handleStart("pricing")}
                className="w-full bg-amber-600 hover:bg-amber-700 text-white py-3 text-lg font-semibold"
              >
                Start Calculating
              </Button>
            </CardContent>
          </Card>

          {/* QUOTATIONS */}
          <Card className="hover:shadow-xl transition-all duration-300 border-amber-200 bg-white/80 backdrop-blur-sm">
            <CardHeader className="text-center pb-4">
              <div className="mx-auto mb-4 p-3 bg-amber-100 rounded-full w-fit">
                <FileText className="h-8 w-8 text-amber-600" />
              </div>
              <CardTitle className="text-2xl text-gray-800">Quotation Manager</CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-gray-600 mb-6">
                Generate professional quotations for your clients with customizable templates and automated calculations
              </p>
              <Button
                onClick={() => handleStart("quotations")}
                className="w-full bg-amber-600 hover:bg-amber-700 text-white py-3 text-lg font-semibold"
              >
                Create Quotations
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* FEATURES */}
        <div className="mt-16 grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          <div className="text-center">
            <div className="mx-auto mb-4 p-3 bg-amber-100 rounded-full w-fit">
              <TrendingUp className="h-6 w-6 text-amber-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-800 mb-2">Smart Analytics</h3>
            <p className="text-gray-600">
              Get insights into your pricing performance with detailed analytics and reporting
            </p>
          </div>

          <div className="text-center">
            <div className="mx-auto mb-4 p-3 bg-amber-100 rounded-full w-fit">
              <Users className="h-6 w-6 text-amber-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-800 mb-2">Competitor Analysis</h3>
            <p className="text-gray-600">
              Track competitor pricing and get recommendations for competitive positioning
            </p>
          </div>

          <div className="text-center">
            <div className="mx-auto mb-4 p-3 bg-amber-100 rounded-full w-fit">
              <Calculator className="h-6 w-6 text-amber-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-800 mb-2">Scenario Planning</h3>
            <p className="text-gray-600">
              Test different pricing scenarios and budget allocations to optimize profitability
            </p>
          </div>
        </div>

        {/* SECURITY SETTINGS (CLIENT-ONLY) */}
        <div className="mt-16 max-w-4xl mx-auto">


          {showSecurity && (
            <Card className="mt-4">
    
              <CardContent className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
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
                      <Button onClick={() => savePwd("pricing", pricingPwd)}>
                        Save
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
                      <Button onClick={() => savePwd("quotations", quotesPwd)}>
                        Save
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2">


                </div>

                {status && <p className="text-sm">{status}</p>}
                <p className="text-xs text-gray-500">
                  Note: This version stores passwords in your browser’s localStorage for simplicity. For production-grade security, use a server-side store.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
