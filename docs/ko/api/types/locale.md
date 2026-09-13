---
title: MawyLocale
order: 6
---

# `MawyLocale`

뷰어와 에디터 인터페이스가 쓰는 언어입니다.

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

**영어와 한국어**이고 기본값은 `en`입니다. 툴바 이름표와 메뉴 항목, 스크린 리더에 주는 글의 언어를 정합니다. 문서가 어떤 언어로 쓰였는지와는 무관합니다. 두 패키지가 같은 이름 아래 같은 낱말을 싣고, 한쪽에만 있는 로케일은 이 라이브러리가 제공하는 로케일이 아닙니다.

## `MawyStrings`

::: fw react

```ts
interface MawyStrings {
  lang: string;
  bold: string;
  statusPosition: string; // 'Ln %L, Col %C'
  // …인터페이스가 쓰는 모든 낱말, 이름별로
}
```

인터페이스가 쓰는 모든 낱말이고, `MawyEditor`, `MawyViewer`, `MawyDocument`의 `strings`는 이 중 일부나 전부를 받습니다. 번역을 자기 메시지 카탈로그에 두는 애플리케이션을 위한 것입니다. 그 카탈로그에 있는 언어를 이 라이브러리가 모두 싣는 것보다 이쪽이 맞는 답입니다.

```tsx
<MawyEditor
  locale="en"
  strings={{ lang: 'de', bold: t('editor.bold'), statusPosition: t('editor.position') }}
/>
```

주지 않은 것은 `locale`에서 가져옵니다. `lang`도 마찬가지입니다. `lang`은 인터페이스 요소의 `lang` 속성이 되어 스크린 리더가 알맞은 목소리로 읽게 하므로, 낱말이 `locale`과 다른 언어라면 `lang`도 함께 주세요. 에디터는 받은 `strings`를 미리보기에도 건넵니다. 렌더마다 새 객체를 넘겨도 비용은 없습니다. 객체가 아니라 낱말을 비교하기 때문입니다.

**값이 들어가는 문자열이 몇 개 있습니다.** 값이 들어갈 자리를 `%`와 대문자 하나로 표시하고, 표시한 자리마다 모두 채웁니다. 그래서 값을 두 번 쓰는 언어는 두 번 쓸 수 있습니다. 그 문자열이 쓰지 않는 자리 표시는 적힌 그대로 두고, 채워 넣은 값은 다시 읽지 않으므로 `%T.md`라는 파일은 `%T.md`로 저장됩니다.

| 문자열           | 자리 표시                                             | 영어            |
| ---------------- | ----------------------------------------------------- | --------------- |
| `statusPosition` | `%L`은 줄, `%C`는 열. 둘 다 1부터 셉니다              | `Ln %L, Col %C` |
| `statusSelected` | `%N`은 선택한 글자 수                                 | `%N selected`   |
| `findMatches`    | `%N`은 커서가 있는 결과의 순번(1부터), `%T`는 결과 수 | `%N of %T`      |
| `saved`          | `%N`은 문서를 저장한 이름                             | `Saved as %N`   |

이름은 `src/internal/i18n.ts`에 있는 그대로이고, 타입이 전부를 나열합니다. 인터페이스가 자라면서 키는 부 버전에서 늘어나고, 이름을 바꾸거나 없애는 것은 주 버전에서만 합니다. 그래서 `Partial<MawyStrings>`는 애플리케이션이 계속 써도 되는 타입입니다.

:::

::: fw flutter

이 패키지에는 아직 낱말을 따로 건넬 방법이 없습니다. `locale`이 전부입니다.

:::
