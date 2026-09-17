import { getServerSupabase } from "@/lib/supabase";
import type { Product } from "@/lib/types";

export async function getProducts(filters: Record<string, string | undefined> = {}) {
  const supabase = getServerSupabase();
  let query = supabase.from("products").select("*").eq("is_available", true).eq("moderation_status", "approved");
  if (filters.brand) query = query.eq("brand", filters.brand);
  if (filters.category) query = query.eq("category", filters.category);
  if (filters.condition) query = query.eq("condition", filters.condition);
  if (filters.colour) query = query.eq("colour", filters.colour);
  if (filters.material) query = query.eq("material", filters.material);
  if (filters.occasion) query = query.contains("occasion_tags", [filters.occasion]);
  if (filters.maxPrice) query = query.lte("price_cents", Number(filters.maxPrice) * 100);
  if (filters.minPrice) query = query.gte("price_cents", Number(filters.minPrice) * 100);
  const order = filters.sort === "price-asc" ? { column: "price_cents", ascending: true } : filters.sort === "price-desc" ? { column: "price_cents", ascending: false } : { column: "created_at", ascending: false };
  const { data, error } = await query.order(order.column, { ascending: order.ascending });
  if (error) throw error;
  return data as Product[];
}

export async function getProduct(slug: string) {
  const { data, error } = await getServerSupabase().from("products").select("*").eq("slug", slug).eq("is_available", true).eq("moderation_status", "approved").single();
  if (error) return null;
  return data as Product;
}
