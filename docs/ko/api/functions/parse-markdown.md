---
title: parseMarkdown
order: 1
---

# `parseMarkdown`

문자열을 마크다운으로 읽습니다. 뷰어가 하는 것과 같은 호출이고 옵션도 같으므로, 여기서 파싱한 문서와 저기서 그린 문서는 같은 트리입니다.

::: fw react

```ts
function parseMarkdown(source: string, options?: MawyParseOptions): MdDocument;
```

```ts
import { parseMarkdown } from 'mawy-react/markdown';

const { outline, footnotes } = parseMarkdown(document);
```

`mawy-react/markdown`은 별도의 진입점입니다. 문서의 개요나 각주, 제목이 받은 앵커만 _읽으려는_ 애플리케이션이 그것을 얻자고 컴포넌트를 설치할 이유는 없고, 여기에는 컴포넌트가 없습니다. React도 DOM도 필요 없으므로 페이지에서와 마찬가지로 빌드 스크립트나 서버에서도 그대로 돕니다.

:::

::: fw flutter

```dart
MdDocument parseMarkdown(String source, [MawyParseOptions options = const MawyParseOptions()]);
```

```dart
import 'package:mawy/mawy.dart';

final MdDocument parsed = parseMarkdown(document);
```

쓰기만 하는 것이 아니라 내보내기도 합니다. 문서의 개요나 각주, 제목의 앵커를 원하는 Dart 애플리케이션에게 다른 길이 없기 때문입니다.

:::

돌아오는 것은 [`MdDocument`](../types/md-document)이고, 옵션은 [`MawyParseOptions`](../types/parse-options)입니다.
