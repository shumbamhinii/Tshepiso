import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAreaPassword } from "@/hooks/useAreaPassword";
import logo from "@/logo.png";

type Props = {
  area: "pricing" | "quotations";
  children: React.ReactNode;
};

const areaTitle: Record<Props["area"], string> = {
  pricing: "Pricing Calculator",
  quotations: "Quotation Manager",
};

export default function AreaGate({ area, children }: Props) {
  const { authed, login, logout } = useAreaPassword(area);
  const [pwd, setPwd] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (authed) {
    return (
      <div className="min-h-screen">
        <div className="fixed top-3 right-3 flex gap-2">
          <Button variant="secondary" size="sm" onClick={logout}>Logout</Button>
        </div>
        {children}
      </div>
    );
  }

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    const res = login(pwd);
    if (!res.ok) setErr(res.message || "Failed");
    setBusy(false);
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-orange-50 to-amber-50">
      <Card className="w-full max-w-md mx-4">
        <CardHeader>
          <CardTitle className="text-center text-amber-700">
            <div className="flex flex-col items-center gap-3">
              <img src={logo} alt="Tshepiso Branding" className="h-14" />
              <span>Enter Password · {areaTitle[area]}</span>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="pwd">Password</Label>
              <Input id="pwd" type="password" value={pwd} onChange={(e) => setPwd(e.target.value)} placeholder="••••••••" required />
            </div>
            {err && <div className="text-sm text-red-600">{err}</div>}
            <Button type="submit" className="w-full" disabled={busy}>
              {busy ? "Checking..." : "Unlock"}
            </Button>
            <p className="text-xs text-gray-500 text-center">Protected · Tshepiso Branding Solutions</p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
