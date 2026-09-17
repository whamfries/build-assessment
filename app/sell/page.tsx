import { SellerWorkspace } from "@/components/seller-workspace";
import { Suspense } from "react";

export default function SellPage() {
  return <main className="seller-page shell"><Suspense fallback={null}><SellerWorkspace /></Suspense></main>;
}
