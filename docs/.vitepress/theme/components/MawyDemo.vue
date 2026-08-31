<script setup lang="ts">
/**
 * A React component, rendered inside a Vue page.
 *
 * VitePress compiles Markdown to Vue, so there is no way to write a React
 * component into a documentation page — which leaves one option, and this is
 * it: Vue owns a `<div>` and hands it to `createRoot()`. Everything inside is
 * React's, everything outside is Vue's, and the boundary is one element.
 *
 * The demos are the *real* components, straight from `packages/react/src`
 * through a Vite alias. There is no build step in front of them, which is the
 * whole reason the alias exists: an edit to the viewer is on this page as soon
 * as it is saved.
 */
import { onBeforeUnmount, onMounted, watch, useTemplateRef } from 'vue';
import { createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { useData } from 'vitepress';
import type { DemoProps } from '../../demos/types.js';

const props = defineProps<{ name: string }>();

/**
 * Every demo, eagerly. Vite needs a literal pattern, and the alternative — a
 * lazy glob — would make each demo a request that arrives after the page.
 */
const demos = import.meta.glob<{ default: (props: DemoProps) => unknown }>('../../demos/**/*.tsx', {
  eager: true
});

const host = useTemplateRef<HTMLDivElement>('host');
const { isDark, lang } = useData();
let root: Root | undefined;

function paint() {
  const demo = demos[`../../demos/${props.name}.tsx`];

  if (!host.value || !demo) {
    return;
  }

  root ??= createRoot(host.value);
  root.render(
    createElement(demo.default as never, {
      colorScheme: isDark.value ? 'dark' : 'light',
      locale: lang.value.startsWith('ko') ? 'ko' : 'en'
    })
  );
}

onMounted(paint);
watch([isDark, lang, () => props.name], paint);

onBeforeUnmount(() => {
  root?.unmount();
  root = undefined;
});
</script>

<template>
  <div class="mawy-demo">
    <div ref="host" />
  </div>
</template>
