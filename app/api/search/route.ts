import { NextResponse } from "next/server";
import { z } from "zod";
import { naturalLanguageSearch } from "@/lib/retrieval";
const schema=z.object({query:z.string().trim().min(2).max(500)});
export async function POST(request:Request){try{const {query}=schema.parse(await request.json());const products=await naturalLanguageSearch(query);return NextResponse.json({products});}catch(error){console.error("Search failed",error);return NextResponse.json({error:"Search is temporarily unavailable. Please browse the archive instead."},{status:500});}}
