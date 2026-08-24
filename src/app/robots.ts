import type { MetadataRoute } from "next"

/**
 * Keep the app out of search results.
 *
 * The demo made every page publicly readable, which also made them
 * crawlable. This is a private training log for one family, not a site
 * looking for traffic — the marketing page on GitHub Pages is what should
 * be found, not a stranger's sample season or a signed-in child's data.
 *
 * Paired with the `noindex` directive in the root layout: robots.txt asks a
 * crawler not to fetch, while `noindex` tells one that fetched anyway not to
 * list it. Neither alone covers both cases.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      disallow: "/",
    },
  }
}
