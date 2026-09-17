"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { getBrowserSupabase } from "@/lib/supabase";
import { friendlyAuthError, useAuth } from "@/components/auth-provider";

type Stage = "account" | "workspace" | "form" | "preview" | "success";
type Account = { name: string; email: string; password: string; human: boolean; role?: "buyer" | "seller" };
type Listing = { brand: string; name: string; price: string; condition: string; colour: string; category: string; description: string; material: string; style: string; occasion: string };
type PhotoAngle = "front" | "back" | "side";
type Images = Record<PhotoAngle, string>;
type ImageFiles = Record<PhotoAngle, File | null>;
type Errors = Partial<Record<keyof Account | keyof Listing | "images", string>>;
const blankAccount: Account = { name: "", email: "", password: "", human: false };
const blankListing: Listing = { brand: "", name: "", price: "", condition: "", colour: "", category: "", description: "", material: "", style: "", occasion: "" };
const blankImages: Images = { front: "", back: "", side: "" };
const blankImageFiles: ImageFiles = { front: null, back: null, side: null };
const photoSlots: { angle: PhotoAngle; label: string }[] = [{ angle: "front", label: "Front image" }, { angle: "back", label: "Back image" }, { angle: "side", label: "Side image" }];
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const maxImageBytes = 5 * 1024 * 1024;
const imageExtensions: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };
const categoryValues: Record<string, string> = { "Shoulder bag": "Shoulder Bag", "Top handle": "Top Handle", Tote: "Tote", Crossbody: "Crossbody", Clutch: "Clutch" };
const conditionValues: Record<string, string> = { Excellent: "Excellent", "Very good": "Very Good", Good: "Good" };

