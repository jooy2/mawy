<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, useTemplateRef, watch } from 'vue';
import { useData } from 'vitepress';
import MawyDemo from './MawyDemo.vue';

/**
 * The playground: one component at a time, filling the window.
 *
 * This is the one page on the site that is not reading, and it is built the
 * other way round from every other one. There is no prose around the demos and
 * no second demo under the first — a page that shows an editor and a viewer at
 * once shows two half-height boxes, and half a height is what makes both of
 * them feel like illustrations. So: a switch, and whichever one is chosen gets
 * the whole of what is left below the navbar.
 *
 * A segmented control of real radio inputs, for the reason `FrameworkSelect`
 * gives: two options both worth showing, and the arrow keys and the group
 * semantics come free.
 *
 * A pane is mounted the first time it is opened and then kept, hidden rather
 * than destroyed. Somebody who has typed half a document into the editor,
 * looked at the viewer and come back should find their document — and the cost
 * is that a Flutter reader who has opened both is holding two engines, which is
 * why the second is not mounted until it is asked for.
 */

interface Pane {
  id: 'editor' | 'viewer';
  /** The React demo to mount. */
  name: string;
  /** What the Flutter gallery calls the same thing. */
  flutter: string;
}

const PANES: readonly Pane[] = [
  { id: 'editor', name: 'playground/editor', flutter: 'playground/editor' },
  // The viewer's Flutter half is the gallery's own specimen, which is the same
  // document `demos/sample.ts` holds. There is nothing for a second entry in
  // the gallery to be.
  { id: 'viewer', name: 'playground/viewer', flutter: 'viewer/basic' }
];

const WORDS = {
  en: { group: 'What to try', editor: 'Editor', viewer: 'Viewer' },
  ko: { group: '무엇을 써볼지', editor: '에디터', viewer: '뷰어' }
};

const { lang, page } = useData();
const words = computed(() => WORDS[lang.value.startsWith('ko') ? 'ko' : 'en']);

/**
 * The page's own name, drawn here rather than by the Markdown above.
 *
 * The switch belongs beside the title and not under it — the stage is what
 * this page is, and every row above it is a row of editor nobody can see. Two
 * siblings cannot be put on one line by CSS, so the heading comes into the
 * component and the frontmatter goes on being where its text is written.
 */
const title = computed(() => page.value.title);

const at = ref<Pane['id']>('editor');
const opened = ref<Record<string, boolean>>({ editor: true });

watch(at, (id) => {
  opened.value = { ...opened.value, [id]: true };
});

/**
 * How tall the stage is, so that the page ends exactly where the window does.
 *
 * Measured rather than written as a `calc()`, because what is above it is the
 * navbar, the page's own padding and a heading — three numbers that are
 * different on every breakpoint and none of which this component should know.
 * The offset is taken from the document rather than from the viewport so that a
 * resize while scrolled measures the same thing as a resize at the top.
 */
const stage = useTemplateRef<HTMLDivElement>('stage');
const height = ref(520);

function measure(): void {
  const element = stage.value;

  if (!element) {
    return;
  }

  const top = element.getBoundingClientRect().top + window.scrollY;

  height.value = Math.max(360, Math.round(window.innerHeight - top - 24));
}

onMounted(() => {
  measure();
  window.addEventListener('resize', measure);
});

onBeforeUnmount(() => window.removeEventListener('resize', measure));
</script>

<template>
  <div class="mawy-play">
    <div class="mawy-play-head">
      <h1>{{ title }}</h1>
      <div class="mawy-play-track" role="radiogroup" :aria-label="words.group">
        <label
          v-for="pane in PANES"
          :key="pane.id"
          class="mawy-play-option"
          :data-on="at === pane.id ? '' : undefined"
        >
          <input
            type="radio"
            name="mawy-play"
            :value="pane.id"
            :checked="at === pane.id"
            @change="at = pane.id"
          />
          <span>{{ words[pane.id] }}</span>
        </label>
      </div>
    </div>
    <div ref="stage" class="mawy-play-stage">
      <template v-for="pane in PANES" :key="pane.id">
        <div v-if="opened[pane.id]" v-show="at === pane.id" class="mawy-play-pane">
          <MawyDemo :name="pane.name" :flutter="pane.flutter" :height="height" />
        </div>
      </template>
    </div>
  </div>
</template>
