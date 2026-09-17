import Image from "next/image";
import Link from "next/link";
import type { Product } from "@/lib/types";
import { money } from "@/lib/types";
export function ProductCard({ product }: { product: Product }) { return <Link className="card" href={`/products/${product.slug}`}><div className="card-img"><Image src={product.image_urls[0]} alt={product.title} fill sizes="(max-width: 800px) 50vw, 33vw" /><span className="pill">{product.condition}</span></div><div className="card-info"><div className="card-brand">{product.brand}</div><div className="card-title">{product.model}</div><div className="price">{money(product.price_cents)}</div><div className="meta">{product.colour} · {product.material}</div></div></Link>; }
