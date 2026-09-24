---
title: Finding text
order: 5
---

# Finding text

The arithmetic behind the find bar, exported so an application can drive it from an interface of its own.

::: fw react

The find bar is the viewer's and the editor's own — [`'find'`](../types/viewer-toolbar-item) on either toolbar, and `Mod`+`F` whether the button is drawn or not. The functions under it are internal: a browser has `window.find` and a `<textarea>` has `setSelectionRange`, so an application driving its own search has what it needs already.

:::

::: fw flutter

```dart
List<MawyMatch> findMatches(String value, String query, bool matchCase);
int matchFrom(List<MawyMatch> matches, int caret, {required bool forwards});
MawyReplaced replaceMatch(String value, MawyMatch match, String replacement);
MawyReplacedAll replaceAll(String value, String query, String replacement, bool matchCase);
```

Pure functions over strings. What "replace all" does to overlapping matches is a question about arithmetic, and a test that has to mount an editor to ask it is a test nobody writes the awkward half of. It is `src/internal/search.ts` in Dart, function for function, and `tool/parity.dart` diffs the two.

| Type | What it is |
| --- | --- |
| `MawyMatch` | Where one match sits in the document: `start` and `end`. |
| `MawyReplaced` | A document as a replacement left it, and where the caret went: `value` and `caret`. |
| `MawyReplacedAll` | A document as "replace all" left it, and how many it replaced: `value` and `count`. |

`matchFrom` answers with an index into `matches`, or `-1` when there is nothing to go to. Forwards means the first match starting at or after the caret, backwards the last starting before it, and both wrap — a search that stops at the end of the file is one you have to scroll to the top to finish.

`replaceAll` works in one pass rather than looping over `replaceMatch`, and not for speed: replacing `a` with `aa` a match at a time would find the replacement and replace that too, for ever. What is searched is the document as it was.

**Plain text, never a regular expression.** That is a decision rather than a missing feature: an editor whose find box quietly compiles `(` into a syntax error is one a writer cannot trust with a document, and a Markdown document is full of `*`, `[`, `.` and `+`. What is here instead is the case-sensitive switch, which is the option people actually reach for.

:::
