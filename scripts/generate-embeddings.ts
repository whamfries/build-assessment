import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { getAdminSupabase } from "../lib/supabase";
import { createEmbedding } from "../lib/retrieval";

async function main(){
  const supabase=getAdminSupabase();
  const {data,error}=await supabase.from("products").select("id,search_document").eq("moderation_status","approved").is("embedding",null);
  if(error)throw error;
  for(const product of data??[]){
    const embedding=await createEmbedding(product.search_document);
    const {error:updateError}=await supabase.from("products").update({embedding,embedding_updated_at:new Date().toISOString()}).eq("id",product.id);
    if(updateError)throw updateError;
    console.log(`Embedded ${product.id}`);
  }
}
main().catch(error=>{console.error(error);process.exit(1)});
