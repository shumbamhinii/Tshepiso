// src/pages/SecuritySettings.tsx (client-only)
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const PWD  = { pricing: "tb_pwd_pricing", quotations: "tb_pwd_quotations" } as const;
const AUTH = { pricing: "tb_auth_pricing", quotations: "tb_auth_quotations" } as const;

export default function SecuritySettings() {
  const [pricingPwd, setPricingPwd]   = useState("");
  const [quotesPwd, setQuotesPwd]     = useState("");
  const [status, setStatus]           = useState<string | null>(null);

  const save = (area: "pricing" | "quotations", value: string) => {
    if (!value || value.length < 4) { setStatus("Min 4 characters."); return; }
    localStorage.setItem(PWD[area], value);
    localStorage.removeItem(AUTH[area]); // force re-login for that area
    setStatus(`Password updated for ${area}. Users must re-enter it next time.`);
  };

  const resetDefaults = () => {
    localStorage.setItem(PWD.pricing, "pricing123");
    localStorage.setItem(PWD.quotations, "quotes123");
    localStorage.removeItem(AUTH.pricing);
    localStorage.removeItem(AUTH.quotations);
    setStatus("Reset to defaults. You’ll be asked again on next visit.");
  };

  return (
    <div className="container mx-auto p-6">
      <Card className="max-w-2xl mx-auto">
        <CardHeader><CardTitle>Security Settings</CardTitle></CardHeader>
        <CardContent className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label>New Pricing Password</Label>
              <div className="flex gap-2">
                <Input type="password" value={pricingPwd} onChange={e => setPricingPwd(e.target.value)} placeholder="•••••••" />
                <Button onClick={() => save("pricing", pricingPwd)}>Save</Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label>New Quotations Password</Label>
              <div className="flex gap-2">
                <Input type="password" value={quotesPwd} onChange={e => setQuotesPwd(e.target.value)} placeholder="•••••••" />
                <Button onClick={() => save("quotations", quotesPwd)}>Save</Button>
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <Button variant="secondary" onClick={resetDefaults}>Reset to defaults</Button>
          </div>

          {status && <p className="text-sm">{status}</p>}
        </CardContent>
      </Card>
    </div>
  );
}
