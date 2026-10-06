import type { MetadataRoute } from "next";

const SITIO = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/+$/, "");

/** Lo público se indexa; la cuenta, el panel y el login no. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/cuenta", "/admin", "/auth", "/subir", "/organizacion"] },
    sitemap: `${SITIO}/sitemap.xml`,
  };
}
