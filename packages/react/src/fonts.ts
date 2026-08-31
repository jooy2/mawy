import type { MawyFont } from './types.js';

/**
 * The typefaces the toolbar offers, and where they come from.
 *
 * Two lists, and the difference between them is the whole point. `MAWY_SYSTEM_FONTS`
 * names roles that are already on the reader's machine — nothing is fetched, and
 * nothing can fail. `MAWY_WEB_FONTS` names real families that have to be
 * downloaded, and **it is never used unless an application passes it in**:
 *
 *     import { MAWY_SYSTEM_FONTS, MAWY_WEB_FONTS, MawyViewer } from 'mawy';
 *
 *     <MawyViewer value={document} fonts={[...MAWY_SYSTEM_FONTS, ...MAWY_WEB_FONTS]} />
 *
 * That is deliberate rather than cautious. A viewer is a component inside
 * somebody else's application, and a component that opens a connection to a
 * third party on its own has made a decision — about privacy, about offline,
 * about a request the page's own policy may refuse — that was never its to
 * make. Opting in is one line and it is the application's line.
 */

/**
 * The three roles, drawn with whatever the machine already has.
 *
 * Each resolves to `var(--mawy-font-{id})`, so what a role actually means is a
 * token an application can redeclare rather than a list this file decided.
 */
export const MAWY_SYSTEM_FONTS: readonly MawyFont[] = [
  { id: 'sans' },
  { id: 'serif' },
  { id: 'mono' }
];

/**
 * Open-licensed families, ready to be offered.
 *
 * Every one of them is under the SIL Open Font License, which permits
 * commercial use, embedding and redistribution — there is no family here that
 * an application has to buy a licence for. The Latin faces come from Google
 * Fonts; Pretendard, which is not on it, comes from jsDelivr.
 *
 * The Korean families are the second half of the list on purpose. A reader
 * whose document is in Korean and whose typeface is not gets a page set in a
 * fallback, and "the font list is Latin only" is the way that happens.
 */
export const MAWY_WEB_FONTS: readonly MawyFont[] = [
  {
    id: 'inter',
    label: 'Inter',
    stack: "'Inter', var(--mawy-font-sans)",
    href: 'https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,400..700;1,14..32,400..700&display=swap'
  },
  {
    id: 'ibm-plex-sans',
    label: 'IBM Plex Sans',
    stack: "'IBM Plex Sans', var(--mawy-font-sans)",
    href: 'https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:ital,wght@0,400;0,600;1,400;1,600&display=swap'
  },
  {
    // Drawn for readers with low vision: the letters that are usually mistaken
    // for one another are drawn so they cannot be.
    id: 'atkinson-hyperlegible',
    label: 'Atkinson Hyperlegible',
    stack: "'Atkinson Hyperlegible', var(--mawy-font-sans)",
    href: 'https://fonts.googleapis.com/css2?family=Atkinson+Hyperlegible:ital,wght@0,400;0,700;1,400;1,700&display=swap'
  },
  {
    id: 'source-serif',
    label: 'Source Serif 4',
    stack: "'Source Serif 4', var(--mawy-font-serif)",
    href: 'https://fonts.googleapis.com/css2?family=Source+Serif+4:ital,opsz,wght@0,8..60,400..700;1,8..60,400..700&display=swap'
  },
  {
    id: 'literata',
    label: 'Literata',
    stack: "'Literata', var(--mawy-font-serif)",
    href: 'https://fonts.googleapis.com/css2?family=Literata:ital,opsz,wght@0,7..72,400..700;1,7..72,400..700&display=swap'
  },
  {
    id: 'lora',
    label: 'Lora',
    stack: "'Lora', var(--mawy-font-serif)",
    href: 'https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,400..700;1,400..700&display=swap'
  },
  {
    id: 'eb-garamond',
    label: 'EB Garamond',
    stack: "'EB Garamond', var(--mawy-font-serif)",
    href: 'https://fonts.googleapis.com/css2?family=EB+Garamond:ital,wght@0,400..700;1,400..700&display=swap'
  },
  {
    id: 'jetbrains-mono',
    label: 'JetBrains Mono',
    stack: "'JetBrains Mono', var(--mawy-font-mono)",
    href: 'https://fonts.googleapis.com/css2?family=JetBrains+Mono:ital,wght@0,400..700;1,400..700&display=swap'
  },
  {
    // Not on Google Fonts. The dynamic subset splits the Korean syllables
    // across many small files, so a page draws the ones it uses and no more.
    id: 'pretendard',
    label: 'Pretendard',
    stack: "'Pretendard Variable', var(--mawy-font-sans)",
    href: 'https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css'
  },
  {
    id: 'noto-sans-kr',
    label: 'Noto Sans KR',
    stack: "'Noto Sans KR', var(--mawy-font-sans)",
    href: 'https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400..700&display=swap'
  },
  {
    id: 'noto-serif-kr',
    label: 'Noto Serif KR',
    stack: "'Noto Serif KR', var(--mawy-font-serif)",
    href: 'https://fonts.googleapis.com/css2?family=Noto+Serif+KR:wght@400..700&display=swap'
  },
  {
    id: 'nanum-myeongjo',
    label: 'Nanum Myeongjo',
    stack: "'Nanum Myeongjo', var(--mawy-font-serif)",
    href: 'https://fonts.googleapis.com/css2?family=Nanum+Myeongjo:wght@400;700&display=swap'
  },
  {
    id: 'gowun-dodum',
    label: 'Gowun Dodum',
    stack: "'Gowun Dodum', var(--mawy-font-sans)",
    href: 'https://fonts.googleapis.com/css2?family=Gowun+Dodum&display=swap'
  }
];
