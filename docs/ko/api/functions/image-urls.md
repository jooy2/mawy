---
title: imageUrls
order: 3
---

# `imageUrls`

파싱한 문서가 그림을 가져오는 주소를 모두 돌려줍니다. 저장해 둔 파일 가운데 어느 문서도 쓰지 않는 것을 찾으려는 애플리케이션을 위한 함수입니다.

::: fw react

```ts
function imageUrls(document: MdDocument): string[];
```

```ts
import { imageUrls, parseMarkdown } from 'mawy-react/markdown';

const used = new Set(saved.flatMap((each) => imageUrls(parseMarkdown(each))));
const unused = stored.filter((url) => !used.has(url));
```

[`parseMarkdown`](./parse-markdown)과 함께 `mawy-react/markdown`에서 내보냅니다.

:::

::: fw flutter

```dart
List<String> imageUrls(MdDocument document);
```

```dart
import 'package:mawy/mawy.dart';

final Set<String> used = <String>{
  for (final String each in saved) ...imageUrls(parseMarkdown(each)),
};
final List<String> unused = stored.where((String url) => !used.contains(url)).toList();
```

:::

주소는 문서에 처음 나온 순서대로 한 번씩 들어갑니다. 문서에 쓴 주소에서 이스케이프와 문자 참조만 읽은 값이고 `resolveUrl`을 거치기 전이므로, 애플리케이션이 문서에 써 넣은 URL과 같습니다. 무엇이 그림인지는 파싱 옵션에 따라 달라지므로, 에디터에 준 옵션 그대로 파싱하세요.

**에디터는 문서에서 그림이 빠질 때 아무것도 부르지 않습니다.** 그림이 문서에서 빠졌다고 파일이 필요 없어진 것은 아니기 때문입니다. 실행 취소하면 그림이 돌아오고, 잘라 낸 그림은 다른 곳에 붙여 넣으며, 같은 주소를 다른 문서에 복사하면 한 파일을 두 문서가 씁니다. 지우는 순간에 콜백을 부르면, 아직 되돌아올 수 있는 파일을 지우라고 애플리케이션에 건네는 셈입니다. 확실히 말할 수 있는 것은 저장된 문서 하나가 어떤 그림을 가리키는지이고, 이 함수가 그것을 알려 줍니다. 애플리케이션이 저장한 파일과 저장된 모든 문서의 결과를 비교하고, 아무도 가리키지 않는 파일은 얼마간 두었다가 지우세요. 저장한 뒤에도 에디터의 실행 취소로 그림이 돌아올 수 있고, 아직 한 번도 저장하지 않은 문서에 올린 그림은 저장된 어느 문서에도 없습니다.

**넉넉하게 읽습니다.** 필요 없는 파일을 남기면 용량만 들지만, 아직 쓰이는 파일을 지우면 페이지에서 그림이 사라지기 때문입니다. 그래서 다음도 읽습니다.

- 링크 안, 표 셀, 디렉티브의 라벨, 참조되는 각주에 있는 그림.
- 원시 HTML에 쓴 `<img>`와 `<image>`의 `src`. 태그를 대소문자 어느 쪽으로 썼든, `html` 정책이 그것을 그리든 말든 읽고, 원시 HTML을 전혀 그리지 않는 Flutter 패키지에서도 읽습니다. HTML 주석 안에 있는 것도 읽습니다.

주소가 없는 그림, 코드로 쓴 그림, 아무도 참조하지 않아 그려지지 않는 각주의 그림, 그리고 `srcset`은 넣지 않습니다.

두 패키지는 같은 문서에 같은 목록을 돌려주고, parity 검사가 코퍼스 전체에서 둘을 비교합니다.
