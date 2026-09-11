---
title: MawyUrlResolver
order: 11
---

# `MawyUrlResolver`

상대 URL이 어디를 가리키는지.

::: fw react

```ts
type MawyUrlKind = 'link' | 'image';
type MawyUrlResolver = (url: string, kind: MawyUrlKind) => string;
```

:::

::: fw flutter

```dart
enum MawyUrlKind { link, image }

typedef MawyUrlResolver = String Function(String url, MawyUrlKind kind);
```

:::

문서에 쓰인 URL은 *문서*를 기준으로 한 상대 주소인데, 그것을 그리는 쪽은 다른 곳에 있습니다. 디스크에서 읽은 파일이나 저장소에서 꺼낸 파일, API 뒤에서 온 파일 안의 `![](./diagram.png)`에는 누구도 따라갈 수 있는 주소가 없습니다. 브라우저는 그것을 페이지 주소에 대해 해석하는데, 그 페이지는 문서의 것이 아니라 애플리케이션의 것입니다. 문서가 어디에서 왔는지는 애플리케이션만 알고, 그래서 그 주소가 무엇을 뜻하는지도 애플리케이션만 말할 수 있습니다.

::: fw react

```tsx
<MawyViewer value={document} resolveUrl={(url) => new URL(url, base).href} />
```

링크의 `href`와 그림의 출처에 닿고, [`html="sanitize"`](./html-policy)에서는 날 HTML 안의 같은 둘에도 닿습니다.

:::

::: fw flutter

```dart
MawyViewer(
  value: document,
  resolveUrl: (String url, MawyUrlKind kind) => Uri.parse(base).resolve(url).toString(),
)
```

링크의 목적지와 그림의 출처에 닿습니다.

:::

문서가 쓴 상대 URL마다 호출되고, 그 밖에는 호출되지 않습니다. 세 종류의 주소는 그대로 둡니다. 스킴이 있는 것, `#`로 시작해 이 문서 안의 자리를 뜻하는 것, `//`로 시작해 스킴만 빠진 것입니다. 저마다 이미 어디인지를 말하고 있기 때문입니다.

**돌려준 값은 쓰인 그대로 사용됩니다.** 호출 시점에는 *문서*가 말한 것에 스킴 허용 목록이 이미 지나간 뒤이고, 돌아온 값은 다시 검사하지 않습니다. 애플리케이션만 서비스할 수 있는 주소로 답하는 경우가 이 기능이 존재하는 이유이고, 두 번째 검사는 그것을 불가능하게 만듭니다. 여기서 문서는 신뢰하지 않는 쪽이고 애플리케이션은 신뢰하는 쪽인데, 이 라이브러리의 다른 모든 훅이 긋는 선도 같은 선입니다.
