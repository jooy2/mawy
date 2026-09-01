/**
 * What a consumer actually pays, measured the way they would pay it.
 *
 * `npm pack`'s size and the numbers on a package page both answer a different
 * question than the one that matters here: what does a page that only *reads*
 * documents ship? An editor built on `contenteditable`, an undo history, a
 * paste pipeline and a toolbar is most of this package, and a viewer should
 * carry none of it. Tree shaking is the whole answer to that, and it is the one
 * thing a tarball's size cannot see — a package can double a consumer's bundle
 * without its own tarball changing by a byte.
 *
 * So this bundles `dist/` for real, against fixed scenarios, and compares the
 * result to `size-budget.json`. Three things make the number the consumer's
 * rather than a flattering one:
 *
 * - **React is external, `lucide-react` is not.** React is in the application
 *   already; the icons arrive because of us and are counted as ours.
 * - **gzip, not raw.** Every server on the path compresses.
 * - **The stylesheet is in the table.** It is a file a consumer imports and a
 *   browser downloads, and leaving it out of a size budget because it is not
 *   JavaScript would be measuring the half that flatters.
 *
 * Run `npm run size` to print the table, and `npm run size -- --update` to
 * write the current numbers back into the budget after a change meant to move
 * them.
 */
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';
import * as esbuild from 'esbuild';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const budgetPath = resolve(root, 'size-budget.json');
const update = process.argv.includes('--update');

/** React is the consumer's; everything else on the graph is ours. */
const EXTERNAL = ['react', 'react-dom', 'react/jsx-runtime', 'react-dom/client'];

/**
 * The shapes a consumer comes in.
 *
 * The viewer alone is the one that matters most and the one a barrel export
 * gets wrong: a documentation page, a comment thread, a release note — nothing
 * on any of them is editable, and none of the editor should be on them either.
 * The highlighter is its own entry point for the same reason and is measured
 * separately to show what asking for it costs.
 */
const SCENARIOS = [
  { name: 'MawyViewer', entry: 'mawy-react', imports: ['MawyViewer'] },
  { name: 'MawyEditor', entry: 'mawy-react', imports: ['MawyEditor'] },
  { name: 'Both', entry: 'mawy-react', imports: ['MawyEditor', 'MawyViewer'] },
  { name: 'The highlighter', entry: 'mawy-react/highlight', imports: ['mawyHighlighter'] },
  { name: 'styles.css', stylesheet: 'dist/styles.css' }
];

const gzip = (text) => gzipSync(Buffer.from(text), { level: 9 }).length;
const kb = (bytes) => `${(bytes / 1024).toFixed(1)} kB`;

/**
 * Node's own resolver, in a child process, on every entry point the package
 * claims to have.
 *
 * This is here because it is the failure a bundler hides: an extensionless
 * specifier is resolved by every bundler there is and by Node — which is what
 * runs a server render — not at all. The package can be broken for SSR while
 * every test in the suite passes, and a viewer is the half of this package most
 * likely to be rendered on a server.
 */
function checkNodeResolution() {
  const specifiers = ['mawy-react', 'mawy-react/types', 'mawy-react/highlight'];
  const dir = mkdtempSync(resolve(tmpdir(), 'mawy-resolve-'));

  try {
    writeFileSync(
      resolve(dir, 'package.json'),
      JSON.stringify({ type: 'module', dependencies: { 'mawy-react': `file:${root}` } })
    );
    execFileSync('npm', ['install', '--no-audit', '--no-fund', '--ignore-scripts'], {
      cwd: dir,
      stdio: 'ignore'
    });
    writeFileSync(
      resolve(dir, 'check.mjs'),
      specifiers.map((name) => `await import(${JSON.stringify(name)});`).join('\n')
    );
    execFileSync(process.execPath, ['check.mjs'], { cwd: dir, stdio: 'pipe' });

    return { ok: true, count: specifiers.length };
  } catch (error) {
    return { ok: false, message: String(error.stderr ?? error.message).slice(0, 800) };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

/**
 * Which file each public specifier is, so a scenario can name the entry point
 * the way a consumer writes it.
 *
 * The bundle imports the file rather than the specifier on purpose: an alias
 * from `mawy-react` to this folder is an alias `mawy-react/highlight` follows
 * into a path that does not exist, and asking esbuild to honour the `exports`
 * map from a temporary directory outside the package is more machinery than
 * the question needs. Whether those specifiers resolve at all is the check
 * above, which asks Node rather than a bundler — which is the one that matters,
 * because a bundler will forgive what a server render will not.
 */
const ENTRY_POINTS = {
  'mawy-react': 'dist/index.js',
  'mawy-react/highlight': 'dist/highlight.js'
};

async function bundle({ entry, imports }) {
  const from = JSON.stringify(resolve(root, ENTRY_POINTS[entry]));
  const source = `import { ${imports.join(', ')} } from ${from};\nexport { ${imports.join(', ')} };\n`;
  const dir = mkdtempSync(resolve(tmpdir(), 'mawy-size-'));

  try {
    const file = resolve(dir, 'entry.js');

    writeFileSync(file, source);

    const result = await esbuild.build({
      entryPoints: [file],
      bundle: true,
      format: 'esm',
      minify: true,
      treeShaking: true,
      write: false,
      logLevel: 'silent',
      external: EXTERNAL,
      define: { 'process.env.NODE_ENV': '"production"' }
    });

    return gzip(result.outputFiles[0].text);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

const resolution = checkNodeResolution();

if (resolution.ok) {
  console.log(`✓ Node resolved all ${resolution.count} entry points\n`);
} else {
  console.error('✗ Node could not load dist/, which is how a server render fails:\n');
  console.error(resolution.message);
  process.exitCode = 1;
}

const budget = JSON.parse(readFileSync(budgetPath, 'utf8'));
const measured = {};
let regressed = false;

console.log(
  'scenario'.padEnd(20) + 'gzip'.padStart(10) + 'budget'.padStart(12) + 'change'.padStart(12)
);
console.log('-'.repeat(54));

for (const scenario of SCENARIOS) {
  const bytes = scenario.stylesheet
    ? gzip(readFileSync(resolve(root, scenario.stylesheet)))
    : await bundle(scenario);
  const allowed = budget.scenarios[scenario.name];
  const delta = allowed === undefined ? null : bytes - allowed;
  /*
   * A budget is a ceiling with a little air in it. A two per cent swing is a
   * bundler's patch release rather than a regression worth failing a build for,
   * and a budget that cried wolf on those would be one nobody read.
   */
  const over = allowed !== undefined && bytes > allowed * 1.02;

  measured[scenario.name] = bytes;

  if (over) {
    regressed = true;
  }

  console.log(
    scenario.name.padEnd(20) +
      kb(bytes).padStart(10) +
      (allowed === undefined ? '—' : kb(allowed)).padStart(12) +
      (delta === null ? '—' : `${delta >= 0 ? '+' : ''}${(delta / 1024).toFixed(1)} kB`).padStart(
        12
      ) +
      (over ? '  ✗' : '')
  );
}

if (update) {
  writeFileSync(budgetPath, `${JSON.stringify({ ...budget, scenarios: measured }, null, 2)}\n`);
  console.log('\nsize-budget.json written');
} else if (regressed) {
  console.error('\n✗ Over budget. If that is the change you meant, `npm run size -- --update`');
  process.exitCode = 1;
}
