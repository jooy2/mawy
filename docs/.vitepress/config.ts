import { existsSync, readFileSync } from 'node:fs';
import { writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import ReactPlugin from '@vitejs/plugin-react';
import container from 'markdown-it-container';
import { withSidebar } from 'vitepress-sidebar';
import packageJson from '../../packages/react/package.json' with { type: 'json' };
import {
  defineConfig,
  HeadConfig,
  MarkdownRenderer,
  SiteData,
  TransformContext,
  UserConfig
} from 'vitepress';
import { withI18n } from 'vitepress-i18n';
import type { VitePressI18nOptions } from 'vitepress-i18n/types';
import type { VitePressSidebarOptions } from 'vitepress-sidebar/types';
import { FRAMEWORK_HEAD_SCRIPT, FRAMEWORK_IDS } from './data/frameworks';

const vitePressDir = dirname(fileURLToPath(import.meta.url));
/** `docs/`, which is where the locale folders live and what VitePress serves. */
const srcDir = resolve(vitePressDir, '..');
/** The React package's source, which the live demos render straight from. */
const reactPackageDir = resolve(srcDir, '../packages/react');

const defaultLocale: string = 'en';
const supportLocales: string[] = [defaultLocale, 'ko'];
const editLinkPattern = `${packageJson.repository.url}/edit/main/docs/:path`;

const siteUrl = packageJson.homepage.replace(/\/+$/, '');
const repoUrl = packageJson.repository.url.replace(/\.git$/, '');
const npmUrl = `https://www.npmjs.com/package/${packageJson.name}`;

/** The card image. A square mark, which is why the Twitter card is `summary`. */
const socialImage = `${siteUrl}/256x256.png`;

/** `/` for whichever locale is the default, `/{lang}/` for every other one. */
const localeBase = (lang: string) => (lang === defaultLocale ? '/' : `/${lang}/`);

const commonSidebarConfig: VitePressSidebarOptions = {
  collapsed: false,
  capitalizeFirst: true,
  useTitleFromFileHeading: true,
  useTitleFromFrontmatter: true,
  useFolderTitleFromIndexFile: true,
  // Without this the API group stops linking to the index page that lists
  // everything in it.
  useFolderLinkFromIndexFile: true,
  frontmatterOrderDefaultValue: 9,
  sortMenusByFrontmatterOrder: true
};

/**
 * The sidebar groups the folder tree cannot name.
 *
 * `guide/` has no `index.md` and the changelog is a loose page, so neither can
 * take its heading from a page the way `api/` does. Left to the generator,
 * `guide/` would be capitalised to "Guide" over Korean pages and the changelog
 * would sit at the root with no heading over it at all.
 */
const groupLabels: Record<string, { guide: string; overview: string; more: string }> = {
  en: { guide: 'Guide', overview: 'Overview', more: 'Discover more' },
  ko: { guide: '가이드', overview: '개요', more: '더 알아보기' }
};

const vitePressSidebarConfig = supportLocales.map((lang) => ({
  ...commonSidebarConfig,
  // Relative to the working directory, which is this `docs/` folder —
  // `vitepress-sidebar` joins it onto `process.cwd()`.
  documentRootPath: `/${lang}`,
  resolvePath: localeBase(lang),
  ...(defaultLocale === lang ? {} : { basePath: localeBase(lang) })
}));

/** The same two destinations in every locale, prefixed with its base. */
const navFor = (lang: string, labels: [string, string]) => [
  { text: labels[0], link: `${localeBase(lang)}guide/getting-started` },
  { text: labels[1], link: `${localeBase(lang)}api/` }
];

const vitePressI18nConfig: VitePressI18nOptions = {
  locales: supportLocales,
  rootLocale: defaultLocale,
  searchProvider: 'local',
  description: {
    en: 'A Markdown editor that also does the reading — write in WYSIWYG or in the source, switch freely, and show the finished document through a read-only viewer.',
    ko: '마크다운을 쓰고 보여주는 일을 하나로 묶은 에디터. 위지윅 화면과 원문 화면을 오가며 쓰고, 다 쓴 문서는 읽기 전용 뷰어로 그대로 보여줍니다.'
  },
  themeConfig: {
    en: { nav: navFor('en', ['Guide', 'API']) },
    ko: { nav: navFor('ko', ['가이드', 'API']) }
  }
};

/* ---------------------------------------------------------------------------
 * Search engines
 *
 * Two things a documentation site gets wrong by default, and both of them are
 * per page rather than per site:
 *
 * - **Every page ships the same description.** VitePress falls back to the
 *   site's own whenever a page declares none, so every page carries one
 *   sentence between them and not one of them says what it is about. The lede
 *   a page already opens with is written to be exactly this, so it is read out
 *   of the source instead.
 * - **Nothing says the two locales are the same page.** Without `hreflang` a
 *   crawler has no reason to connect `/guide/editor` to its Korean counterpart,
 *   and treats them as two documents competing for one query.
 * ------------------------------------------------------------------------- */

/**
 * The BCP-47 tag the site itself declares for a locale — `en` → `en-US`.
 *
 * Read back off the resolved config rather than written out again, because
 * VitePress's own sitemap already emits `hreflang` from exactly these values.
 */
function langTagOf(siteData: SiteData, lang: string): string {
  return siteData.locales[lang === defaultLocale ? 'root' : lang]?.lang ?? lang;
}

/** `en/guide/editor.md` → `/guide/editor`. */
function pathOf(filePath: string): string {
  const [lang, ...rest] = filePath.split('/');
  const page = rest
    .join('/')
    .replace(/(^|\/)index\.md$/, '$1')
    .replace(/\.md$/, '');

  return `${localeBase(lang)}${page}`;
}

/** Everything below the locale folder — the part two locales have in common. */
function pageOf(filePath: string): string {
  return filePath.split('/').slice(1).join('/');
}

/** Inline Markdown and HTML dropped: a `<meta>` carries text and nothing else. */
function plainText(source: string): string {
  return source
    .replace(/<[^>]+>/g, ' ')
    .replace(/!\[[^\]]*]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]*)]\([^)]*\)/g, '$1')
    .replace(/[`*_]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Cut at a word boundary, to about what a result page will show whole. */
function clamp(text: string, limit = 160): string {
  if (text.length <= limit) {
    return text;
  }

  const cut = text.slice(0, limit);
  const boundary = cut.lastIndexOf(' ');

  return `${(boundary > 0 ? cut.slice(0, boundary) : cut).trimEnd()}…`;
}

/**
 * A page's own one-line summary: the first block that is prose rather than the
 * title, a fenced example, a table or one of the components a page is built
 * out of.
 */
function summaryOf(filePath: string): string | undefined {
  const file = resolve(srcDir, filePath);

  if (!existsSync(file)) {
    return undefined;
  }

  const source = readFileSync(file, 'utf8');

  for (const block of source.replace(/^---\r?\n[\s\S]*?\r?\n---/, '').split(/\n\s*\n/)) {
    const trimmed = block.trim();

    if (!trimmed || /^[#<`:|>-]/.test(trimmed)) {
      continue;
    }

    const text = plainText(trimmed);

    if (text) {
      return clamp(text);
    }
  }

  return undefined;
}

