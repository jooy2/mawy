<script setup lang="ts">
/**
 * A live preview of the viewer, in whichever package the reader picked.
 *
 * **React** is mounted as an island. VitePress compiles Markdown to Vue, so
 * there is no way to write a React component into a documentation page — which
 * leaves one option, and this is it: Vue owns a `<div>` and hands it to
 * `createRoot()`. Everything inside is React's, everything outside is Vue's,
 * and the boundary is one element. The demos are the *real* components,
 * straight from `packages/react/src` through a Vite alias, so an edit to the
 * viewer is on this page as soon as it is saved.
 *
 * **Flutter** is framed. The gallery under `packages/flutter/example` is built
 * into `public/flutter` and shown in an `<iframe>`, because a Flutter web app
 * is a canvas and an event loop and cannot share a document with anything else.
 * That is also what makes it worth doing: the preview is the real Flutter
 * build rather than a picture of one.
 *
 * The gallery is not committed and not everybody has a Flutter SDK, so one
 * request decides whether it is there. Without it the preview says so and shows
 * the React half, which is the honest answer and not a broken rectangle.
 */
import { computed, onBeforeUnmount, onMounted, ref, watch, useTemplateRef } from 'vue';
import { createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { useData, withBase } from 'vitepress';
import type { MawyColorScheme, MawyLocale } from 'mawy-react';
import type { DemoProps } from '../../demos/types.js';
import { framework } from '../../data/framework';

const props = withDefaults(
  defineProps<{
    name: string;
    /** The Flutter gallery's name for the same demo. Its own `name` otherwise. */
    flutter?: string;
    /** How tall the frame is. A frame has no content of ours to measure. */
    height?: number;
  }>(),
  { flutter: undefined, height: 480 }
);

/**
 * Every demo, eagerly. Vite needs a literal pattern, and the alternative — a
 * lazy glob — would make each demo a request that arrives after the page.
 */
const demos = import.meta.glob<{ default: (props: DemoProps) => unknown }>('../../demos/**/*.tsx', {
  eager: true
});

const host = useTemplateRef<HTMLDivElement>('host');
const frame = useTemplateRef<HTMLIFrameElement>('frame');
const { isDark, lang } = useData();
let root: Root | undefined;

/**
 * Whether the gallery has been built into `public/flutter`.
 *
 * One request for the whole session, for the smallest file the build produces.
 * `null` until it comes back, so nothing is framed on a guess.
 */
const built = ref<boolean | null>(null);
let probe: Promise<boolean> | null = null;

function galleryBuilt(url: string): Promise<boolean> {
  probe ??= fetch(url, { method: 'HEAD' })
    .then((response) => response.ok)
    .catch(() => false);

  return probe;
}

const galleryUrl = withBase('/flutter/');
/** Which of the two languages the library speaks this page is written in. */
const demoLocale = computed<MawyLocale>(() => (lang.value.startsWith('ko') ? 'ko' : 'en'));
const embedded = computed(() => framework.value === 'flutter' && built.value === true);
const missing = computed(() => framework.value === 'flutter' && built.value === false);
/*
 * `index.html` is named rather than left to the directory.
 *
 * A built site is served by something that resolves `/flutter/` to the index
 * inside it; the dev server is Vite's static middleware, which does not — and a
 * request it cannot answer falls through to VitePress's router and comes back
 * as the site's own 404 page inside the frame. Naming the file works in both.
 *
 * The locale rides along for the same reason the React island is handed one: a
 * Korean page whose only English is the toolbar inside the preview reads as
 * half-translated. The gallery takes it out of its own query string.
 */
const frameSrc = computed(
  () => `${galleryUrl}index.html?demo=${props.flutter ?? props.name}&locale=${demoLocale.value}`
);

/**
 * Telling the framed gallery which palette this page is in.
 *
 * The React island takes `colorScheme` as a prop and the switch above the menu
 * drives it. The frame cannot be handed a prop, and it cannot be handed the
 * answer in its query string either: `src` changing is the engine loading again
 * from nothing, which is a second or so of blank rectangle to change one
 * colour. So the two fixed things — which demo, which language — ride in the
 * URL, and the one that moves is posted through the frame instead.
 *
 * Same origin both ways. The gallery is served out of this site's own `public/`
 * so there is no other origin in it, and a message from one is somebody else's
 * page with this one framed inside it.
 */
function tellFrame() {
  frame.value?.contentWindow?.postMessage(
    { mawy: 'colorScheme', value: isDark.value ? 'dark' : 'light' },
    window.location.origin
  );
}

/**
 * The gallery saying it is listening, which is when it can first be told.
 *
 * A Flutter engine arrives over the network and the frame loads lazily, so
 * there is no moment this page can work out on its own — `load` on the frame is
 * the document, not the engine, and the app's own listener is registered some
 * way after that. The frame speaks first for exactly that reason, and this
 * answers with wherever the switch is by then.
 *
 * `source` rather than the origin alone, because a page with three demos on it
 * has three of these listening to one window and every one of them would
 * otherwise answer every frame's hello.
 */
function onFrameMessage(event: MessageEvent) {
  const message: unknown = event.data;

  if (
    event.origin === window.location.origin &&
    event.source === frame.value?.contentWindow &&
    typeof message === 'object' &&
    message !== null &&
    (message as { mawy?: unknown }).mawy === 'ready'
  ) {
    tellFrame();
  }
}

/**
 * The theme the reader chose *inside* a demo, if they have chosen one.
 *
 * The demos take `colorScheme` as a controlled prop so the site's own dark
 * switch drives them — and a controlled prop with nothing listening is a
 * control that does nothing, which is what the viewer's own theme switch was
 * until this existed. So the two are layered: the site sets the theme, a reader
 * may override it, and moving the site switch takes the override back.
 */
let override: MawyColorScheme | null = null;

function paint() {
  const demo = demos[`../../demos/${props.name}.tsx`];

  if (!host.value || !demo) {
    return;
  }

  root ??= createRoot(host.value);
  root.render(
    createElement(demo.default as never, {
      colorScheme: override ?? (isDark.value ? 'dark' : 'light'),
      onColorSchemeChange: (next: MawyColorScheme) => {
        override = next;
        paint();
      },
      locale: demoLocale.value,
      height: `${props.height}px`
    })
  );
}

onMounted(() => {
  paint();
  window.addEventListener('message', onFrameMessage);
  void galleryBuilt(`${galleryUrl}version.json`).then((ok) => {
    built.value = ok;
  });
});

watch([isDark, lang, () => props.name], () => {
  override = null;
  paint();
});

// The frame's half of the same switch. Not folded into the watch above because
// that one is about the React island's override, and this is about a window
// that may not be there — `tellFrame` is a no-op until one is.
watch(isDark, tellFrame);

// The height is a prop like any other and has to reach the island, and it moves
// on its own: the playground measures it from the window. Kept out of the watch
// above because a resize is not a reason to throw away the theme somebody chose
// inside the demo.
watch(
  () => props.height,
  () => paint()
);

onBeforeUnmount(() => {
  window.removeEventListener('message', onFrameMessage);
  root?.unmount();
  root = undefined;
});
</script>

<template>
  <div class="mawy-demo">
    <p v-if="missing" class="mawy-demo-missing">
      The Flutter preview needs the gallery built — <code>npm run flutter</code> in
      <code>docs/</code>. Showing the React one.
    </p>
    <!--
      Both are in the tree and one is displayed, the same way a `::: fw` block
      is: a `v-if` on the React half would unmount and remount a whole React
      root every time the reader flips the switch, and the frame is worse still
      — it is an engine.
    -->
    <iframe
      v-if="embedded"
      ref="frame"
      class="mawy-demo-frame"
      :src="frameSrc"
      :style="{ height: `${height}px` }"
      title="Mawy for Flutter"
      loading="lazy"
    />
    <div v-show="!embedded" ref="host" />
  </div>
</template>
