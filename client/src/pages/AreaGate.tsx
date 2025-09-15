import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import logo from "@/logo.png";

type Area = "pricing" | "quotations";
type Props = { area: Area; children: React.ReactNode };

const areaTitle: Record<Area, string> = {
  pricing: "Pricing Calculator",
  quotations: "Quotation Manager",
};

// local “unlocked” flags (so we don’t reprompt until logout)
const AUTH = { pricing: "tb_auth_pricing", quotations: "tb_auth_quotations" } as const;

export default function AreaGate({ area, children }: Props) {
  const [authed, setAuthed] = useState(false);
  const [pwd, setPwd] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setAuthed(localStorage.getItem(AUTH[area]) === "1");
  }, [area]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      const r = await fetch("/api/passwords/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ area, password: pwd }),
      });
      const data = await r.json();
      if (!r.ok || !data.ok) {
        setErr(data.message || "Incorrect password.");
      } else {
        localStorage.setItem(AUTH[area], "1");
        setAuthed(true);
      }
    } catch (e: any) {
      setErr(e?.message || "Network error");
    } finally {
      setBusy(false);
    }
  };

  const logout = () => {
    localStorage.removeItem(AUTH[area]);
    setAuthed(false);
    setPwd("");
  };

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
              <Input
                id="pwd"
                type="password"
                value={pwd}
                onChange={(e) => setPwd(e.target.value)}
                placeholder="••••••••"
                required
                autoFocus
              />
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