/** The locales that actually have this page — a mirror is not a guarantee. */
function localesWith(filePath: string): string[] {
  const page = pageOf(filePath);

  return supportLocales.filter((lang) => existsSync(resolve(srcDir, lang, page)));
}

/** What the package is, for the one page in each locale that is about it. */
function structuredData(description: string, url: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'SoftwareSourceCode',
    name: 'Mawy',
    description,
    url,
    codeRepository: repoUrl,
    programmingLanguage: ['TypeScript'],
    runtimePlatform: ['React'],
    license: 'https://opensource.org/licenses/MIT',
    author: { '@type': 'Organization', name: 'CDGet', url: 'https://cdget.com' },
    sameAs: [repoUrl, npmUrl]
  };
}

/**
 * The half of the metadata that is different on every page.
 *
 * Only runs at build time — `transformPageData` is what the dev server sees —
 * so the tags below are checked by reading a built page, not the preview.
 */
function transformHead({ pageData, siteData, title, description }: TransformContext): HeadConfig[] {
  const { filePath } = pageData;

  // A dynamic route, or the built-in 404: no source file, so no canonical URL
  // and nothing to point an alternate at.
  if (!filePath) {
    return [];
  }

  const lang = filePath.split('/')[0];
  const url = `${siteUrl}${pathOf(filePath)}`;
  const translations = localesWith(filePath);

  // Open Graph writes a BCP-47 tag with an underscore in it, and nothing else.
  const ogLocale = (of: string) => langTagOf(siteData, of).replace('-', '_');

  const head: HeadConfig[] = [
    ['link', { rel: 'canonical', href: url }],
    ['meta', { property: 'og:url', content: url }],
    ['meta', { property: 'og:title', content: title }],
    ['meta', { property: 'og:description', content: description }],
    ['meta', { property: 'og:locale', content: ogLocale(lang) }],
    ['meta', { name: 'twitter:title', content: title }],
    ['meta', { name: 'twitter:description', content: description }]
  ];

  for (const other of translations) {
    head.push([
      'link',
      {
        rel: 'alternate',
        hreflang: langTagOf(siteData, other),
        href: `${siteUrl}${pathOf(`${other}/${pageOf(filePath)}`)}`
      }
    ]);

    if (other !== lang) {
      head.push(['meta', { property: 'og:locale:alternate', content: ogLocale(other) }]);
    }
  }

  // Which one a crawler should serve to a reader it cannot place. The default
  // locale is the one that is served from `/`.
  if (translations.includes(defaultLocale)) {
    head.push([
      'link',
      {
        rel: 'alternate',
        hreflang: 'x-default',
        href: `${siteUrl}${pathOf(`${defaultLocale}/${pageOf(filePath)}`)}`
      }
    ]);
  }

  if (pageData.frontmatter.layout === 'home') {
    head.push([
      'script',
      { type: 'application/ld+json' },
      JSON.stringify(structuredData(description, url))
    ]);
  }

  return head;
}

