---
title: 디렉티브
order: 17
---

# 디렉티브

이 패키지가 모르는 구성물을 이름별로 무엇으로 그릴지. [디렉티브](../../guide/viewer#디렉티브)를 보세요.

::: fw react

## `MawyDirectives`

```ts
type MawyDirectives = Readonly<Record<string, React.ComponentType<MawyDirectiveProps>>>;
```

애플리케이션이 아는 디렉티브를 이름별로 모은 것입니다. 목록에 없는 이름은 쓰인 글자 그대로 그립니다. 기본 [`html`](./html-policy) 정책에서 날 HTML이 받는 답과 같습니다.

## `MawyDirectiveProps`

```ts
interface MawyDirectiveProps {
  name: string;
  kind: MawyDirectiveKind;
  attributes: Readonly<Record<string, string>>;
  /** 그려진 `[label]`. 문서가 쓰지 않았다면 `null`. */
  label: React.ReactNode;
  /** 그려진 컨테이너의 블록들. 나머지 두 모양에서는 `null`. */
  children: React.ReactNode;
  range: MawyRange;
  /** 쓰인 글자 그대로. */
  source: string;
}
```

디렉티브의 컴포넌트가 받는 것입니다. 조각들은 **이미 그려진 채로** 도착하므로, 컴포넌트는 React 엘리먼트를 조립할 뿐 마크다운을 다시 파싱하거나 마크업 문자열을 다루지 않습니다.

:::

::: fw flutter

## `MawyDirectiveBuilder`

```dart
typedef MawyDirectiveBuilder = Widget Function(BuildContext context, MawyDirective directive);
```

디렉티브 하나를 그리는 것이고, 뷰어에는 `Map<String, MawyDirectiveBuilder>`로 넘깁니다. 맵에 없는 이름은 쓰인 글자 그대로 그립니다.

`MawyDirectiveKind.text` 디렉티브는 문장 안에 `WidgetSpan`으로 놓이므로, 인라인 디렉티브의 빌더는 글줄 위에 들어갈 것을 돌려주어야 합니다. 보통은 `Text.rich`를 씁니다.

## `MawyDirective`

```dart
class MawyDirective {
  final String name;
  final MawyDirectiveKind kind;
  final Map<String, String> attributes;
  final InlineSpan? label; // 그려진 `[label]`. 없었다면 `null`
  final List<Widget>? children; // 컨테이너의 블록들. 나머지 두 모양에서는 `null`
  final MdRange range;
  final String source; // 쓰인 글자 그대로
}
```

디렉티브의 빌더가 받는 것입니다. 조각들은 **이미 그려진 채로** 도착하므로, 빌더는 위젯을 조립할 뿐 마크다운을 다시 파싱하지 않습니다.

:::

`attributes`는 `{…}` 안에 쓰인 것을 쓰인 순서대로 담습니다. `{#id}`는 `id`로, `{.a .b}`는 `class`로 오고, 이름만 쓰면 빈 문자열과 함께 옵니다. 플래그를 적는 방식이 그것입니다. 값은 모두 문자열입니다. 문서가 말한 것이 문자열뿐이기 때문입니다.
