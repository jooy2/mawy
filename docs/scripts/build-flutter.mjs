/**
 * Builds the Flutter gallery into `public/flutter`, for the previews to frame.
 *
 * The Flutter previews on this site are the *real* Flutter build rather than a
 * screenshot or a stand-in, which is the whole reason they are worth having:
 * the two packages are one library, and a page that showed a picture of one of
 * them would be a page nobody could tell had gone wrong.
 *
 * It is a separate step from `vitepress build` because it needs a Flutter SDK,
 * and most of the time nobody editing prose has one or wants to wait for it.
 * Without the build the previews say so and offer the React half instead —
 * `MawyDemo.vue` asks for one small file before it frames anything.
 *
 *     npm run flutter    # once, then `npm run dev` as usual
 *
 * The output is git-ignored. The deploy workflow runs this before the site
 * build; a local `npm run dev` runs it only when somebody asks.
 */
import { spawnSync } from 'node:child_process';
import { existsSync, rmSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const docsDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const exampleDir = resolve(docsDir, '../packages/flutter/example');
const outDir = resolve(docsDir, 'public/flutter');

if (!existsSync(exampleDir)) {
  throw new Error(`No gallery at ${exampleDir}.`);
}

/*
 * `--base-href /flutter/` is what makes the built app load its own assets from
 * where it actually sits. Without it every request goes to the site's root and
 * the frame is a blank rectangle.
 *
 * `--wasm` is deliberately not passed: the previews are small frames on a
 * documentation page, and CanvasKit's download is already the largest thing on
 * one. HTML rendering is what a paragraph of Markdown needs.
 */
const build = spawnSync(
  'flutter',
  ['build', 'web', '--release', '--base-href', '/flutter/', '--output', outDir],
  { cwd: exampleDir, stdio: 'inherit' }
);

if (build.error?.code === 'ENOENT') {
  throw new Error('No `flutter` on the path. The previews will offer the React half instead.');
}

if (build.status !== 0) {
  // A half-written output is worse than none: the probe in `MawyDemo.vue` would
  // find `version.json` and frame something broken.
  rmSync(outDir, { recursive: true, force: true });

  throw new Error(`\`flutter build web\` exited with ${build.status}.`);
}

console.log(`Built the gallery into ${outDir}`);
