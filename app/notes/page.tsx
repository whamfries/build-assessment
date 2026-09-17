export default function Notes() {
  return <main className="notes">
    <div className="eyebrow">Assessment notes</div>
    <h1>What I built</h1>
    <p><strong>A buyer-first marketplace for discovering pre-owned luxury handbags.</strong></p>
    <p>This prototype explores how AI can make browsing a second-hand marketplace feel more natural. Buyers can browse a seeded catalogue, filter listings, view individual product details and search using everyday language such as “a black evening bag under S$3,000.”</p>
    <p>The marketplace also includes an AI-powered Buyer Assistant that uses catalogue information to recommend and compare available products while acknowledging when requested information is unavailable.</p>
    <p>The core buyer experience can be explored without an account.</p>
    <p>I chose pre-owned luxury handbags because shoppers often combine factual constraints such as brand, colour and budget with subjective preferences such as occasion, style and formality. This makes the category useful for combining structured filtering with semantic retrieval.</p>
    <p>I also implemented a small seller submission and moderation workflow. Seller-created listings enter the marketplace as <code>under_review</code>, while buyer-facing listings must be <code>approved</code>. This separates seller submission from publication without attempting to build a complete seller platform.</p>

    <hr />
    <h1>AI &amp; technical approach</h1>
    <p>AI is used for catalogue discovery and decision support rather than as a standalone chatbot.</p>
    <p>Natural-language search combines <strong>semantic retrieval with deterministic catalogue filters</strong>. A shopper&apos;s query is embedded to identify semantically relevant products, while explicit constraints such as brand, colour, condition and maximum price are applied against structured catalogue data.</p>
    <p>I deliberately do not rely on semantic similarity alone. Price, brand and colour are factual catalogue properties, so deterministic filtering helps prevent semantically similar but factually incompatible products from being returned.</p>
    <p>The <strong>Buyer Assistant</strong> builds on catalogue retrieval. Relevant products are retrieved first and supplied as context to the language model. The assistant is instructed to use available catalogue information and acknowledge missing facts rather than invent product details.</p>
    <h3>Seller submission architecture</h3>
    <p>Seller-uploaded Front, Back and Side images are stored in a <strong>private Supabase Storage bucket</strong>. The corresponding listing is persisted with an <code>under_review</code> status.</p>
    <p>Under-review listings are excluded from the buyer catalogue, product pages, natural-language search and Buyer Assistant grounding. This provides a clear boundary where future moderation can occur before publication.</p>
    <p><strong>Technical stack:</strong> Next.js / React · TypeScript · Supabase / PostgreSQL · pgvector · CognitioLabs model gateway</p>
    <p><strong>AI coding support:</strong> Codex with <code>gpt-5.6-terra</code> was used for implementation, debugging and iteration. I reviewed and tested the resulting functionality.</p>
    <p><strong>Search embeddings:</strong> <code>openai/text-embedding-3-small</code> through the CognitioLabs gateway.</p>
    <p><strong>Buyer Assistant:</strong> <code>gpt-5.6-terra</code> through the CognitioLabs gateway.</p>

    <hr />
    <h1>Seeded, functional &amp; limited features</h1>
    <h3>Seeded</h3>
    <p>The original catalogue contains 18 handbag listings with structured product attributes, searchable descriptions and product imagery.</p>
    <h3>Functional</h3>
    <p>Browsing, product detail pages, filters, natural-language search, Buyer Assistant, Supabase authentication, persistent sessions, Buyer/Seller profiles, and seller listing submission.</p>
    <p>Seller accounts can submit a listing with three required images: Front, Back and Side. The images are stored privately and the listing is persisted as <code>under_review</code>.</p>
    <h3>Simulated / intentionally limited</h3>
    <p>Contact Seller demonstrates the intended interaction but does not send a real message.</p>
    <p>Seller moderation and approval, payments, checkout, shipping, transactions, production messaging, seller verification and order management are not implemented.</p>
    <p>Authentication is optional for the core buyer experience. It is used only for account-specific interactions such as Contact Seller and the Seller Workspace.</p>

    <hr />
    <h1>What I didn&apos;t build &amp; why</h1>
    <p>I did not implement payments, checkout, production messaging, shipping/logistics, seller verification, order management or a complete moderation dashboard.</p>
    <p>Seller submissions and their images are genuinely persisted but stop at <code>under_review</code>. I deliberately did not automatically approve seller-created listings because doing so would bypass the moderation boundary.</p>
    <p>I prioritised the assessment&apos;s core experience — catalogue browsing, natural-language discovery and grounded catalogue Q&amp;A — together with a clear submission-to-moderation architecture rather than attempting to reproduce the entire operational lifecycle of a resale marketplace.</p>

    <hr />
    <h1>Known limitations</h1>
    <p><strong>AI responses</strong> — Buyer Assistant responses depend on the quality and completeness of the seeded catalogue. When requested information is unavailable, the assistant is designed to acknowledge that limitation rather than invent details.</p>
    <p><strong>Product information</strong> — Detailed measurements, comprehensive condition reports, provenance documentation and delivery information are not available for every listing.</p>
    <p><strong>Search relevance</strong> — The catalogue contains only 18 relatively similar products, so broad searches such as “bag”, “classic bag” and “elegant bag” can converge on similar results. More explicit brand, colour and price-constrained queries can be resolved more deterministically.</p>
    <p><strong>Seller moderation</strong> — Seller submission and private image storage are functional, but moderation and approval are not automated.</p>
    <p><strong>Image verification</strong> — The prototype does not currently verify whether seller-uploaded photographs are safe, sufficiently clear, relevant or consistent with the listing description.</p>
    <p><strong>Product authenticity</strong> — Image analysis alone cannot establish the authenticity of a luxury product. A production resale marketplace would require additional verification and potentially specialist human review.</p>
    <p><strong>Product imagery</strong> — The seeded catalogue uses AI-generated illustrative product imagery. These images demonstrate the browsing and gallery experience and should not be interpreted as verified photographs of individual second-hand items or evidence of their exact condition.</p>
    <p><strong>Prototype scale</strong> — The application is a demonstration and has not been designed or tested for production-scale traffic, marketplace operations or moderation.</p>

    <hr />
    <h1>Future improvements</h1>
    <h3>Nearest-match recommendations</h3>
    <p>When a shopper requests a specific model that is not present, the Buyer Assistant currently prioritises factual grounding and reports that it is unavailable. A future improvement would acknowledge the missing item first and then offer controlled nearest-match suggestions from the actual catalogue.</p>
    <h3>Structured dimensions and capacity</h3>
    <p>Adding reliable dimensions and capacity information would allow the assistant to answer practical comparison questions such as whether a bag can hold a laptop or other everyday items.</p>
    <h3>AI-assisted seller moderation</h3>
    <p>A future multimodal moderation workflow could review the seller&apos;s Front, Back and Side photographs together with the listing information. It could check that images are appropriate, sufficiently clear, contain the expected handbag, broadly correspond with the description and do not contain people.</p>
    <p>Failed or uncertain submissions would remain <code>under_review</code>, with ambiguous or higher-risk cases routed to human review.</p>
    <p>After successful moderation, a trusted backend process could change the listing from <code>under_review</code> to <code>approved</code>, make approved photographs buyer-visible, generate its search embedding and include the listing in catalogue search and Buyer Assistant retrieval.</p>
    <h3>AI-generated lifestyle imagery</h3>
    <p>After validation, an image-generation model could optionally create a clearly labelled <strong>AI-generated illustrative lifestyle image</strong> showing the handbag being carried.</p>
    <p>Seller photographs would remain the primary evidence of the actual second-hand item. Generated imagery would provide additional visual context and would not be presented as evidence of exact dimensions, condition or appearance.</p>
  </main>;
}
