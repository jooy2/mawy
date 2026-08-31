/**
 * Single-file components, as TypeScript sees them.
 *
 * `tsc` does not compile `.vue`, so an import of one is a module it cannot
 * resolve. The site does not typecheck the inside of a component — that is
 * `vue-tsc`'s job and this repository does not run it — so what is declared
 * here is only enough for the import in `theme/index.ts` to have a type.
 */
declare module '*.vue' {
  import type { DefineComponent } from 'vue';

  const component: DefineComponent<Record<string, unknown>, Record<string, unknown>, unknown>;

  export default component;
}
