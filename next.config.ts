import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "a.1stdibscdn.com" },
      { protocol: "http", hostname: "asecondchanceresale.com" },
      { protocol: "https", hostname: "brands-hub.ru" },
      { protocol: "https", hostname: "cdn.clothbase.com" },
      { protocol: "https", hostname: "cdn.shopify.com" },
      { protocol: "https", hostname: "cdn.theluxurycloset.com" },
      { protocol: "https", hostname: "cdn1.jolicloset.com" },
      { protocol: "https", hostname: "cdna.lystit.com" },
      { protocol: "https", hostname: "d2cva83hdk3bwc.cloudfront.net" },
      { protocol: "https", hostname: "diorama.dam-broadcast.com" },
      { protocol: "https", hostname: "i.pinimg.com" },
      { protocol: "https", hostname: "images.prestigeonline.com" },
      { protocol: "https", hostname: "images.stockx.com" },
      { protocol: "https", hostname: "img.ssensemedia.com" },
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "imissyouvintage.com" },
      { protocol: "https", hostname: "media.gucci.com" },
      { protocol: "https", hostname: "media.jimmychoo.com" },
      { protocol: "https", hostname: "parisstation.com" },
      { protocol: "https", hostname: "preview.redd.it" },
      { protocol: "https", hostname: "prod-images.fashionphile.com" },
      { protocol: "http", hostname: "queenstation.net" },
      { protocol: "https", hostname: "s7d9.scene7.com" },
      { protocol: "https", hostname: "sites.create-cdn.net" },
      { protocol: "https", hostname: "sothebys-md.brightspotcdn.com" },
      { protocol: "https", hostname: "ijyxycuiuvoeazbaagkr.supabase.co", pathname: "/storage/v1/object/public/product-images/**" },
      { protocol: "https", hostname: "thumbs.dreamstime.com" },
      { protocol: "https", hostname: "us.louisvuitton.com" },
      { protocol: "https", hostname: "www.caroll.com" },
      { protocol: "https", hostname: "www.manufacturingtodayindia.com" },
      { protocol: "https", hostname: "www.mytheresa.com" },
      { protocol: "https", hostname: "www.prada.com" },
    ],
  },
};

export default nextConfig;
