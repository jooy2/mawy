---
title: 테마
order: 4
---

# 테마

이 라이브러리가 그릴 때 쓰는 모든 색과 모서리와 지속 시간을 한곳에 모은 것이고, 애플리케이션이 바꿀 수 있는 범위의 전부입니다.

::: fw react

## `mawy-react/styles.css`

완성된 스타일시트이고, 애플리케이션이 한 번 import합니다. 이 라이브러리가 그릴 때 쓰는 모든 값이 `--mawy-*` 커스텀 속성이며, 테마를 바꿀 수 있는 범위는 그 이름 공간 전부입니다.

```css
@import 'mawy-react/styles.css';
```

토큰은 `:root`가 아니라 **`.mawy-root`**에 선언합니다. 컴포넌트 라이브러리가 문서 엘리먼트에 값을 쓸 일은 없고, `:root`에서 팔레트를 읽는 뷰어는 밝은 페이지 안에서 어두울 수 없습니다. 토큰은 상속되므로 감싸는 엘리먼트에 한 번 선언하면 그 안의 모든 Mawy 화면에 닿습니다.

```css
.my-docs {
  --mawy-accent: #b8005c;
}
```

## 속성

| 갈래 | 속성 |
| --- | --- |
| 서체 | `--mawy-font-sans`, `--mawy-font-serif`, `--mawy-font-mono` |
| 문서 | `--mawy-doc-font`, `--mawy-doc-size`, `--mawy-doc-line-height`, `--mawy-doc-letter-spacing`, `--mawy-doc-measure`, `--mawy-doc-padding`, `--mawy-doc-image-aspect`, `--mawy-doc-image-fit` |
| 바탕 | `--mawy-bg`, `--mawy-bg-sunken`, `--mawy-bg-raised`, `--mawy-chrome` |
| 글자 | `--mawy-fg`, `--mawy-fg-muted`, `--mawy-fg-subtle` |
| 선 | `--mawy-border`, `--mawy-border-strong` |
| 강조색 | `--mawy-accent`, `--mawy-accent-hover`, `--mawy-accent-fg`, `--mawy-accent-soft` |
| 코드 | `--mawy-code-bg`, `--mawy-code-fg`, `--mawy-mark-bg`, `--mawy-mark-fg` |
| 코드 색 | `--mawy-hl-comment`, `--mawy-hl-string`, `--mawy-hl-number`, `--mawy-hl-keyword`, `--mawy-hl-type`, `--mawy-hl-function`, `--mawy-hl-variable`, `--mawy-hl-punctuation` |
| 찾기 | `--mawy-find`, `--mawy-find-current` |
| 알림 블록 | `--mawy-note`, `--mawy-tip`, `--mawy-important`, `--mawy-warning`, `--mawy-caution` |
| 에디터의 원문 화면 | `--mawy-src-size`, `--mawy-src-line`, `--mawy-src-pad-x`, `--mawy-src-pad-y`, `--mawy-src-gap`, `--mawy-src-indent`, `--mawy-gutter`, `--mawy-split`, `--mawy-placeholder`, `--mawy-syntax-marker`, `--mawy-syntax-code`, `--mawy-syntax-link`, `--mawy-syntax-muted` |
| 모양과 움직임 | `--mawy-radius-sm`, `--mawy-radius-md`, `--mawy-radius-lg`, `--mawy-shadow-1`, `--mawy-shadow-2`, `--mawy-duration`, `--mawy-easing` |

문서를 그릴 때 쓰는 클래스 이름은 `.mawy-md-*`이고 이것도 지원 범위에 듭니다. 그래서 라이브러리가 렌더 프롭을 내놓지 않아도 애플리케이션이 표나 코드 블록의 스타일을 다시 줄 수 있습니다.

### 페이지가 가진 규칙은 문서 앞에서 멈춥니다

글을 다루는 페이지는 `article p { padding: 4px 8px }`이나 `ul { list-style-type: square }`처럼 요소 이름만 보고 규칙을 씁니다. 이런 규칙이 페이지의 나머지와 똑같이 Mawy 문서에도 닿았지만 이제는 닿지 않습니다. `.mawy-md` 안에서는 파서가 만들어 내는 요소마다 여백, 글자, 색, 목록 기호를 브라우저 기본값으로 되돌린 다음 이 스타일시트가 값을 정합니다.

