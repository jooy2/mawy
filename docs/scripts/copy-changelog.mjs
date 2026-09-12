/**
 * Puts both packages' `CHANGELOG.md` on the docs site, as one page.
 *
 * A package keeps its changelog beside its manifest, where its registry and a
 * reader browsing that package both expect to find it. Keeping a second copy
 * under `docs/` would be two files that say the same thing until the day one of
 * them does not, so the docs' copy is generated instead — written before
 * VitePress starts and ignored by git.
 *
 * **One page rather than one each**, which is how the rest of this site handles
 * two packages: both halves go in `::: fw` blocks and CSS displays the one the
 * reader picked. A page each would need a sidebar that hides a row per
 * framework, which this theme has no way to do — so a Flutter reader would be
 * offered React's history in a menu next to their own, and the search index
 * would carry a page that half the readers were never meant to open.
 *
 * The two version independently, and nothing here pretends otherwise: each half
 * is that package's file, whole, under a line naming which package it is.
 *
 * What is added on the way in:
 *
 * - **The frontmatter.** The sidebar reads `title` for the label and `order`
 *   for where it sits, and a source file cannot carry either without npm and
 *   GitHub rendering it as a stray table at the top. `outline: 2` narrows the
 *   margin to the versions: this site shows `h3` as well, which is right for a
 *   reference page and here would be `Added` and `Fixed` seventeen times.
 * - **The heading and the note at the top**, which belong to the page rather
 *   than to either package, so neither file grows a line that only makes sense
 *   on a website.
 * - **The package's name on every version heading.** Both packages have
 *   reached 1.2.0, so both files have a `## 1.2.0` in them and the two would
 *   land on one anchor — with the loser silently becoming `-1`, which is a link
 *   to a heading nobody can see under the other framework. Naming the package
 *   in the heading itself rather than writing an explicit `{#anchor}`: the
 *   anchor VitePress derives is then unique on its own, and the permalink beside
 *   the heading gets an `aria-label` a screen reader can read out — with an
 *   explicit anchor it reads the braces and the hash as words. It says the
 *   useful thing on a page holding two histories besides.
 *
 * The outline in the margin needs nothing from any of this: `Layout.vue`
 * already walks from each entry to its heading and drops the ones inside the
 * other half's block.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const docsDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const repoRoot = resolve(docsDir, '..');

/** One entry per locale served by the docs. Keep in step with `supportLocales`. */
const titles = {
  en: 'Changelog',
  ko: '변경 기록'
};

/**
 * The line under the page's heading, in each locale.
 *
 * Two things at once: that the entries are English wherever the page is not,
 * and that what is shown follows the switch in the sidebar. A reader who has
 * picked Flutter and is looking at a list of `mawy-react` versions should be
 * able to find out why without leaving the page.
 */
const notes = {
  en: 'Each package versions on its own. This page shows the one you picked in the sidebar.',
  ko: '두 패키지는 각자 버전을 매깁니다. 이 페이지는 사이드바에서 고른 쪽을 보여 줍니다. 변경 기록은 패키지와 함께 관리하며 영어로 작성하므로, 아래 항목은 원문 그대로입니다.'
};

/** Which package's changelog is which half of the page. */
const packages = [
  { framework: 'react', pkg: 'mawy-react', source: 'packages/react/CHANGELOG.md' },
  { framework: 'flutter', pkg: 'mawy', source: 'packages/flutter/CHANGELOG.md' }
];

/**
 * A version heading, with the package it belongs to in front of it.
 *
 * Only `##`, which is what a version is in both files. The `###` under them are
 * `Added` and `Fixed` and every other page has those too; there is nothing to
 * be gained from naming a heading nobody links to.
 */
function named(changelog, pkg) {
  return changelog.replace(/^## (.+)$/gm, (line, heading) => `## ${pkg} ${heading}`);
}

/**
 * One package's changelog, as the half of the page its readers see.
 *
 * The file's own `# Changelog` and the blockquote under it go: the page has a
 * heading already, and the note about the two versioning independently is said
 * once above rather than twice inside. Nothing else says which package this is,
 * because every version heading now does.
 */
function half({ framework, pkg, source }) {
  const changelog = readFileSync(resolve(repoRoot, source), 'utf8')
    .replace(/^# Changelog\n+> [^\n]*\n+/, '')
    .trimEnd();

  return [`::: fw ${framework}`, '', named(changelog, pkg), '', ':::'].join('\n');
}

for (const [locale, title] of Object.entries(titles)) {
  const target = resolve(docsDir, locale, 'changelog.md');

  mkdirSync(dirname(target), { recursive: true });

  writeFileSync(
    target,
    [
      '---',
      `title: ${title}`,
      'order: 1',
      'editLink: false',
      'outline: 2',
      '---',
      '',
      `# ${title}`,
      '',
      notes[locale] ?? notes.en,
      '',
      packages.map(half).join('\n\n'),
      ''
    ].join('\n'),
    'utf8'
  );
}