// Ref: https://vitepress.dev/reference/site-config
const vitePressConfig: UserConfig = {
  title: 'Mawy',
  lastUpdated: true,
  outDir: '../docs-dist',
  cleanUrls: true,
  metaChunk: true,
  /**
   * The default locale is served from `/`, not from `/{lang}/`.
   *
   * This has to agree with two other things or every sidebar link 404s:
   * `vitepress-i18n` puts the root locale in `locales.root` (no path prefix),
   * and `vitepress-sidebar` is told to resolve its links against `/`. The
   * rewrite is what actually moves `docs/{defaultLocale}/**` there. Every other
   * locale keeps its folder as its prefix. Switching `defaultLocale` swings all
   * three together.
   */
  rewrites: {
    [`${defaultLocale}/:rest*`]: ':rest*'
  },
  head: [
    ['link', { rel: 'icon', type: 'image/png', sizes: '32x32', href: '/logo-32.png' }],
    ['link', { rel: 'icon', type: 'image/png', sizes: '16x16', href: '/logo-16.png' }],
    ['link', { rel: 'icon', type: 'image/png', sizes: '256x256', href: '/256x256.png' }],
    ['link', { rel: 'apple-touch-icon', sizes: '180x180', href: '/256x256.png' }],
    // Last, and without a `type`: this is the one a browser reaches for when it
    // has understood none of the above, and `favicon.ico` carries 16, 32 and 48
    // in one file for exactly that case.
    ['link', { rel: 'shortcut icon', href: '/favicon.ico' }],
    // `--vp-c-brand-2`, as a literal: a `<meta>` cannot read a custom property,
    // and this is the one place in the site that has to repeat one.
    ['meta', { name: 'theme-color', content: '#5b34ea' }],
    // The half of the metadata that is the same on every page. The other half —
    // the canonical URL, the title, the description, the locale alternates — is
    // per page and lives in `transformHead`.
    ['meta', { property: 'og:type', content: 'website' }],
    ['meta', { property: 'og:site_name', content: 'Mawy' }],
    ['meta', { property: 'og:image', content: socialImage }],
    ['meta', { property: 'og:image:width', content: '256' }],
    ['meta', { property: 'og:image:height', content: '256' }],
    ['meta', { property: 'og:image:alt', content: 'Mawy' }],
    // `summary` and not `summary_large_image`: the image is a square mark, and
    // a wide card would letterbox it into a strip of background.
    ['meta', { name: 'twitter:card', content: 'summary' }],
    ['meta', { name: 'twitter:image', content: socialImage }],
    // Which package's half of every page is displayed, applied to `<html>`
    // before the first paint. See `data/frameworks.ts`.
    ['script', {}, FRAMEWORK_HEAD_SCRIPT]
  ],
  sitemap: {
    hostname: packageJson.homepage
  },
  /**
   * `::: fw react` … `:::` — the block that only one package's readers see.
   *
   * Both halves are in the document and CSS displays one of them, which is what
   * makes the switch instant and what keeps the two from being two pages that
   * drift apart. It also means the search index carries both, so a reader
   * looking up `onLinkTap` finds the viewer page whichever package they had
   * selected.
   */
  markdown: {
    config(md: MarkdownRenderer) {
      md.use(container, 'fw', {
        validate: (params: string) => /^fw(\s+\S+)+$/.test(params.trim()),
        render(tokens: { nesting: number; info: string }[], index: number) {
          const token = tokens[index];

          if (token.nesting !== 1) {
            return '</div>\n';
          }

          // `::: fw flutter`, and `::: fw react flutter` for a block both of
          // them want but nobody else does.
          const wanted = token.info
            .trim()
            .split(/\s+/)
            .slice(1)
            .filter((id) => FRAMEWORK_IDS.includes(id));

          return `<div class="mawy-fw" data-fw="${wanted.join(' ')}">\n`;
        }
      });
    }
  },
  /* -------------------------------------------------------------------------
   * The live demos
   *
   * VitePress compiles Markdown to Vue, so a React component reaches a page
   * only as an island — `theme/components/MawyDemo.vue` owns a `<div>` and
   * hands it to `createRoot()`. This is the half of that arrangement that is
   * about the build.
   *
   * `mawy-react` points at `packages/react/src` rather than at its `dist/`, and that
   * is the point: an edit to the viewer is on the page when it is saved, with
   * nothing to rebuild in between. Nothing on this site ever reads `dist/`.
   * ---------------------------------------------------------------------- */
  vite: {
    plugins: [ReactPlugin()],
    resolve: {
      alias: [
        {
          find: /^mawy-react\/styles\.css$/,
          replacement: resolve(reactPackageDir, 'src/styles.css')
        },
        {
          find: /^mawy-react\/highlight$/,
          replacement: resolve(reactPackageDir, 'src/highlight.ts')
        },
        { find: /^mawy-react$/, replacement: resolve(reactPackageDir, 'src/index.ts') }
      ],
      /*
       * What the aliased source is allowed to import.
       *
       * `dedupe` resolves these from this folder rather than from beside the
       * file that imported them, and that is doing two jobs. For React it is
       * the usual one: two copies is not a bigger bundle, it is a null hook
       * dispatcher the moment the second package renders something.
       *
       * For `lucide-react` it is the only thing that makes the import resolve
       * at all. The alias points at `packages/react/src`, so Node's own lookup
       * walks up from *there* and lands in `packages/react/node_modules` — a
       * folder this site never installs and CI does not have. Anything the
       * library's source imports has to be a devDependency here *and* on this
       * list. Missing either one builds fine on a machine that has run
       * `npm install` in both folders, and fails in CI, which has not.
       */
      dedupe: ['react', 'react-dom', 'lucide-react']
    },
    optimizeDeps: {
      include: ['react', 'react-dom', 'react-dom/client', 'lucide-react']
    },
    // The library is outside `docs/`, so the dev server has to be allowed to
    // read it. Without this the alias resolves and the request is refused.
    server: {
      fs: { allow: [srcDir, reactPackageDir] }
    }
  },
  /**
   * `robots.txt`, written rather than committed.
   *
   * It exists to name the sitemap, and the sitemap's own URL is already derived
   * from `package.json`. A copy of that host sitting in `public/` would be one
   * more place to forget when the site moves.
   */
  async buildEnd({ outDir }) {
    await writeFile(
      resolve(outDir, 'robots.txt'),
      `User-agent: *\nAllow: /\n\nSitemap: ${siteUrl}/sitemap.xml\n`
    );
  },
  /**
   * A description that is about this page rather than about the library.
   *
   * Runs in the dev server as well as in the build, which is what makes it the
   * right place for the description — `transformHead` would have to repeat the
   * fallback chain VitePress already applies to `pageData.description`.
   */
  transformPageData(pageData) {
    if (!pageData.description && pageData.filePath) {
      pageData.description = summaryOf(pageData.filePath) ?? '';
    }
  },
  transformHead,
  themeConfig: {
    logo: { src: '/logo-32.png', width: 24, height: 24 },
    /**
     * `h2` and `h3`, nested.
     *
     * A reference page is a handful of `h2`s with the individual options as
     * `h3`s under them, and the thing a reader came for is the option they are
     * looking up. At the default depth it is never in the outline.
     */
    outline: { level: [2, 3] },
    editLink: {
      pattern: editLinkPattern
    },
    socialLinks: [
      { icon: 'npm', link: npmUrl },
      { icon: 'github', link: repoUrl }
    ],
    footer: {
      message: 'Released under the MIT License',
      copyright: '© <a href="https://cdget.com">CDGet</a>'
    }
  }
};

