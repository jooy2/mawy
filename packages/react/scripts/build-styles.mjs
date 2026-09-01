/**
 * Puts the package's CSS into `dist/`, minified.
 *
 * `tsc` compiles TypeScript and copies nothing else, so a stylesheet that lives
 * beside the component it belongs to would simply not be in the published
 * package. This copies every non-TypeScript file under `src/` to the same path
 * under `dist/`, which is what the `exports` map already points at, and runs
 * the stylesheets through esbuild on the way.
 *
 * The minifying is worth a word, because it used to be a plain copy. Two fifths
 * of `styles.css` is prose — why a rule is scoped the way it is, which of two
 * specificities wins, what a custom property is for — and every one of those
 * words is written for somebody reading the source rather than for a browser.
 * A reader of the documentation site pays 3.7 kB, gzipped, for comments they
 * cannot see. `src/styles.css` is still the file anybody edits and still the
 * one to read; what ships is the same rules in the same order with the prose
 * taken out.
 *
 * Which makes two things worth checking rather than assuming, and both checks
 * are at the bottom. Every `--mawy-*` custom property the source declares is
 * still declared in what shipped, because the palette is the package's whole
 * theming interface and a minifier that dropped one would be a viewer drawing
 * in the wrong colour on somebody else's page. And every `:where()` is still a
 * `:where()`, because those are the resets and a reset should be the weakest
 * thing in the room — unwrapping one would be a rule that quietly started
 * beating the styles of the page the viewer was dropped into.
 */
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { transform } from 'esbuild';

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

/** Every stylesheet under a directory, as a path relative to `src/`. */
function stylesheetsUnder(directory, prefix = '') {
  const found = [];

  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = prefix === '' ? entry.name : `${prefix}/${entry.name}`;

    if (entry.isDirectory()) {
      found.push(...stylesheetsUnder(join(directory, entry.name), path));
    } else if (entry.name.endsWith('.css')) {
      found.push(path);
    }
  }

  return found;
}

/** A stylesheet with its prose taken out, which is what a check should read. */
const withoutComments = (css) => css.replace(/\/\*[\s\S]*?\*\//g, '');

/** The names of the custom properties a stylesheet declares. */
const declaredIn = (css) => new Set(css.match(/--mawy-[\w-]+(?=\s*:)/g) ?? []);

/** How many rules a stylesheet holds at zero specificity. */
const zeroSpecificityIn = (css) => (css.match(/:where\(/g) ?? []).length;

for (const path of stylesheetsUnder(srcDir)) {
  const source = readFileSync(resolve(srcDir, path), 'utf8');
  // `target` is left alone on purpose: esbuild downlevels modern CSS to whatever
  // it is told to support, and this stylesheet is written for the browsers the
  // package supports rather than for older ones.
  const { code } = await transform(source, { loader: 'css', minify: true });

  const written = withoutComments(source);
  const lost = [...declaredIn(written)].filter((name) => !code.includes(`${name}:`));

  if (lost.length > 0) {
    throw new Error(`${path}: minifying dropped ${lost.join(', ')}`);
  }

  if (zeroSpecificityIn(code) !== zeroSpecificityIn(written)) {
    throw new Error(
      `${path}: minifying unwrapped a :where(), which is a reset that now has specificity`
    );
  }

  writeFileSync(resolve(distDir, path), code);
}
