import type { LabManifest } from "../../types/manifest";

export const cloudfrontCachingLab: LabManifest = {
  schemaVersion: "1.1",
  id: "cloudfront-caching",
  version: 1,
  title: "CloudFront Cache Behavior Configuration",
  tier: "beginner",
  track: "aws-core",
  difficulty: "moderate",
  accessLevel: "free",
  tags: ["aws", "cloudfront", "cdn", "caching", "performance"],
  description:
    "Configure CloudFront cache behaviors, TTLs, and invalidation strategies to balance cache hit rates, cost, and content freshness for a production web application.",
  estimatedMinutes: 11,
  learningObjectives: [
    "Configure appropriate cache TTLs based on content type and update frequency",
    "Design cache behavior path patterns for mixed static and dynamic content",
    "Apply cache invalidation strategies without unnecessary cost or stale content",
    "Understand how Cache-Control headers interact with CloudFront TTL settings",
  ],
  sortOrder: 106,
  status: "published",
  prerequisites: [],
  rendererType: "toggle-config",
  scenarios: [
    {
      type: "toggle-config",
      id: "cloudfront-cache-s1",
      title: "E-Commerce Site Cache Behaviors",
      description:
        "An e-commerce site serves static assets, product pages, and a checkout API through CloudFront. Currently all paths use the same default cache behavior with a 1-day TTL. This causes stale prices and inventory data to show. Configure the correct cache behaviors for each content type.",
      targetSystem: "CloudFront Distribution: E-Commerce Site",
      items: [
        {
          id: "static-assets-ttl",
          label: "Static Assets (/static/*) Cache TTL",
          detail: "CSS, JS, images with versioned filenames (e.g., app.v3f7a.js). Files are changed by deploying new hashed filenames.",
          currentState: "1 day",
          correctState: "1 year (31536000s)",
          states: ["1 hour", "1 day", "1 week", "1 year (31536000s)"],
          rationaleId: "r-static-immutable",
        },
        {
          id: "product-pages-ttl",
          label: "Product Pages (/products/*) Cache TTL",
          detail: "Product detail pages with prices and inventory. Data updates every 5–15 minutes from inventory system.",
          currentState: "1 day",
          correctState: "5 minutes",
          states: ["0 (no cache)", "5 minutes", "1 hour", "1 day"],
          rationaleId: "r-product-freshness",
        },
        {
          id: "api-cache",
          label: "Checkout API (/api/checkout/*) Caching",
          detail: "POST requests to process orders. Returns unique session tokens per user.",
          currentState: "Cache: On (default TTL 1 day)",
          correctState: "Cache: Off (forward all to origin)",
          states: ["Cache: On (default TTL 1 day)", "Cache: On (TTL 0)", "Cache: Off (forward all to origin)"],
          rationaleId: "r-api-no-cache",
        },
        {
          id: "query-string-forwarding",
          label: "Query String Forwarding for Product Pages",
          detail: "Product pages use ?variant=red&size=L to show specific variants. Currently all query string variants cache as separate objects.",
          currentState: "Forward all query strings",
          correctState: "Forward only: variant, size",
          states: ["Forward all query strings", "Forward only: variant, size", "Forward none (ignore query strings)"],
          rationaleId: "r-query-string-scope",
        },
        {
          id: "compress-objects",
          label: "Automatic Object Compression",
          detail: "CloudFront can compress text-based content (HTML, JS, CSS) using gzip/brotli before delivery.",
          currentState: "Disabled",
          correctState: "Enabled",
          states: ["Enabled", "Disabled"],
          rationaleId: "r-compression",
        },
      ],
      rationales: [
        {
          id: "r-static-immutable",
          text: "Versioned/hashed static assets are immutable — when the content changes, the URL changes. A 1-year TTL maximizes cache hit rate and reduces origin load. The hash in the filename guarantees cache busting on deployment.",
        },
        {
          id: "r-product-freshness",
          text: "Product prices and inventory change every 5–15 minutes. A 5-minute TTL means users see data that's at most 5 minutes stale, which is acceptable for most e-commerce scenarios while still providing 80%+ cache hit ratio at scale.",
        },
        {
          id: "r-api-no-cache",
          text: "POST requests to checkout APIs should never be cached. Caching would serve one user's checkout response to another user, causing incorrect orders, double charges, or session token reuse. Disable caching for all authenticated and transactional endpoints.",
        },
        {
          id: "r-query-string-scope",
          text: "Forwarding all query strings creates separate cache objects for every unique query string combination, including tracking parameters like utm_source that don't affect content. Forwarding only content-affecting parameters (variant, size) dramatically improves cache efficiency.",
        },
        {
          id: "r-compression",
          text: "CloudFront compression typically reduces text file sizes by 60–80%. This improves Time to First Byte for users and reduces CloudFront data transfer costs simultaneously.",
        },
      ],
      feedback: {
        perfect:
          "Optimal cache configuration. Immutable assets get maximum TTL, product pages get freshness-appropriate TTL, APIs are not cached, query strings are scoped, and compression reduces transfer costs.",
        partial:
          "Most settings are correct but at least one is misconfigured. Stale product data or cached API responses can cause real business problems for an e-commerce site.",
        wrong:
          "The cache configuration is causing content freshness issues. Caching checkout API responses or using a 1-day TTL on inventory data will result in users seeing incorrect prices or processing errors.",
      },
    },
    {
      type: "toggle-config",
      id: "cloudfront-cache-s2",
      title: "Cache Invalidation Strategy",
      description:
        "Your team just deployed new marketing content to S3 behind CloudFront. Some edge locations are still serving the old content. Evaluate the invalidation and cache management settings to ensure fresh content delivery without excessive cost.",
      targetSystem: "CloudFront Invalidation: Marketing Campaign Launch",
      items: [
        {
          id: "invalidation-path",
          label: "Invalidation Path",
          detail: "The deployment changed 12 specific files in /marketing/campaign-2026/. Cost: $0.005 per path after first 1,000 paths/month.",
          currentState: "/* (invalidate entire distribution)",
          correctState: "/marketing/campaign-2026/*",
          states: ["/* (invalidate entire distribution)", "/marketing/campaign-2026/*", "/marketing/*"],
          rationaleId: "r-targeted-invalidation",
        },
        {
          id: "cache-control-header",
          label: "Cache-Control Header on New Assets",
          detail: "The new marketing assets have no Cache-Control header set at the S3 origin level.",
          currentState: "No Cache-Control header",
          correctState: "Cache-Control: max-age=300, s-maxage=86400",
          states: [
            "No Cache-Control header",
            "Cache-Control: no-store",
            "Cache-Control: max-age=300, s-maxage=86400",
            "Cache-Control: max-age=86400",
          ],
          rationaleId: "r-cache-control-split",
        },
        {
          id: "origin-shield",
          label: "CloudFront Origin Shield",
          detail: "Origin Shield adds an additional caching layer between edge locations and S3 origin. Currently disabled.",
          currentState: "Disabled",
          correctState: "Enabled",
          states: ["Enabled", "Disabled"],
          rationaleId: "r-origin-shield",
        },
        {
          id: "versioned-filenames",
          label: "Deployment Strategy for Future Updates",
          detail: "Current deployment overwrites files in place (e.g., hero-image.jpg replaced with new hero-image.jpg).",
          currentState: "Overwrite files in place",
          correctState: "Use versioned/hashed filenames (hero-image.v2a3b.jpg)",
          states: ["Overwrite files in place", "Use versioned/hashed filenames (hero-image.v2a3b.jpg)"],
          rationaleId: "r-versioned-files",
        },
      ],
      rationales: [
        {
          id: "r-targeted-invalidation",
          text: "Invalidating /* clears the entire distribution cache, causing a cache miss storm on every edge location. Targeted path invalidation for only the changed directory is cheaper, faster, and doesn't unnecessarily purge unrelated cached content.",
        },
        {
          id: "r-cache-control-split",
          text: "s-maxage controls CloudFront TTL (86400s = 1 day), while max-age controls browser cache (300s = 5 min). This split allows CloudFront to cache aggressively for CDN efficiency while keeping browser-side cache short enough to pick up CDN invalidations quickly.",
        },
        {
          id: "r-origin-shield",
          text: "Origin Shield adds a regional cache tier that absorbs cache misses from multiple edge locations. Instead of 50 edge POPs all going to S3 on a cache miss, Origin Shield consolidates this to a single regional request, reducing S3 GET request costs and latency.",
        },
        {
          id: "r-versioned-files",
          text: "Versioned filenames eliminate the need for invalidations entirely. When a file changes, it gets a new URL with a new hash. Old URLs continue to serve from cache (no invalidation cost), and new URLs are fetched fresh. This is the most reliable and cost-effective cache management strategy.",
        },
      ],
      feedback: {
        perfect:
          "Correct invalidation strategy. Targeted paths, proper Cache-Control split headers, Origin Shield for efficiency, and a plan to avoid future invalidations with versioned filenames.",
        partial:
          "Most settings are correct. Invalidating the entire distribution /* when only specific files changed is a common (and costly) mistake. Target only what changed.",
        wrong:
          "The invalidation strategy is inefficient. A full /* invalidation causes a cache miss on every edge location for every asset, temporarily degrading CDN performance for all users.",
      },
    },
    {
      type: "toggle-config",
      id: "cloudfront-cache-s3",
      title: "Authenticated Content Access Control",
      description:
        "A SaaS application serves tenant-specific dashboards through CloudFront backed by an API. Dashboards include per-user data that must not be shared across users. Configure CloudFront to handle authenticated content correctly.",
      targetSystem: "CloudFront Distribution: SaaS Dashboard API",
      items: [
        {
          id: "auth-header-forwarding",
          label: "Authorization Header Forwarding",
          detail: "API requires a Bearer token in the Authorization header. CloudFront currently strips all headers.",
          currentState: "Strip all headers",
          correctState: "Forward: Authorization header",
          states: ["Strip all headers", "Forward: Authorization header", "Forward all headers"],
          rationaleId: "r-forward-auth-header",
        },
        {
          id: "cache-authenticated",
          label: "Cache Authenticated API Responses",
          detail: "Dashboard data is user-specific and changes in real-time as users interact.",
          currentState: "Cache enabled (TTL: 1 hour)",
          correctState: "Cache disabled for /api/dashboard/*",
          states: ["Cache enabled (TTL: 1 hour)", "Cache enabled (TTL: 1 min)", "Cache disabled for /api/dashboard/*"],
          rationaleId: "r-no-cache-user-data",
        },
        {
          id: "geo-restriction",
          label: "Geographic Restrictions",
          detail: "The SaaS platform is only licensed for North American customers. Users from other regions should receive a 403.",
          currentState: "No geographic restrictions",
          correctState: "Allowlist: US, CA, MX",
          states: ["No geographic restrictions", "Allowlist: US, CA, MX", "Blocklist: CN, RU"],
          rationaleId: "r-geo-restriction",
        },
        {
          id: "https-only",
          label: "Viewer Protocol Policy",
          detail: "CloudFront currently allows both HTTP and HTTPS connections from viewers.",
          currentState: "HTTP and HTTPS",
          correctState: "Redirect HTTP to HTTPS",
          states: ["HTTP and HTTPS", "Redirect HTTP to HTTPS", "HTTPS only"],
          rationaleId: "r-https-redirect",
        },
      ],
      rationales: [
        {
          id: "r-forward-auth-header",
          text: "If CloudFront strips the Authorization header, the backend API cannot authenticate users and will return 401 errors for all requests. The header must be forwarded to the origin.",
        },
        {
          id: "r-no-cache-user-data",
          text: "Caching authenticated, per-user data is a critical security flaw. CloudFront would serve one user's dashboard data to any subsequent user whose request matches the cache key. Per-user API responses must never be cached at the CDN layer.",
        },
        {
          id: "r-geo-restriction",
          text: "An allowlist for specific countries (US, CA, MX) is more secure than a blocklist. Blocklists require ongoing maintenance as new countries are added; an allowlist automatically blocks all unlisted countries.",
        },
        {
          id: "r-https-redirect",
          text: "Redirect HTTP to HTTPS ensures users who type the URL without https:// are automatically upgraded. HTTPS-only (403 on HTTP) is stricter but creates user experience friction. Redirect is the standard approach for web applications.",
        },
      ],
      feedback: {
        perfect:
          "Correct configuration for authenticated content. Auth headers forwarded, user-specific data not cached, geo-restrictions applied via allowlist, and HTTP redirected to HTTPS.",
        partial:
          "Some settings are correct but at least one creates a security issue. Caching authenticated user data or not forwarding the auth header are serious misconfiguration patterns.",
        wrong:
          "Critical security misconfigurations present. Caching per-user authenticated data at the CDN layer is a data exposure vulnerability that could show one user's data to another.",
      },
    },
  ],
  hints: [
    "Versioned/hashed filenames are the best cache strategy — they make invalidations unnecessary. Reserve CloudFront invalidations for emergencies, not routine deployments.",
    "s-maxage in Cache-Control headers overrides CloudFront's default TTL and controls CDN cache duration independently from the browser (max-age). Use both for fine-grained control.",
    "Never cache authenticated, per-user content at a CDN. If the cache key doesn't include the user identity token, different users will receive each other's cached responses.",
  ],
  scoring: {
    maxScore: 100,
    hintPenalty: 5,
    penalties: { perfect: 0, partial: 10, wrong: 20 },
    passingThresholds: { pass: 80, partial: 50 },
  },
  careerInsight:
    "CloudFront configuration is deceptively complex. The gap between 'it works' and 'it works correctly and securely' is often a matter of understanding cache key composition, header forwarding, and TTL hierarchy. Engineers who can tune CloudFront for both performance and security are valuable in front-end infrastructure and platform engineering roles.",
  toolRelevance: ["AWS Console", "AWS CLI", "CloudFront Console", "AWS CloudShell"],
  createdAt: "2026-03-28",
  updatedAt: "2026-03-28",
};