export function SellerWorkspace() {
  const router = useRouter();
  const { user, profile, loading: authLoading, refreshProfile } = useAuth();
  const [stage, setStage] = useState<Stage>("account");
  const [mode, setMode] = useState<"create" | "login">("create");
  const [account, setAccount] = useState<Account>(blankAccount);
  const [listing, setListing] = useState<Listing>(blankListing);
  const [errors, setErrors] = useState<Errors>({});
  const [images, setImages] = useState<Images>(blankImages);
  const [imageFiles, setImageFiles] = useState<ImageFiles>(blankImageFiles);
  const [authNotice, setAuthNotice] = useState("");
  const [authBusy, setAuthBusy] = useState(false);
  const [submissionBusy, setSubmissionBusy] = useState(false);
  const [submissionNotice, setSubmissionNotice] = useState("");
  const first = useRef<HTMLInputElement>(null);

  useEffect(() => { first.current?.focus(); }, [stage, mode]);
  useEffect(() => {
    if (authLoading || !user) return;
    if (profile?.role === "seller") setStage("workspace");
    else if (profile?.role === "buyer") setAuthNotice("This account is registered as a buyer. Seller workspace access requires a seller account.");
  }, [authLoading, user, profile]);
  const imageUrls = useRef(images);
  useEffect(() => { imageUrls.current = images; }, [images]);
  useEffect(() => () => Object.values(imageUrls.current).filter(Boolean).forEach(URL.revokeObjectURL), []);
  const formattedPrice = useMemo(() => listing.price ? `S$${Number(listing.price).toLocaleString("en-SG", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}` : "S$0", [listing.price]);
  const hasAllImages = Object.values(imageFiles).every(Boolean);

  function updateListing(key: keyof Listing, value: string) { setListing({ ...listing, [key]: value }); }
  async function submitAccount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const next: Errors = {};
    if (mode === "create" && !account.name.trim()) next.name = "Enter your name.";
    if (mode === "create" && !account.role) next.role = "Choose how you'd like to use the marketplace.";
    if (!account.email.trim() || !emailPattern.test(account.email)) next.email = "Enter a valid email address.";
    if (!account.password || account.password.length < 8) next.password = "Use at least 8 characters.";
    if (!account.human) next.human = "Please confirm the demo human check.";
    setErrors(next); setAuthNotice(""); if (Object.keys(next).length || authBusy) return;
    setAuthBusy(true);
    try {
      if (mode === "create") {
        const { data, error } = await getBrowserSupabase().auth.signUp({ email: account.email.trim(), password: account.password, options: { data: { display_name: account.name.trim(), role: account.role } } });
        if (error) { setAuthNotice(friendlyAuthError(error.message)); return; }
        if (!data.session) { setAuthNotice("Check your email to confirm your account, then log in to access the seller workspace."); return; }
        const nextProfile = await refreshProfile(data.user);
        if (nextProfile?.role === "seller") setStage("workspace"); else router.push("/");
      } else {
        const { data, error } = await getBrowserSupabase().auth.signInWithPassword({ email: account.email.trim(), password: account.password });
        if (error) { setAuthNotice(friendlyAuthError(error.message)); return; }
        const nextProfile = await refreshProfile(data.user);
        if (nextProfile?.role === "seller") setStage("workspace"); else setAuthNotice("This account is registered as a buyer. Seller workspace access requires a seller account.");
      }
    } catch { setAuthNotice("We couldn’t complete that request. Please try again."); } finally { setAuthBusy(false); }
  }
  function submitListing(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const next: Errors = {};
    (["brand", "name", "price", "condition", "colour", "category", "description"] as (keyof Listing)[]).forEach((key) => { if (!listing[key].trim()) next[key] = "This field is required."; });
    const price = Number(listing.price);
    if (listing.price && (!Number.isFinite(price) || price <= 0)) next.price = "Enter a price greater than S$0.";
    if (price > 5000) next.price = "The marketplace catalogue is capped at S$5,000.";
    if (!hasAllImages) next.images = "Upload a front, back, and side image to continue.";
    setErrors(next); if (!Object.keys(next).length) setStage("preview");
  }
  function chooseImage(angle: PhotoAngle, file: File | undefined) {
    if (!file) return;
    if (!imageExtensions[file.type]) { setErrors((current) => ({ ...current, images: "Use a JPEG, PNG, or WebP image." })); return; }
    if (file.size > maxImageBytes) { setErrors((current) => ({ ...current, images: "Each image must be 5 MB or smaller." })); return; }
    if (images[angle]) URL.revokeObjectURL(images[angle]);
    setImages({ ...images, [angle]: URL.createObjectURL(file) });
    setImageFiles({ ...imageFiles, [angle]: file });
    setErrors(({ images: _images, ...rest }) => rest);
  }
  function resetToWorkspace() { Object.values(images).filter(Boolean).forEach(URL.revokeObjectURL); setImages(blankImages); setImageFiles(blankImageFiles); setListing(blankListing); setErrors({}); setSubmissionNotice(""); setStage("workspace"); }
  function slugPart(value: string) { return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 72); }
  function searchDocument() { return [listing.brand, listing.name, categoryValues[listing.category], conditionValues[listing.condition], listing.colour, listing.material, listing.style, listing.occasion, listing.description].filter(Boolean).join(". "); }

  async function submitPersistentListing() {
    if (submissionBusy || !user || profile?.role !== "seller") { setSubmissionNotice("Your seller session is no longer available. Please log in again."); return; }
    const files = photoSlots.map(({ angle }) => imageFiles[angle]);
    if (files.some((file) => !file) || files.some((file) => !file || !imageExtensions[file.type] || file.size > maxImageBytes)) { setSubmissionNotice("Choose one JPEG, PNG, or WebP image up to 5 MB for each required angle."); return; }
    const listingId = crypto.randomUUID();
    const paths = photoSlots.map(({ angle }, index) => `${user.id}/${listingId}/${angle}.${imageExtensions[files[index]!.type]}`);
    const supabase = getBrowserSupabase();
    const uploaded: string[] = [];
    setSubmissionBusy(true); setSubmissionNotice("");
    try {
      for (let index = 0; index < paths.length; index += 1) {
        const file = files[index]!;
        const { error } = await supabase.storage.from("seller-submissions").upload(paths[index], file, { contentType: file.type, upsert: false });
        if (error) throw error;
        uploaded.push(paths[index]);
      }
      const slugBase = slugPart(`${listing.brand}-${listing.name}`) || "seller-listing";
      const { error } = await supabase.from("products").insert({
        id: listingId,
        slug: `${slugBase}-${listingId}`,
        brand: listing.brand.trim(),
        model: listing.name.trim(),
        title: `${listing.brand.trim()} ${listing.name.trim()}`,
        category: categoryValues[listing.category],
        price_cents: Math.round(Number(listing.price) * 100),
        condition: conditionValues[listing.condition],
        description: listing.description.trim(),
        colour: listing.colour.trim(),
        material: listing.material.trim() || null,
        style_tags: listing.style.trim() ? [listing.style.trim()] : [],
        occasion_tags: listing.occasion.trim() ? [listing.occasion.trim()] : [],
        seller_name: profile.display_name,
        image_urls: [],
        pending_image_paths: paths,
        is_available: true,
        search_document: searchDocument(),
        seller_id: user.id,
        moderation_status: "under_review"
      });
      if (error) throw error;
      setStage("success");
    } catch {
      if (uploaded.length) await supabase.storage.from("seller-submissions").remove(uploaded);
      setSubmissionNotice("We couldn’t submit your listing. Your images were not kept; please try again.");
    } finally { setSubmissionBusy(false); }
  }

  if (stage === "account") return <section className="seller-auth">
    <div className="eyebrow">Seller access</div><h1>Create an account to sell</h1><p className="seller-lede">Set up an account to prepare a listing for the marketplace.</p>
    <div className="account-tabs" role="tablist"><button type="button" className={mode === "create" ? "active" : ""} onClick={() => { setMode("create"); setErrors({}); setAuthNotice(""); }} disabled={authBusy}>Create account</button><button type="button" className={mode === "login" ? "active" : ""} onClick={() => { setMode("login"); setErrors({}); setAuthNotice(""); }} disabled={authBusy}>Log in</button></div>
    <form className="account-form" onSubmit={submitAccount} noValidate>
      {mode === "create" && <div className="form-field"><label htmlFor="seller-name">Name</label><input ref={first} id="seller-name" value={account.name} autoComplete="name" onChange={(e) => setAccount({ ...account, name: e.target.value })} aria-invalid={Boolean(errors.name)} />{errors.name && <p className="field-error">{errors.name}</p>}</div>}
      {mode === "create" && <fieldset className="role-field"><legend>What would you like to do?</legend><div className="role-options"><button type="button" className={account.role === "buyer" ? "role-option selected" : "role-option"} onClick={() => setAccount({ ...account, role: "buyer" })} disabled={authBusy}><strong>BUY</strong><span>Shop pre-owned pieces and contact sellers.</span></button><button type="button" className={account.role === "seller" ? "role-option selected" : "role-option"} onClick={() => setAccount({ ...account, role: "seller" })} disabled={authBusy}><strong>SELL</strong><span>List pieces and manage your listings.</span></button></div>{errors.role && <p className="field-error">{errors.role}</p>}</fieldset>}
      <div className="form-field"><label htmlFor="seller-email">Email</label><input ref={mode === "login" ? first : undefined} id="seller-email" type="email" autoComplete="email" value={account.email} onChange={(e) => setAccount({ ...account, email: e.target.value })} aria-invalid={Boolean(errors.email)} />{errors.email && <p className="field-error">{errors.email}</p>}</div>
      <div className="form-field"><label htmlFor="seller-password">Password</label><input id="seller-password" type="password" autoComplete={mode === "create" ? "new-password" : "current-password"} value={account.password} onChange={(e) => setAccount({ ...account, password: e.target.value })} aria-invalid={Boolean(errors.password)} />{errors.password && <p className="field-error">{errors.password}</p>}</div>
      <div className="human-check"><input id="seller-human" type="checkbox" checked={account.human} onChange={(e) => setAccount({ ...account, human: e.target.checked })} /><label htmlFor="seller-human">I&apos;m human (demo check)</label></div>{errors.human && <p className="field-error">{errors.human}</p>}{authNotice && <p className="field-error" role="alert">{authNotice}</p>}
      <button className="button account-submit" disabled={authBusy}>{authBusy ? "Please wait…" : mode === "create" ? "Create account & continue" : "Log in & continue"}</button>
    </form><p className="demo-disclosure">The human check is a demo interaction. Account authentication is handled by Supabase.</p>
  </section>;

  if (stage === "workspace") return <section className="seller-dashboard"><div className="eyebrow">Seller workspace</div><h1>Your listings</h1><p className="seller-lede">Manage the pieces you&apos;re preparing for the marketplace.</p><div className="seller-empty"><h2>No listings yet</h2><p>Create a listing for moderation before it appears in the marketplace.</p><button className="button" onClick={() => setStage("form")}>+ List an item</button></div><Link className="return-link" href="/">← Return to marketplace</Link></section>;

  if (stage === "success") return <section className="seller-success"><div className="eyebrow">Listing submitted</div><h1>Listing submitted — Under review</h1><p>Your listing and images will be reviewed before appearing in the marketplace.</p><button className="button" onClick={resetToWorkspace}>Return to seller workspace</button><p className="demo-disclosure">Automated image review is not implemented.</p></section>;

  if (stage === "preview") return <section className="listing-preview"><div className="eyebrow">Listing preview</div><div className="preview-actions"><h1>How your piece could appear</h1><button className="text-button" onClick={() => setStage("form")} disabled={submissionBusy}>Edit listing</button></div><div className="preview-card"><div className="preview-image">{images.front ? <img src={images.front} alt={`Front preview of ${listing.name}`} /> : <span>Photo preview</span>}<small>3 photos selected</small></div><div><div className="card-brand">{listing.brand}</div><h2>{listing.name}</h2><p className="price">{formattedPrice}</p><p className="meta">{listing.condition} · {listing.colour} · {listing.category}</p><p className="preview-description">{listing.description}</p>{(listing.material || listing.style || listing.occasion) && <div className="tags">{listing.material && <span className="tag">{listing.material}</span>}{listing.style && <span className="tag">{listing.style}</span>}{listing.occasion && <span className="tag">Best for {listing.occasion}</span>}</div>}</div></div><div className="notice">This is a private preview and will not appear in the marketplace catalogue.</div>{submissionNotice && <p className="field-error" role="alert">{submissionNotice}</p>}<button className="button" onClick={submitPersistentListing} disabled={submissionBusy}>{submissionBusy ? "Submitting…" : "Submit listing"}</button></section>;

  return <section className="listing-form-wrap"><div className="eyebrow">Seller workspace</div><h1>List an item</h1><p className="seller-lede">Add the details for a private listing submission.</p><form className="listing-form" onSubmit={submitListing} noValidate>
    <FormInput label="Brand" id="brand" value={listing.brand} error={errors.brand} onChange={(v) => updateListing("brand", v)} /><FormInput label="Model / item name" id="name" value={listing.name} error={errors.name} onChange={(v) => updateListing("name", v)} />
    <FormInput label="Price (S$)" id="price" type="number" value={listing.price} error={errors.price} onChange={(v) => updateListing("price", v)} />
    <SelectInput label="Condition" id="condition" value={listing.condition} error={errors.condition} choices={["Excellent", "Very good", "Good"]} onChange={(v) => updateListing("condition", v)} /><FormInput label="Colour" id="colour" value={listing.colour} error={errors.colour} onChange={(v) => updateListing("colour", v)} />
    <SelectInput label="Category" id="category" value={listing.category} error={errors.category} choices={["Shoulder bag", "Top handle", "Tote", "Crossbody", "Clutch"]} onChange={(v) => updateListing("category", v)} />
    <div className="form-field form-span"><label htmlFor="description">Description</label><textarea id="description" value={listing.description} onChange={(e) => updateListing("description", e.target.value)} aria-invalid={Boolean(errors.description)} />{errors.description && <p className="field-error">{errors.description}</p>}</div>
    <FormInput label="Material (optional)" id="material" value={listing.material} onChange={(v) => updateListing("material", v)} /><FormInput label="Style (optional)" id="style" value={listing.style} onChange={(v) => updateListing("style", v)} /><FormInput label="Best for / occasion (optional)" id="occasion" value={listing.occasion} onChange={(v) => updateListing("occasion", v)} />
    <fieldset className="photo-field form-span"><legend>Bag photos</legend><p>Please upload 3 clear photos of the bag: front, back, and side. Images must be JPEG, PNG, or WebP and 5 MB or smaller.</p><div className="photo-uploads">{photoSlots.map(({ angle, label }) => <label className="photo-upload" key={angle} htmlFor={`photo-${angle}`}><span>{label}</span><input id={`photo-${angle}`} type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => chooseImage(angle, e.target.files?.[0])} />{images[angle] && <img src={images[angle]} alt={`Selected ${angle} of ${listing.name || "bag"}`} />}</label>)}</div>{errors.images && <p className="field-error">{errors.images}</p>}<p>Images are uploaded privately only when you submit the listing.</p></fieldset>
    <div className="form-span listing-actions"><button className="button" disabled={!hasAllImages}>Preview listing</button><button className="text-button" type="button" onClick={resetToWorkspace}>Cancel</button></div>
  </form><p className="demo-disclosure">Your listing stays private until it is approved.</p></section>;
}

function FormInput({ label, id, value, onChange, error, type = "text" }: { label: string; id: string; value: string; onChange: (value: string) => void; error?: string; type?: string }) { return <div className="form-field"><label htmlFor={id}>{label}</label><input id={id} type={type} min={type === "number" ? "0" : undefined} max={type === "number" ? "5000" : undefined} step={type === "number" ? "0.01" : undefined} value={value} onChange={(e) => onChange(e.target.value)} aria-invalid={Boolean(error)} />{error && <p className="field-error">{error}</p>}</div>; }
function SelectInput({ label, id, value, choices, onChange, error }: { label: string; id: string; value: string; choices: string[]; onChange: (value: string) => void; error?: string }) { return <div className="form-field"><label htmlFor={id}>{label}</label><select id={id} value={value} onChange={(e) => onChange(e.target.value)} aria-invalid={Boolean(error)}><option value="">Select {label.toLowerCase()}</option>{choices.map((choice) => <option key={choice}>{choice}</option>)}</select>{error && <p className="field-error">{error}</p>}</div>; }
