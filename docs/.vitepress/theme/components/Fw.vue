<script setup lang="ts">
import { computed, useAttrs } from 'vue';
import { FRAMEWORKS } from '../../data/frameworks';

/**
 * The inline half of `::: fw` — a few words that differ, in the middle of a
 * sentence that does not.
 *
 * `<Fw react="onChange" flutter="onTypographyChange" code />`
 *
 * A container cannot do this: `:::` is a block, and splitting a sentence into
 * two blocks to swap one identifier inside it would leave two paragraphs where
 * there was one. Anything longer than a phrase belongs in the block form.
 *
 * Each framework's text arrives as an attribute named after its id, read off
 * `$attrs` rather than declared, so adding a framework stays one entry in
 * `data/frameworks.ts`. One with nothing given for it renders nothing, which is
 * how a clause only one of them has gets written.
 */
defineOptions({ inheritAttrs: false });

defineProps({
  /** Renders each variant as `<code>`, for a prop or an identifier. */
  code: { type: Boolean, default: false }
});

const attrs = useAttrs();

const variants = computed(() =>
  FRAMEWORKS.filter((item) => attrs[item.id]).map((item) => ({
    id: item.id,
    text: String(attrs[item.id])
  }))
);
</script>

<template>
  <template v-for="variant in variants" :key="variant.id">
    <code v-if="code" class="mawy-fw" :data-fw="variant.id">{{ variant.text }}</code>
    <span v-else class="mawy-fw" :data-fw="variant.id">{{ variant.text }}</span>
  </template>
</template>
