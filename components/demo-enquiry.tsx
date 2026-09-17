"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { getBrowserSupabase } from "@/lib/supabase";
import { friendlyAuthError, useAuth } from "@/components/auth-provider";

type Mode = "create" | "login";
type Role = "buyer" | "seller";
type Fields = { name: string; email: string; password: string; human: boolean; role?: Role };
type Errors = Partial<Record<keyof Fields, string>>;
const emptyFields: Fields = { name: "", email: "", password: "", human: false };
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function DemoEnquiry() {
  const { user, loading: authLoading, refreshProfile } = useAuth();
  const [open, setOpen] = useState(false); const [mode, setMode] = useState<Mode>("create");
  const [fields, setFields] = useState<Fields>(emptyFields); const [errors, setErrors] = useState<Errors>({});
  const [confirmed, setConfirmed] = useState(false); const [notice, setNotice] = useState(""); const [busy, setBusy] = useState(false);
  const firstField = useRef<HTMLInputElement>(null);
  useEffect(() => { if (!open || confirmed) return; firstField.current?.focus(); const onKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape" && !busy) close(); }; window.addEventListener("keydown", onKeyDown); return () => window.removeEventListener("keydown", onKeyDown); }, [open, mode, confirmed, busy]);
  function close() { if (busy) return; setOpen(false); setMode("create"); setFields(emptyFields); setErrors({}); setConfirmed(false); setNotice(""); }
  function selectMode(nextMode: Mode) { setMode(nextMode); setErrors({}); setNotice(""); }
  function openContact() { if (user) setConfirmed(true); setOpen(true); }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (busy) return; const nextErrors: Errors = {};
    if (mode === "create" && !fields.name.trim()) nextErrors.name = "Enter your name.";
    if (mode === "create" && !fields.role) nextErrors.role = "Choose how you'd like to use the marketplace.";
    if (!fields.email.trim()) nextErrors.email = "Enter your email address."; else if (!emailPattern.test(fields.email)) nextErrors.email = "Enter a valid email address.";
    if (!fields.password) nextErrors.password = "Enter a password."; else if (fields.password.length < 8) nextErrors.password = "Use at least 8 characters.";
    if (!fields.human) nextErrors.human = "Please confirm the demo human check.";
    setErrors(nextErrors); setNotice(""); if (Object.keys(nextErrors).length) return; setBusy(true);
    try {
      if (mode === "create") {
        const { data, error } = await getBrowserSupabase().auth.signUp({ email: fields.email.trim(), password: fields.password, options: { data: { display_name: fields.name.trim(), role: fields.role } } });
        if (error) { setNotice(friendlyAuthError(error.message)); return; }
        if (!data.session) { setNotice("Check your email to confirm your account, then log in to contact the seller."); return; }
        await refreshProfile(data.user);
      } else {
        const { data, error } = await getBrowserSupabase().auth.signInWithPassword({ email: fields.email.trim(), password: fields.password });
        if (error) { setNotice(friendlyAuthError(error.message)); return; }
        await refreshProfile(data.user);
      }
      setConfirmed(true);
    } catch { setNotice("We couldn’t complete that request. Please try again."); } finally { setBusy(false); }
  }
  return <div className="enquiry"><button className="button" type="button" onClick={openContact} disabled={authLoading}>Contact seller</button>{open && <div className="account-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) close(); }}><section className="account-modal" role="dialog" aria-modal="true" aria-labelledby="account-title"><button className="modal-close" type="button" onClick={close} aria-label="Close account prompt" disabled={busy}>×</button>{confirmed ? <div className="account-success"><h2 id="account-title">You&apos;re ready to contact the seller</h2><p>In the full marketplace, you could now send an enquiry to the seller.</p><button className="button" type="button" onClick={close}>Continue browsing</button><p className="demo-disclosure">Demo interaction — no message has been created.</p></div> : <><div className="eyebrow">Contact seller</div><h2 id="account-title">Create an account to contact this seller</h2><p className="account-intro">Create an account to send enquiries and keep track of your conversations.</p><div className="account-tabs" role="tablist" aria-label="Account option"><button type="button" role="tab" aria-selected={mode === "create"} className={mode === "create" ? "active" : ""} onClick={() => selectMode("create")} disabled={busy}>Create account</button><button type="button" role="tab" aria-selected={mode === "login"} className={mode === "login" ? "active" : ""} onClick={() => selectMode("login")} disabled={busy}>Log in</button></div><form className="account-form" onSubmit={submit} noValidate>{mode === "create" && <div className="form-field"><label htmlFor="demo-name">Name</label><input ref={firstField} id="demo-name" name="name" autoComplete="name" value={fields.name} onChange={(event) => setFields({ ...fields, name: event.target.value })} aria-invalid={Boolean(errors.name)}/>{errors.name && <p className="field-error">{errors.name}</p>}</div>}{mode === "create" && <fieldset className="role-field"><legend>What would you like to do?</legend><div className="role-options"><button type="button" className={fields.role === "buyer" ? "role-option selected" : "role-option"} onClick={() => setFields({ ...fields, role: "buyer" })} disabled={busy}><strong>BUY</strong><span>Shop pre-owned pieces and contact sellers.</span></button><button type="button" className={fields.role === "seller" ? "role-option selected" : "role-option"} onClick={() => setFields({ ...fields, role: "seller" })} disabled={busy}><strong>SELL</strong><span>List pieces and manage your listings.</span></button></div>{errors.role && <p className="field-error">{errors.role}</p>}</fieldset>}<div className="form-field"><label htmlFor="demo-email">Email</label><input ref={mode === "login" ? firstField : undefined} id="demo-email" name="email" type="email" autoComplete="email" value={fields.email} onChange={(event) => setFields({ ...fields, email: event.target.value })} aria-invalid={Boolean(errors.email)}/>{errors.email && <p className="field-error">{errors.email}</p>}</div><div className="form-field"><label htmlFor="demo-password">Password</label><input id="demo-password" name="password" type="password" autoComplete={mode === "create" ? "new-password" : "current-password"} value={fields.password} onChange={(event) => setFields({ ...fields, password: event.target.value })} aria-invalid={Boolean(errors.password)}/>{errors.password && <p className="field-error">{errors.password}</p>}</div><div className="human-check"><input id="demo-human" name="human" type="checkbox" checked={fields.human} onChange={(event) => setFields({ ...fields, human: event.target.checked })} aria-invalid={Boolean(errors.human)}/><label htmlFor="demo-human">I&apos;m human (demo check)</label></div>{errors.human && <p className="field-error">{errors.human}</p>}{notice && <p className="field-error" role="alert">{notice}</p>}<button className="button account-submit" type="submit" disabled={busy}>{busy ? "Please wait…" : mode === "create" ? "Create account & continue" : "Log in & continue"}</button></form><p className="demo-disclosure">The human check is a demo interaction. Account authentication is handled by Supabase.</p></>}</section></div>}</div>;
}
