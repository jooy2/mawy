<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useData } from 'vitepress';
import FrameworkMark from './FrameworkMark.vue';
import { framework, setFramework } from '../../data/framework';
import { DEFAULT_FRAMEWORK, FRAMEWORKS } from '../../data/frameworks';

/**
 * The framework switch, at the top of the sidebar.
 *
 * It sits above the menu rather than in the navbar because it is not
 * navigation: it does not take the reader anywhere, it changes what the page
 * they are already on says. The sidebar is where the rest of that scoping
 * lives, and on mobile the drawer carries it along.
 *
 * A segmented control rather than a `<select>`, and the reason is not that a
 * select is ugly. There are exactly two options, both are always worth showing,
 * and the choice colours every page on the site — a control that hides one of
 * its two states behind a click is the wrong shape for a decision that
 * important, and a popup list of two items is a popup for nothing.
 *
 * Built out of real radio inputs, hidden and labelled. That is what buys the
 * arrow keys, the group semantics and the focus behaviour for free; a row of
 * `<button>`s would need a roving tabindex written by hand to be as good, and
 * it would be worse.
 */
const { lang } = useData();
const label = computed(() => (lang.value.startsWith('ko') ? '패키지' : 'Package'));

/*
 * Which option the radios say is chosen — and it is deliberately behind the
 * page for one tick.
 *
 * The pre-rendered HTML is built with the default selected, because that is all
 * a build can know. `syncFramework()` then runs in `enhanceApp`, *before*
 * hydration, so by the time this component first renders in the browser it
 * already holds the stored choice — and a first render that disagrees with the
 * server's DOM is precisely what Vue does not repair: hydration patches event
 * handlers and `value`, and leaves `checked` and `class` as the server wrote
 * them.
 *
 * Rendering the default first and correcting it in `onMounted` makes the
 * correction an ordinary update, which Vue does apply. What the eye reads
 * meanwhile is not this at all — the active option is drawn from
 * `html[data-fw]`, which the inline head script sets before the first paint —
 * so the tick is right for assistive technology and the arrow keys, the
 * highlight is right immediately, and neither has to wait for the other.
 */
const hydrated = ref(false);

onMounted(() => {
  hydrated.value = true;
});

const checked = computed(() => (hydrated.value ? framework.value : DEFAULT_FRAMEWORK));
</script>

<template>
  <div class="mawy-fw-switch">
    <p id="mawy-fw-label" class="mawy-fw-title">{{ label }}</p>
    <div class="mawy-fw-track" role="radiogroup" aria-labelledby="mawy-fw-label">
      <label v-for="item in FRAMEWORKS" :key="item.id" class="mawy-fw-option" :data-fw="item.id">
        <input
          type="radio"
          name="mawy-fw"
          :value="item.id"
          :checked="checked === item.id"
          @change="setFramework(item.id)"
        />
        <FrameworkMark :framework="item.id" />
        <span>{{ item.label }}</span>
      </label>
    </div>
  </div>
</template>
