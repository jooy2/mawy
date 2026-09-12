---
title: 링크
order: 10
---

# 링크

문서가 쓴 링크가 어디에서 열릴지, 그리고 그 링크가 가는 곳에 대해 무엇을 밝힐지.

::: fw flutter

둘 다 React 패키지의 것입니다. 링크를 연다는 것이 무엇인지가 여기서는 `onLinkTap`이 답할 주제 전부이고, 어디에서 열릴지도 애플리케이션이 함께 답하는 것입니다. [`MawyViewer`](../components/mawy-viewer#읽기와-그리기)를 보세요. 앵커가 없으니 쓸 `rel`도 없습니다.

:::

::: fw react

## `MawyLinkTarget`

```ts
type MawyLinkTarget = 'blank' | 'self';
```

- `'blank'` — 새 탭에서, `rel="noopener noreferrer"`를 달고 엽니다. 기본값입니다. 뷰어는 대개 페이지 자체가 아니라 페이지의 한 조각이기 때문입니다. 문서에서 링크를 따라 나갔다 돌아온 독자는 문서를 두고 간 자리에서 찾아야 하고, 에디터라면 그 링크 뒤에 저장하지 않은 작업이 있습니다.
- `'self'` — 문서가 있는 탭에서 엽니다. 문서를 페이지 _그 자체로_ 보여 주는 애플리케이션이 원하는 값입니다.

문서가 쓴 링크에만 해당합니다. 각주 참조와 거기서 되돌아오는 화살표는 같은 페이지를 가리키므로 영향을 받지 않습니다.

## `MawyLinkRel`

```ts
type MawyLinkRel = string | ((href: string) => string | null | undefined);
```

그 링크가 가는 곳에 대해 무엇을 밝힐지. 모든 링크에 붙일 문자열이거나, 링크마다 물어볼 함수입니다.

독자가 쓴 문서를 싣는 페이지가 이것이 있는 이유입니다. `nofollow`는 링크가 가는 곳을 보증하지 않는다는 뜻이고 `ugc`는 그 링크를 누가 썼는지 밝히는 것으로, 검색 엔진이 그런 페이지에 기대하는 두 가지입니다. 둘 다 링크를 감추지 않고, 독자가 따라가는 것도 막지 않습니다.

```tsx
<MawyViewer value={post.body} linkRel={(href) => (href.startsWith('/') ? null : 'nofollow ugc')} />
```

**링크가 이미 밝힌 것을 대신하지 않고 거기에 더합니다.** 새 탭에서 열리는 링크는 이 값이 무엇이든 `noopener noreferrer`를 그대로 지닙니다. 새 탭을 안전하게 만드는 것이 `noopener`이고 문서의 주소가 따라가지 않게 하는 것이 `noreferrer`인데, 안전장치 하나를 더 붙이려던 애플리케이션이 둘을 잃겠다고 한 적은 없습니다. 이미 있는 토큰은 두 번 쓰지 않으므로 `linkRel="noopener nofollow"`는 `rel="noopener noreferrer nofollow"`가 됩니다.

함수가 받는 것은 [`resolveUrl`](./url-resolver)까지 거친, `href`에 실제로 들어갈 주소입니다. 독자가 따라갈 그 링크를 두고 답하게 됩니다. 아무것도, `null`이나 `undefined`를 답하면 링크는 그대로입니다.

`linkTarget`과 마찬가지로 문서가 쓴 링크에만 해당합니다. 각주 참조와 거기서 되돌아오는 화살표는 같은 페이지를 가리키므로 묻지 않습니다.

:::
