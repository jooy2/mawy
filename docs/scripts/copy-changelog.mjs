/**
 * Puts each package's `CHANGELOG.md` on the docs site.
 *
 * A package keeps its changelog beside its manifest, where npm and a reader
 * browsing that package both expect to find it. Keeping a second copy under
 * `docs/` would be two files that say the same thing until the day one of them
 * does not, so the docs' copy is generated instead — written before VitePress
 * starts and ignored by git.
 *
 * The only thing added is the frontmatter: the sidebar reads `title` for the
 * label and `order` for where it sits, and the source file cannot carry either
 * without npm and GitHub rendering it as a stray table at the top.
 *
 * When a second language lands, add it to `packages` below and give it a page
 * of its own — the two version independently, so one page cannot serve both.
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
 * A line placed above the entries, for a locale the changelog is not written in.
 *
 * The changelog lives beside the package and is written in English, so the
 * Korean page carries the English entries. Saying so is better than leaving a
 * reader to work out why one page of the site changed language.
 */
const notices = {
  ko: '> 변경 기록은 패키지와 함께 관리하며 영어로 작성합니다. 아래 내용은 원문 그대로입니다.'
};

/** Which package's changelog becomes which page, per source. */
const packages = [{ source: 'packages/react/CHANGELOG.md', page: 'changelog.md' }];

for (const { source, page } of packages) {
  const changelog = readFileSync(resolve(repoRoot, source), 'utf8');

  for (const [locale, title] of Object.entries(titles)) {
    const target = resolve(docsDir, locale, page);

    mkdirSync(dirname(target), { recursive: true });
    const notice = notices[locale] ? `${notices[locale]}\n\n` : '';

    writeFileSync(
      target,
      `---\ntitle: ${title}\norder: 1\neditLink: false\n---\n\n${notice}${changelog}`,
      'utf8'
    );
  }
}
