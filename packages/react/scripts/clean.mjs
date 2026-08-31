/**
 * Empties `dist/` before a build fills it again.
 *
 * `tsc` writes the files it compiles and removes nothing, so a source file that
 * is renamed or deleted leaves its output behind for ever — and `npm publish`
 * ships whatever is in the folder. That is not a broken package, since nothing
 * imports a module that no longer exists, but it is a published file that is
 * not in the source, and the two should be the same thing.
 *
 * `node` rather than `rm -rf`: this runs from `prepare` as well as from `build`,
 * which means it runs on whatever machine installs the package from git, and a
 * shell built-in is not something to assume about that machine.
 */
import { rmSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const distDir = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'dist');

rmSync(distDir, { recursive: true, force: true });
