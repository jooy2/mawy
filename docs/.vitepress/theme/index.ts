import DefaultTheme from 'vitepress/theme';
import type { Theme } from 'vitepress';
import MawyDemo from './components/MawyDemo.vue';
import './custom.css';
// The library's own stylesheet, imported exactly the way a consuming
// application imports it — through the package specifier, which the Vite alias
// points at `packages/react/src`. Nothing here reads `dist/`.
import 'mawy/styles.css';

/**
 * The default theme, with this site's palette over it and one component
 * registered globally: `<MawyDemo name="viewer/basic" />`, which is how a
 * Markdown page shows a real React component.
 */
export default {
  extends: DefaultTheme,
  enhanceApp({ app }) {
    app.component('MawyDemo', MawyDemo);
  }
} satisfies Theme;
