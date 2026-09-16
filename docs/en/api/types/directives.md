---
title: Directives
order: 17
---

# Directives

What draws the constructs this package does not know about, by name. See [directives](../../guide/viewer#directives).

::: fw react

## `MawyDirectives`

```ts
type MawyDirectives = Readonly<Record<string, React.ComponentType<MawyDirectiveProps>>>;
```

The directives an application knows, by name. A name that is not on the list is drawn as the characters it was written with, the same as raw HTML under the default [`html`](./html-policy) policy.

## `MawyDirectiveProps`

```ts
interface MawyDirectiveProps {
  name: string;
  kind: MawyDirectiveKind;
  attributes: Readonly<Record<string, string>>;
  /** The `[label]`, drawn. `null` when the document wrote none. */
  label: React.ReactNode;
  /** A container's blocks, drawn. `null` for the other two shapes. */
  children: React.ReactNode;
  range: MawyRange;
  /** The characters it was written with. */
  source: string;
}
```

What a directive's component is given. The pieces arrive **already drawn**, so a component composes React elements and never parses Markdown a second time or handles a string of markup.

:::

::: fw flutter

## `MawyDirectiveBuilder`

```dart
typedef MawyDirectiveBuilder = Widget Function(BuildContext context, MawyDirective directive);
```

What draws one directive, passed to the viewer as a `Map<String, MawyDirectiveBuilder>`. A name that is not in the map is drawn as the characters it was written with.

A `MawyDirectiveKind.text` directive is placed in the sentence as a `WidgetSpan`, so a builder for an inline directive should return something that fits on a line of text. A `Text.rich` of its own is the usual choice.

The `context` a builder is given carries the type of the words around the directive, as a `DefaultTextStyle`. `DefaultTextStyle.of(context).style` is the paragraph's own style, so a key cap or a chip can be sized in ems of the sentence it sits in and grows with a document the reader has set larger — which is what `font: inherit` gives the React package's builder for nothing.

## `MawyDirective`

```dart
class MawyDirective {
  final String name;
  final MawyDirectiveKind kind;
  final Map<String, String> attributes;
  final InlineSpan? label; // the `[label]`, drawn. `null` when there was none
  final List<Widget>? children; // a container's blocks. `null` for the other two
  final MdRange range;
  final String source; // the characters it was written with
}
```

What a directive's builder is given. The pieces arrive **already drawn**, so a builder composes widgets and never parses Markdown a second time.

:::

`attributes` is what was written in `{…}`, in the order it was written: `{#id}` arrives as `id`, `{.a .b}` as `class`, and a bare name arrives with an empty string, which is how a flag is spelled. Every value is a string, because a string is all the document said.
