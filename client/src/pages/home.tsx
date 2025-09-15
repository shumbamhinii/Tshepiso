import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calculator, FileText, TrendingUp, Users, Shield, X } from "lucide-react";
import { useLocation } from "wouter";

type Area = "pricing" | "quotations";
const PATH: Record<Area, string> = {
  pricing: "/pricing-calculator",
  quotations: "/quotations",
};

export default function Home() {
  const [, navigate] = useLocation();

  const [showPrompt, setShowPrompt] = useState(false);
  const [activeArea, setActiveArea] = useState<Area | null>(null);
  const [pwd, setPwd] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const handleStart = (area: Area) => {
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

    try {
      const r = await fetch("/api/passwords/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ area: activeArea, password: pwd }),
      });
      const data = await r.json();
      if (!r.ok || !data.ok) {
        setErr(data.message || "Incorrect password.");
      } else {
        setShowPrompt(false);
        navigate(PATH[activeArea]);
      }
    } catch (e: any) {
      setErr(e.message || "Network error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-orange-50 to-amber-50">
      {/* PASSWORD PROMPT */}
      {showPrompt && activeArea && (
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
                  <Label>Password</Label>
                  <Input
                    type="password"
                    value={pwd}
                    onChange={(e) => setPwd(e.target.value)}
                    placeholder="••••••••"
                    autoFocus
                    required
                  />
                </div>
                {err && <div className="text-sm text-red-600">{err}</div>}
                <Button type="submit" className="w-full" disabled={busy}>
                  {busy ? "Checking..." : "Unlock"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {/* MAIN HOME CONTENT */}
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <h1 className="text-6xl font-bold text-amber-600 mb-4">Tshepiso Branding Solutions</h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Professional pricing calculator and quotation management system designed to help you optimize your business pricing strategy
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {/* Pricing */}
          <Card className="hover:shadow-xl transition-all duration-300 border-amber-200 bg-white/80 backdrop-blur-sm">
            <CardHeader className="text-center pb-4">
              <div className="mx-auto mb-4 p-3 bg-amber-100 rounded-full w-fit">
                <Calculator className="h-8 w-8 text-amber-600" />
              </div>
              <CardTitle className="text-2xl text-gray-800">Pricing Calculator</CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-gray-600 mb-6">Calculate optimal pricing for your products and services.</p>
              <Button
                onClick={() => handleStart("pricing")}
                className="w-full bg-amber-600 hover:bg-amber-700 text-white py-3 text-lg font-semibold"
              >
                Start Calculating
              </Button>
            </CardContent>
          </Card>

          {/* Quotations */}
          <Card className="hover:shadow-xl transition-all duration-300 border-amber-200 bg-white/80 backdrop-blur-sm">
            <CardHeader className="text-center pb-4">
              <div className="mx-auto mb-4 p-3 bg-amber-100 rounded-full w-fit">
                <FileText className="h-8 w-8 text-amber-600" />
              </div>
              <CardTitle className="text-2xl text-gray-800">Quotation Manager</CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-gray-600 mb-6">Generate professional quotations for your clients.</p>
              <Button
                onClick={() => handleStart("quotations")}
                className="w-full bg-amber-600 hover:bg-amber-700 text-white py-3 text-lg font-semibold"
              >
                Create Quotations
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Features */}
        <div className="mt-16 grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          <div className="text-center">
            <div className="mx-auto mb-4 p-3 bg-amber-100 rounded-full w-fit">
              <TrendingUp className="h-6 w-6 text-amber-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-800 mb-2">Smart Analytics</h3>
            <p className="text-gray-600">Get insights into your pricing performance with detailed analytics.</p>
          </div>

          <div className="text-center">
            <div className="mx-auto mb-4 p-3 bg-amber-100 rounded-full w-fit">
              <Users className="h-6 w-6 text-amber-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-800 mb-2">Competitor Analysis</h3>
            <p className="text-gray-600">Track competitor pricing and get recommendations.</p>
          </div>

          <div className="text-center">
            <div className="mx-auto mb-4 p-3 bg-amber-100 rounded-full w-fit">
              <Calculator className="h-6 w-6 text-amber-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-800 mb-2">Scenario Planning</h3>
            <p className="text-gray-600">Test different pricing scenarios to optimize profitability.</p>
          </div>
        </div>
      </div>
    </div>
  );
}