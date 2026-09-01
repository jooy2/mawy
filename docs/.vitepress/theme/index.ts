import DefaultTheme from 'vitepress/theme';
import type { Theme } from 'vitepress';
import Layout from './components/Layout.vue';
import Fw from './components/Fw.vue';
import MawyDemo from './components/MawyDemo.vue';
import MawyPlayground from './components/MawyPlayground.vue';
import { syncFramework } from '../data/framework';
import './custom.css';
import './framework.css';
// The library's own stylesheet, imported exactly the way a consuming
// application imports it — through the package specifier, which the Vite alias
// points at `packages/react/src`. Nothing here reads `dist/`.
import 'mawy-react/styles.css';

/**
 * The default theme, with this site's palette over it, the framework switch in
 * the sidebar, and three components registered globally because Markdown pages
 * use them by name: `<MawyDemo name="viewer/basic" />`, which is how a page
 * shows a real viewer, `<Fw react="…" flutter="…" />`, which is how a sentence
 * says two things at once, and `<MawyPlayground />`, which is the whole of the
 * playground page.
 */
export default {
  extends: DefaultTheme,
  Layout,
  enhanceApp({ app }) {
    app.component('MawyDemo', MawyDemo);
    app.component('MawyPlayground', MawyPlayground);
    app.component('Fw', Fw);

    // Reads the stored choice into the reactive copy the components use, and
    // writes it back onto `<html>`. No-op during SSR.
    syncFramework();
  }
} satisfies Theme;
