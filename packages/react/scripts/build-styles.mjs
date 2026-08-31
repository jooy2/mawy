/**
 * Puts the package's CSS into `dist/`.
 *
 * `tsc` compiles TypeScript and copies nothing else, so a stylesheet that lives
 * beside the component it belongs to would simply not be in the published
 * package. This copies every `.css` under `src/` to the same path under `dist/`,
 * which is what the `exports` map already points at.
 *
 * A copy rather than a bundle on purpose: the CSS is authored as the finished
 * thing, and a build step that rewrote it would be a second place for the
 * output to differ from the source.
 */
import { cpSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const packageDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const srcDir = resolve(packageDir, 'src');
const distDir = resolve(packageDir, 'dist');

if (!existsSync(distDir)) {
  mkdirSync(distDir, { recursive: true });
}

cpSync(srcDir, distDir, {
  recursive: true,
  filter: (source) => !/\.tsx?$/.test(source)
});
