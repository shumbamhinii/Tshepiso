// src/hooks/useAreaPassword.ts (client-only)
import { useEffect, useState } from "react";

const AUTH = { pricing: "tb_auth_pricing", quotations: "tb_auth_quotations" } as const;
const PWD  = { pricing: "tb_pwd_pricing", quotations: "tb_pwd_quotations" } as const;

type Area = keyof typeof AUTH;

function ensureDefaults() {
  if (!localStorage.getItem(PWD.pricing)) localStorage.setItem(PWD.pricing, "pricing123");
  if (!localStorage.getItem(PWD.quotations)) localStorage.setItem(PWD.quotations, "quotes123");
}

export function useAreaPassword(area: Area) {
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    ensureDefaults();
    setAuthed(localStorage.getItem(AUTH[area]) === "1");
  }, [area]);

  const login = async (password: string) => {
    const expected = localStorage.getItem(PWD[area]) || "";
    if (password === expected) {
      localStorage.setItem(AUTH[area], "1");
      setAuthed(true);
      return { ok: true as const };
    }
    return { ok: false as const, message: "Incorrect password." };
  };

  const logout = () => {
    localStorage.removeItem(AUTH[area]);
    setAuthed(false);
  };

  const changePassword = (newPwd: string) => {
    localStorage.setItem(PWD[area], newPwd);
    // Force re-login after change:
    localStorage.removeItem(AUTH[area]);
    setAuthed(false);
  };

  return { authed, login, logout, changePassword };
}
