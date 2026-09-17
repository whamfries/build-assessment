import type { Metadata } from "next";
import "./globals.css";
import { Header } from "@/components/header";
import { ChatWidget } from "@/components/chat-widget";
import { AuthProvider } from "@/components/auth-provider";

export const metadata: Metadata = {
  title: "Atelier Archive | Pre-owned Luxury Handbags",
  description: "A considered collection of authenticated pre-owned luxury handbags.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body><AuthProvider><Header />{children}<ChatWidget /></AuthProvider></body></html>;
}
