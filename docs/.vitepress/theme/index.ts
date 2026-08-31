import DefaultTheme from 'vitepress/theme';
import type { Theme } from 'vitepress';
import './custom.css';

/**
 * The default theme, with this site's palette over it.
 *
 * There is nothing else here yet on purpose. When the editor has components to
 * show, the live previews go in as a component registered from `enhanceApp`,
 * used straight from Markdown — that is the one hook this file exists to hold
 * open.
 */
export default {
  extends: DefaultTheme
} satisfies Theme;
