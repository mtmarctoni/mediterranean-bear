import type { MetadataRoute } from "next";

/**
 * robots.txt (app/robots.ts).
 *
 * Allows crawling of all public storefront pages and disallows private
 * surfaces (admin, account, api, checkout, cart). The sitemap is announced
 * so crawlers discover it automatically. See plans/008.
 */

const baseUrl =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://mediterraneanbear.marctonimas.com";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin/", "/api/", "/account/", "/checkout", "/cart"],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}