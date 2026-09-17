export type Product = {
  id: string; slug: string; brand: string; model: string; title: string; category: string;
  price_cents: number; condition: string; description: string; colour: string | null;
  material: string | null; size: string | null; hardware: string | null; style_tags: string[];
  occasion_tags: string[]; image_urls: string[]; seller_name: string | null; seller_location: string | null;
  condition_notes: string | null; included_items: string | null; authenticity_status: string | null;
  authenticity_notes: string | null; is_available: boolean; moderation_status: "approved" | "under_review";
  seller_id: string | null; pending_image_paths: string[] | null; created_at: string;
};

// Prices are stored as integer cents, but this marketplace is presented in SGD.
export const money = (cents: number) => `S$${new Intl.NumberFormat("en-SG", { maximumFractionDigits: 0 }).format(cents / 100)}`;
