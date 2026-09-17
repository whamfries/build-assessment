import OpenAI from "openai";
import { getServerSupabase } from "@/lib/supabase";
import type { Product } from "@/lib/types";

const embedder = () => new OpenAI({ apiKey: process.env.CLASSGW_KEY, baseURL: process.env.COGNITIOLABS_EMBEDDING_BASE_URL ?? "https://174.138.16.223/openrouter/v1" });
type Intent = { semanticQuery: string; maxPriceCents?: number; minPriceCents?: number; brand?: string; category?: string; condition?: string; colour?: string };

function priceAmount(match:RegExpMatchArray|null){if(!match)return undefined;let amount=Number(match[1].replace(/,/g,""));if(/\d\s*k\b/i.test(match[0]))amount*=1000;return Math.min(Math.round(amount*100),500000);}
function priceConstraints(query:string){const currency="(?:s\\$|sgd|usd|\\$)?";return {max:priceAmount(query.match(new RegExp(`(?:under|below|less than|maximum of|up to)\\s*${currency}\\s*([\\d,]+(?:\\.\\d+)?)(?:k|\\s*(?:dollars?))?`,"i"))),min:priceAmount(query.match(new RegExp(`(?:over|above|more than|from|at least)\\s*${currency}\\s*([\\d,]+(?:\\.\\d+)?)(?:k|\\s*(?:dollars?))?`,"i")))};}
type Facets = Pick<Product, "brand" | "category" | "condition" | "colour">;
const hasExactPhrase=(query:string, value:string) => new RegExp(`(^|[^a-z0-9])${value.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g,"\\$&")}(?=$|[^a-z0-9])`, "i").test(query);
const exactFacet=(query:string, values:(string|null)[]) => values.filter((value):value is string=>Boolean(value)).sort((a,b)=>b.length-a.length).find(value=>hasExactPhrase(query,value));

// Only values that actually occur in this catalogue may become SQL constraints.
// This keeps an LLM (or a semantic synonym such as "evening") from becoming an
// impossible factual filter, while still enforcing explicit colour/brand/etc.
async function extractIntent(query:string):Promise<Intent>{
  const {data,error}=await getServerSupabase().from("products").select("brand,category,condition,colour").eq("is_available",true).eq("moderation_status","approved");
  if(error) throw error;
  const facets=(data??[]) as Facets[];
  const price=priceConstraints(query);
  return {
    semanticQuery:query.trim(), maxPriceCents:price.max, minPriceCents:price.min,
    brand:exactFacet(query,facets.map(p=>p.brand)),
    category:exactFacet(query,facets.map(p=>p.category)),
    condition:exactFacet(query,facets.map(p=>p.condition)),
    colour:exactFacet(query,facets.map(p=>p.colour))
  };
}

// These are catalogue-domain nouns and conversational glue, not product
// attributes. Once explicit catalogue facets and price have been removed, a
// query containing only these terms is a request to browse the whole eligible
// catalogue rather than a request to find the nearest semantic neighbours.
const broadQueryWords=new Set([
  "a","an","all","any","archive","available","browse","catalogue","catalog","collection",
  "for","find","handbag","handbags","me","please","purse","purses","show","the","to","want",
  "bag","bags"
]);
function removePhrase(source:string, phrase:string){return source.replace(new RegExp(`(^|[^a-z0-9])${phrase.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g,"\\$&")}(?=$|[^a-z0-9])`,"gi")," ");}
function isBroadCatalogueQuery(query:string,intent:Intent){
  let remainder=query.toLowerCase()
    .replace(/(?:under|below|less than|maximum of|up to|over|above|more than|from|at least)\s*(?:s\$|sgd|usd|\$)?\s*[\d,]+(?:\.\d+)?(?:k|\s*(?:dollars?))?/gi," ")
    .replace(/(?:s\$|sgd|usd|\$)\s*[\d,]+(?:\.\d+)?/gi," ");
  for(const value of [intent.brand,intent.category,intent.condition,intent.colour]) if(value) remainder=removePhrase(remainder,value);
  const terms=remainder.match(/[a-z0-9]+/g)??[];
  return terms.length>0&&terms.every(term=>broadQueryWords.has(term));
}
export async function createEmbedding(input:string){const result=await embedder().embeddings.create({model:process.env.COGNITIOLABS_EMBEDDING_MODEL??"openai/text-embedding-3-small",input});return result.data[0].embedding;}
export async function semanticSearch(query:string,count=12):Promise<Product[]>{
  const intent=await extractIntent(query);
  // Embed exactly what the shopper typed; constraints only narrow factual facets.
  const semanticQuery=query.trim();
  const embedding=await createEmbedding(semanticQuery);
  const {data,error}=await getServerSupabase().rpc("match_products",{
    query_embedding:embedding,
    query_text:semanticQuery,
    match_count:count,
    max_price_cents:intent.maxPriceCents??500000,
    min_price_cents:intent.minPriceCents??0,
    filter_brand:intent.brand??null,
    filter_category:intent.category??null,
    filter_condition:intent.condition??null,
    filter_colour:intent.colour??null
  });
  if(error)throw error;
  return data as Product[];
}

