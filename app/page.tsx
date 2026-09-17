import { getProducts } from "@/lib/catalogue";
import { CatalogueClient } from "@/components/catalogue-client";
export const dynamic = "force-dynamic";
export default async function Home(){ const products = await getProducts(); return <CatalogueClient initialProducts={products} />; }
