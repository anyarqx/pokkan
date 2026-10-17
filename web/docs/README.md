# Public guides

Astro 7 and Starlight 0.42 generate a static site for `https://docs.pokkan.net`.
Both projects are MIT licensed and allow commercial use. Pagefind supplies local
search without an external service, database or runtime backend.

```sh
npm ci --include=dev
npm run dev
npm run build
npm run check:links
npm run preview
npm audit --include=dev
```

Search is available in the built preview, not the development server. Node 22.12+
is required. `check:links` checks built internal links, anchors, screenshots,
canonical tags and sitemap indexability.

## Content and translations

Articles live in `src/content/docs/<locale>/`. Keep equivalent slugs across `en`,
`pt-br`, `es` and `ja`; use `pt-BR` for language metadata. Start with the Guide,
then link readers to task-specific or Discord concept pages. Internal engineering
documentation stays at the repository's top-level `docs/`.

English has the initial guide and reference. Portuguese, Spanish and Japanese
have the complete beginner Guide, home page, and Kit/account/server journeys. Starlight clearly labels
English fallback reference articles. Fallbacks are noindex, canonicalize to English, are
excluded from the sitemap and are not advertised as translations in hreflang.
The sitemap derives from actual article files; no URL list needs maintenance.

Use current official Discord sources for limits and API facts. Describe what
Pokkan currently does, including its limitations. Do not publish empty sections
or tutorials for planned bot, Templates or scripting features.

Explain an operation together with its result and any limitation that affects the
reader's work. Keep related ideas in connected paragraphs, using steps when order
matters and tables for comparisons. Remove generic introductions, repeated facts
and captions that merely label the screenshot. Alt text should identify the
relevant content without routine mentions of theme or interface language. Review
each translation as natural writing in its own language, with accurate UI labels.

Screenshots in `public/screenshots` are WebP captures of controlled local drafts,
with no webhook URL, personal account or private server. They currently show the
English interface; account captures use mocked demonstration identities and
server states. Recapture them when relevant controls change. The landing and
docs use the same captured Section example in their separate static asset trees;
do not import the docs application into the product bundle. `pokkanicon.png` is
the existing repository brand asset.

## Hosting

Cloudflare Pages serves only `dist`. Use project `pokkan-docs`, production branch
`main`, and attach `docs.pokkan.net` in Pages custom domains. No Workers runtime,
API proxy or changes to the Square Cloud API origin are needed.

From the repository root after checks:

```sh
npm --prefix web/front exec -- wrangler pages deploy web/docs/dist --project-name pokkan-docs --branch main
```

The existing frontend Wrangler installation supplies the CLI. Supply credentials
through the environment; never put a token into source or command arguments.
GitHub Pages could serve this static output too, but Pages keeps DNS and hosting
with the existing Cloudflare deployment and avoids another deployment platform.

Before publication, inspect desktop and mobile, test search in each translated
guide, follow web→docs and docs→web links, and fetch `/sitemap-index.xml` and
`/robots.txt`. Do not claim a domain is live based only on a successful build.

The scoped `postcss-nested` override uses selector parser 7.1.6 to address
[GHSA-rj75-hqrm-r3gf](https://github.com/advisories/GHSA-rj75-hqrm-r3gf).
The static build and generated-link checks verify this dependency combination.
Remove the override when Expressive Code's dependency chain includes a patched
parser itself. Do not force an unrelated Starlight downgrade to resolve audits.