const normalise=(value:string)=>value.toLowerCase().match(/[a-z0-9]+/g)??[];
const containsTokens=(haystack:string[],needle:string[])=>needle.every((token,index)=>haystack[index]===token);
const hasTokenSequence=(haystack:string[],needle:string[])=>needle.length>0&&haystack.some((_,index)=>containsTokens(haystack.slice(index),needle));
const ignoredModelTokens=new Set(["mini","small","medium","large"]);

// A named listing is intentionally resolved from the catalogue, rather than
// from its embedding. This is used by Buyer Assistant only; marketplace search
// continues to use semanticSearch unchanged.
export function findNamedCatalogueProducts(question:string, products:Product[]):Product[]{
  const queryTokens=normalise(question);
  return products.filter(product=>{
    const brandTokens=normalise(product.brand);
    if(!hasTokenSequence(queryTokens,brandTokens)) return false;
    const modelTokens=normalise(product.model).filter(token=>!ignoredModelTokens.has(token));
    // A partial name may stop before a size or edition (for example, "Gucci
    // Jackie" for "Gucci Jackie 1961 Small"), but it must name the brand and
    // begin the model. A brand on its own is not treated as a product mention.
    return modelTokens.some((_,index)=>{
      const phrase=modelTokens.slice(0,index+1);
      return hasTokenSequence(queryTokens,phrase);
    });
  });
}

function comparisonTerms(question:string):string[]{
  const comparison=/(?:^|\b)compare\s+(.+?)\s+(?:and|vs\.?|versus)\s+(.+?)(?:[?.!]|$)/i.exec(question)
    ?? /\b(?:which\s+is\s+)?better\b[^,?.!]*,\s*(.+?)\s+(?:or|vs\.?|versus)\s+(.+?)(?:[?.!]|$)/i.exec(question);
  if(!comparison) return [];
  return comparison.slice(1).map(term=>term
    .replace(/^\s*(?:the|a|an)\s+/i,"")
    .replace(/\s+/g," ")
    .trim()
  ).filter(Boolean);
}

export type AssistantRetrieval={products:Product[];namedProducts:Product[];comparisonTerms:string[];unmatchedComparisonTerms:string[]};

export async function assistantSearch(question:string, count=8):Promise<AssistantRetrieval>{
  // Fetching the available catalogue is deliberately independent of semantic
  // ranking, so an explicitly named listing cannot be displaced by Top-K.
  const catalogueRequest=getServerSupabase().from("products").select("*").eq("is_available",true).eq("moderation_status","approved");
  const [semanticResult,catalogueResult]=await Promise.all([semanticSearch(question,count),catalogueRequest]);
  if(catalogueResult.error) throw catalogueResult.error;
  const catalogue=(catalogueResult.data??[]) as Product[];
  const namedProducts=findNamedCatalogueProducts(question,catalogue);
  const terms=comparisonTerms(question);
  const unmatchedComparisonTerms=terms.filter(term=>findNamedCatalogueProducts(term,catalogue).length===0);
  const byId=new Map<string,Product>();
  // Named records lead the context and semantic records may supplement them.
  for(const product of [...namedProducts,...semanticResult]) byId.set(product.id,product);
  return {products:[...byId.values()],namedProducts,comparisonTerms:terms,unmatchedComparisonTerms};
}

// Catalogue search uses the same deployed RPC contract as Buyer Assistant.
// Keeping this call on match_products prevents the UI from depending on an
// unapplied database function.
export async function naturalLanguageSearch(query:string):Promise<Product[]>{
  return semanticSearch(query,12);
}
