---
title: MawyLocale
order: 6
---

# `MawyLocale`

The language of the viewer's and the editor's own interface.

::: fw react

```ts
type MawyLocale = 'en' | 'ko';
```

:::

::: fw flutter

```dart
enum MawyLocale { en, ko }
```

:::

**English and Korean**, and `en` is the default. It sets the toolbar labels, the menu entries and the text a screen reader is given. It has nothing to do with the language a document is written in. Both packages ship the same words under the same names, and a locale that exists in only one of them is not one this library offers.

## `MawyStrings`

::: fw react

```ts
interface MawyStrings {
  lang: string;
  bold: string;
  statusPosition: string; // 'Ln %L, Col %C'
  // …every word the interface says, by name
}
```

Every word the interface says, and what `strings` on `MawyEditor`, `MawyViewer` and `MawyDocument` takes some or all of. It is for an application whose translations live in a catalogue of its own, which is a better answer than this library carrying every language that catalogue has:

```tsx
<MawyEditor
  locale="en"
  strings={{ lang: 'de', bold: t('editor.bold'), statusPosition: t('editor.position') }}
/>
```

Anything left out comes from `locale`. That includes `lang`, which goes on the interface's elements as their `lang` attribute so a screen reader reads the words in the right voice, so give `lang` too when the words are in a language `locale` is not. The editor hands its `strings` to its preview. Passing a new object on every render costs nothing: the words are compared, not the object.

**A few strings carry a value.** They mark where it goes with `%` and one capital letter, and every place a placeholder is written is filled, so a language that wants a value twice can have it twice. A placeholder a string does not name is left as it was written, and what is filled in is never read again, so a file named `%T.md` is saved as `%T.md`.

| String | Placeholders | English |
| --- | --- | --- |
| `statusPosition` | `%L` the line and `%C` the column, both counted from one | `Ln %L, Col %C` |
| `statusSelected` | `%N` how many characters are selected | `%N selected` |
| `findMatches` | `%N` the match the caret is on, counted from one; `%T` how many | `%N of %T` |
| `saved` | `%N` the name the document was saved under | `Saved as %N` |

The names are the ones in `src/internal/i18n.ts`, and the type lists every one. Keys are added in minor versions as the interface grows, and a key is renamed or removed only in a major version, so a `Partial<MawyStrings>` is a type an application can keep.

:::

::: fw flutter

```dart
final class MawyStrings {
  static MawyStrings of(MawyLocale locale);
  MawyStrings copyWith({String? bold, String? statusPosition /* …every word, by name */});

  final String bold;
  final String statusPosition; // 'Ln %L, Col %C'
  // …every word the interface says, by name
}
```

Every word the interface says, and what `strings` on `MawyEditor` and `MawyViewer` takes. It is for an application whose translations live in a catalogue of its own, which is a better answer than this library carrying every language that catalogue has. A set is made from a locale's words, with the ones that differ changed:

```dart
MawyEditor(
  strings: MawyStrings.of(MawyLocale.en).copyWith(bold: t.bold, statusPosition: t.position),
);
```

Given, it is every word and `locale` says nothing. The editor hands its set to its preview. A new set built on every build costs nothing, because two sets are equal when their words are.

There is no public constructor, and the class cannot be extended or implemented. Both are what let a word be added in a minor version: an application that had built a set from nothing, or written a class of its own, would have to change every time the interface gained a label.

**A few strings carry a value**, marked with `%` and one capital letter, and every place one is written is filled.

| String | Placeholders | English |
| --- | --- | --- |
| `statusPosition` | `%L` the line and `%C` the column, both counted from one | `Ln %L, Col %C` |
| `statusSelected` | `%N` how many characters are selected | `%N selected` |
| `findMatches` | `%N` the match the caret is on, counted from one; `%T` how many | `%N of %T` |

The names are the React package's names, less the words for what only that package has, such as saving and pasting an image.

:::
