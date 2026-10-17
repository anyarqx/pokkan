# Public guides

Astro 7 and Starlight 0.42 generate a static site for `https://docs.pokkan.net`.
Both projects are MIT licensed and allow commercial use. Pagefind supplies local
search without an external service, database or runtime backend.

```sh
npm ci --prefix ../front --include=dev
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

Portuguese covers the same articles as English, with shared slugs, screenshots and
editable examples. Spanish and Japanese include the beginner Guide, home page,
and Kit/account/server journeys. Starlight clearly labels remaining English
fallback articles. Fallbacks are noindex, canonicalize to English, are
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
server states. Recapture them when relevant controls change. The landing no longer
uses an overview screenshot. Keep the overview asset in the repository-level
assets directory because the main README still uses it. `pokkanicon.png` is the
existing repository brand asset.

## Editable examples

The docs build generates static message HTML with the web application's own
`EditorCanvas`, translations and presets, without adding a React runtime to the
documentation. Static examples let the browser load their images without the
application's client-only loading indicator. `src/examples/*.json` owns the additional controlled examples.
The toolbar above each example labels it as editable and opens a fresh local Kit through the ordinary importer, carrying
the example in the URL fragment. No Kit is automatically saved to an account or
sent to Discord. The three introductory examples come directly from the landing's
presets. Generated HTML/CSS stays in ignored `src/generated/`, so install the
frontend's locked dependencies before building the docs, as the CI job does.

Example photos are NASA imagery: Earthrise (Apollo 8), Earth (Apollo 17,
AS17-148-22727), Mars panorama (PIA07882) and Jupiter (PIA21985). Sources are
[NASA Science](https://science.nasa.gov/resource/earthrise/) and the
[NASA Image and Video Library](https://images.nasa.gov/). Credits include NASA,
NASA/JPL-Caltech/Cornell and NASA/JPL-Caltech/SwRI/MSSS as applicable.
See [NASA media guidelines](https://www.nasa.gov/nasa-brand-center/images-and-media/).
No NASA endorsement is implied. The two distinct ticket banners were created for
these templates and are not screenshots of product interfaces.

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