/* ---------------------------------------------------------------------------
 * Sidebar post-processing
 *
 * `vitepress-sidebar` derives the menu from the folder tree, which gets three
 * things wrong for this site — and none of the three can be fixed by moving
 * files around without also changing a URL. So the generated tree is reshaped
 * here instead, once, for every locale.
 * ------------------------------------------------------------------------- */

interface GeneratedSidebarItem {
  text?: string;
  link?: string;
  items?: GeneratedSidebarItem[];
  collapsed?: boolean;
}

/**
 * `useFolderLinkFromIndexFile` points a folder at `api/index.md`, which
 * VitePress resolves to `/api/index` — a URL that only works because the SPA
 * router is forgiving about it. The canonical one, and the only one a static
 * host serves directly, is `/api/`.
 *
 * `collapsed` goes at the same time: VitePress draws the expand/collapse caret
 * for any item where `collapsed != null`, so the only way to have permanently
 * open groups with no toggle is for the key to be absent entirely.
 */
function cleanUpItems<T extends GeneratedSidebarItem>(items: T[]): T[] {
  return items.map((item) => {
    const cleaned = {
      ...item,
      ...(item.link ? { link: item.link.replace(/(^|\/)index\.md$/, '$1') } : {}),
      ...(item.items ? { items: cleanUpItems(item.items) } : {})
    };

    delete cleaned.collapsed;

    return cleaned;
  });
}