막아 두었을 뿐 벽은 아니어서, 작정하고 쓴 선택자는 여전히 이깁니다.

```css
/* 문서까지 닿습니다. 클래스 두 개와 요소 하나라 되돌리는 규칙보다 구체적이고,
   애플리케이션이 라이브러리를 덮어쓰는 경우로 읽힙니다. */
.my-docs .mawy-md p {
  padding: 4px 8px;
}
```

일부러 두 가지는 건드리지 않습니다. `div`와 `span`은 되돌리지 않는데, 디렉티브는 애플리케이션이 자기 마크업으로 그리는 것이라 여기까지 되돌리면 애플리케이션이 자기 위젯에 준 스타일을 뺏기 때문입니다. 토큰도 그대로입니다. 토큰을 다시 선언하는 것이 원래 의도한 방법입니다.

:::

::: fw flutter

## `MawyTokens`

```dart
class MawyTokens {
  static const MawyTokens light;
  static const MawyTokens dark;
  static MawyTokens of(Brightness brightness);
  MawyTokens copyWith({Brightness? brightness, Color? background, /* … */});
}

typedef MawyTokensBuilder = MawyTokens Function(Brightness brightness);
```

문서와 그 인터페이스를 그리는 모든 색을 한 객체에 담았습니다. 항목은 React 패키지의 `--mawy-*` 커스텀 속성을 Dart식 이름으로 옮긴 것입니다. `background`, `backgroundSunken`, `backgroundRaised`, `chrome`, `foreground`, `foregroundMuted`, `foregroundSubtle`, `border`, `borderStrong`, `accent`, `accentHover`, `accentForeground`, `accentSoft`, `find`, `findCurrent`, `codeBackground`, `codeForeground`, `markBackground`, `markForeground`, 색이 입혀진 코드 블록을 그리는 `highlight*` 여덟 색, 그리고 알림 블록 종류마다 하나씩입니다. 값은 다시 고른 것이 아니라 스타일시트에서 그대로 옮겼으므로, 브라우저에서 `#5b34ea`인 색은 앱에서도 `#5b34ea`입니다.

뷰어는 자기 `colorScheme`에서 `light`나 `dark`를 고르고 전역 값을 읽지 않습니다. 밝은 화면 안에서 문서 하나만 어두울 수 있는 것이 그 덕분입니다.

색을 직접 정하려는 애플리케이션은 `tokens`를 넘깁니다. 팔레트 하나가 아니라 `MawyTokensBuilder`입니다. 뷰어는 나머지를 모두 건네받은 뒤에야 밝기를 정하므로, 플랫폼을 따르는 문서라면 두 팔레트 모두에 값이 준비되어 있어야 합니다. `copyWith`로 만드세요. `MawyTokens.of(brightness)`에서 시작해 달라지는 것만 이름 대면, 색 하나를 바꾸려고 모든 색을 쓸 필요가 없습니다.

```dart
MawyViewer(
  value: document,
  tokens: (Brightness brightness) =>
      MawyTokens.of(brightness).copyWith(accent: const Color(0xFFB8005C)),
);
```

문서 옆에 자기 인터페이스를 그리면서 같은 색을 쓰고 싶은 애플리케이션을 위한 것이기도 합니다.

## `MawyRadius`와 `MawyMotion`

```dart
abstract final class MawyRadius {
  static const double small = 6; // 코드 조각, 칩
  static const double medium = 9; // 버튼, 입력 필드
  static const double large = 14; // 카드, 메뉴, 코드 블록
}

abstract final class MawyMotion {
  static const Duration duration = Duration(milliseconds: 140);
  static const Cubic easing = Cubic(0.2, 0, 0.2, 1);
}
```

모서리 반지름은 눈금이 아니라 세 크기이고, 움직이는 것은 모두 이 지속 시간 하나와 곡선 하나를 씁니다. `MawyTokens`가 React 패키지의 색인 것처럼, 이것은 React 패키지의 `--mawy-radius-*`, `--mawy-duration`, `--mawy-easing`을 값 그대로 옮긴 것입니다.

:::
