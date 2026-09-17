"use client";

import Link from "next/link";
import { useAuth } from "@/components/auth-provider";

export function Header(){const {user,profile,loading,signOut}=useAuth();return <><div className="topbar">COMPLIMENTARY INSURED SHIPPING ON EVERY ORDER</div><nav className="nav shell"><Link href="/" className="wordmark">ATELIER ARCHIVE<small>PRE-OWNED LUXURY</small></Link><div className="navlinks"><Link href="/#shop">Shop all</Link><Link href="/#shop">The edit</Link><Link href="/sell">Sell</Link><Link href="/notes">Notes</Link>{!loading&&user&&<span className="account-status">{profile?.display_name ?? user.email} · {profile?.role ?? "member"}</span>}{!loading&&user&&<button className="nav-logout" type="button" onClick={()=>void signOut()}>Log out</button>}</div></nav></>}