/** The first link anywhere in a subtree — how a group is identified below. */
function firstLink(item: GeneratedSidebarItem): string | undefined {
  return item.link ?? item.items?.map(firstLink).find(Boolean);
}

const startsWith = (prefix: string) => (item: GeneratedSidebarItem) =>
  firstLink(item)?.startsWith(prefix) ?? false;

/**
 * Guide, then API, then anything loose under a heading of its own.
 *
 * None of that can be stated by the folder tree: it sorts `api/` above
 * `guide/` whichever way the two are named, and a reader who has not installed
 * the package yet wants the guide first. The changelog is a loose page with
 * nothing above it, so it is given a group — the place anything that is neither
 * a guide nor reference ends up.
 */
function arrangeSidebar<T extends GeneratedSidebarItem>(items: T[], lang: string): T[] {
  const labels = groupLabels[lang] ?? groupLabels[defaultLocale];

  const guide = items.find(startsWith('guide/'));
  const api = items.find(startsWith('api/'));
  const changelog = items.find(startsWith('changelog'));

  if (guide) {
    guide.text = labels.guide;
  }

  // Only once `api/` holds more than its index. Until then it is a single row
  // and a heading over one entry would be noise.
  //
  // `useFolderLinkFromIndexFile` points the *heading* at `api/index.md`, which
  // means the page listing everything in the group is reachable only by
  // clicking a word that does not look like a link. It becomes a row of its own
  // instead, and the heading stops being clickable.
  if (api?.items?.length) {
    const overview = api.link
      ? ({ text: labels.overview, link: api.link } as unknown as T)
      : undefined;

    delete api.link;
    api.items = [...([overview].filter(Boolean) as T[]), ...api.items];
  }

  const more = changelog ? ({ text: labels.more, items: [changelog] } as unknown as T) : undefined;
  const moved = new Set([guide, api, changelog].filter(Boolean));

  return [
    ...([guide, api, more].filter(Boolean) as T[]),
    ...items.filter((item) => !moved.has(item))
  ];
}

const config = withSidebar(withI18n(vitePressConfig, vitePressI18nConfig), vitePressSidebarConfig);

const sidebar = config.themeConfig?.sidebar as
  Record<string, { items?: GeneratedSidebarItem[] } | GeneratedSidebarItem[]> | undefined;

if (sidebar) {
  for (const [path, group] of Object.entries(sidebar)) {
    // `/` is the default locale and `/{lang}/` is every other one — the same
    // mapping `localeBase` makes, read back the other way.
    const lang = path === '/' ? defaultLocale : path.replaceAll('/', '');

    if (Array.isArray(group)) {
      sidebar[path] = arrangeSidebar(cleanUpItems(group), lang);
    } else if (group?.items) {
      group.items = arrangeSidebar(cleanUpItems(group.items), lang);
    }
  }
}

export default defineConfig(config);
