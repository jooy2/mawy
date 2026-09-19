---
title: MawyQuotes
order: 22
---

# `MawyQuotes`

따옴표를 그릴 네 기호입니다. 영어와 다르게 인용을 적는 언어의 문서를 위한 것입니다.

::: fw react

```ts
interface MawyQuotes {
  doubleOpen?: string; // 기본값: “
  doubleClose?: string; // 기본값: ”
  singleOpen?: string; // 기본값: ‘
  singleClose?: string; // 기본값: ’
}
```

:::

::: fw flutter

```dart
class MawyQuotes {
  const MawyQuotes({
    this.doubleOpen = '“',
    this.doubleClose = '”',
    this.singleOpen = '‘',
    this.singleClose = '’',
  });
}
```

:::

[`MawyParseOptions`](./parse-options)에 `typographerQuotes`로 넘깁니다. 기호를 그리는 쪽이 `typographer`라서, 그것 없이는 아무 일도 하지 않습니다. 영어와 한국어는 인용을 같은 방식으로 적으니 기본값이 이 라이브러리의 인터페이스가 말하는 두 언어를 모두 덮습니다. 그런데 문서는 인터페이스가 아닙니다. 이것이 옵션인 이유가 그것입니다.

::: fw react

```tsx
<MawyViewer
  value={document}
  parse={{ typographer: true, typographerQuotes: { doubleOpen: '„', doubleClose: '“' } }}
/>
```

:::

::: fw flutter

```dart
MawyViewer(
  value: document,
  parse: const MawyParseOptions(
    typographer: true,
    typographerQuotes: MawyQuotes(doubleOpen: '„', doubleClose: '“'),
  ),
);
```

:::

빠뜨린 값은 기본값을 지킵니다. 그래서 위의 둘이 독일어 문서에 필요한 전부입니다. 프랑스어는 `«a»`로 적고, 인용 안의 인용에 제 기호를 주려면 넷을 모두 넘깁니다.

**어퍼스트로피는 이 넷에 들지 않습니다.** 따옴표를 무엇으로 정하든 `dogs’ bones`는 `’`로 그려집니다. 영어의 닫는 작은따옴표와 같은 글자일 뿐 같은 기호가 아니라서, 작은따옴표를 `‚‘`로 정한 독일어 문서라면 `dogs‘ bones`가 되어 버립니다.

::: fw react

`wysiwyg` 화면에서 값을 치르는 경우가 하나 있습니다. 프랑스어의 `«`와 그 뒤의 줄바꿈 없는 공백처럼, 한 글자가 아닌 기호입니다. 원본에서 줄을 찾을 때 페이지의 기호를 거꾸로 읽는데, 한 글자가 한 글자인 기호는 — 기본값은 모두 그렇습니다 — 정확히 읽힙니다. [활자](../../guide/viewer#활자)를 보세요.

:::
