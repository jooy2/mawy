---
title: 이미지
order: 19
---

# 이미지

문서 안의 그림이 무엇이 되는지, 그리고 에디터에 넣은 그림이 어디로 가는지. [이미지](../../guide/editor#이미지)를 보세요.

::: fw react

## `MawyImageProps`

```ts
interface MawyImageProps {
  /** 그림이 있는 곳. 스킴 허용 목록을 이미 통과했습니다. */
  src: string;
  /** 그림이 보이지 않는 독자를 위해, 그림이 무엇인지. */
  alt: string;
  /** `title`이 쓰였다면 그 값. */
  title: string | null;
}
```

뷰어의 `image` 컴포넌트가 받는 것입니다. 없으면 `<img>`를 쓰고 브라우저가 가져옵니다. 있으면 애플리케이션이 대신 그림을 그리는데, 요청에 헤더를 얹거나 자기 로더로 보내거나 캐시에서 답하거나 거절하는 방법은 이것뿐입니다.

저자가 `![](…)`라고 쓴 자리에서는 `alt`가 비어 있습니다. 마크다운에서 그것은 장식이라는 뜻입니다.

어떤 그림까지 가져올지는 뷰어가 정할 일이 아닙니다. 다른 데서 온 문서에는 남의 URL이 들어 있고, 그것을 묻지도 않고 모두 가져오는 일은 그 URL을 쓴 사람에게 어떤 문서가 읽히고 있는지 알려 주는 일입니다.

## `MawyImageUpload`

```ts
type MawyImageUpload = (file: File) => MawyImageSource | null | Promise<MawyImageSource | null>;
```

에디터에 떨어뜨리거나 붙여넣은 그림이 어디로 가고 어떤 URL을 쓸지. 파일을 어딘가에 보관하는 일은 텍스트 에디터가 혼자 정할 일이 아니므로, `onUploadImage`가 없으면 떨어뜨린 파일은 아무 일도 하지 않습니다. 이미 웹에 있는 이미지를 페이지째 붙여넣으면 원래 가지고 있던 URL 그대로 들어옵니다.

```tsx
<MawyEditor onUploadImage={async (file) => (await save(file)).url} />
```

예외를 던지거나 아무것도 돌려주지 않는 것이 업로드가 실패했다고 말하는 방법입니다. 에디터는 실패를 알리고 아무것도 쓰지 않습니다.

## `MawyImageSource`

```ts
type MawyImageSource =
  | string
  | {
      url: string;
      alt?: string;
      title?: string;
    };
```

URL, 또는 URL과 마크다운에서 그 둘레에 들어갈 낱말들입니다.

:::

::: fw flutter

## `MawyImage`

```dart
class MawyImage {
  const MawyImage({required this.url, required this.alt, this.title});

  /// 그림이 있는 곳. 스킴 허용 목록을 이미 통과했습니다.
  final String url;
  /// 그림이 보이지 않는 독자를 위해, 그림이 무엇인지.
  final String alt;
  /// `title`이 쓰였다면 그 값.
  final String? title;
}
```

문서가 요청한 그림이고, 빌더가 받는 것입니다. 저자가 `![](…)`라고 쓴 자리에서는 `alt`가 비어 있습니다. 마크다운에서 그것은 장식이라는 뜻입니다.

## `MawyImageBuilder`

```dart
typedef MawyImageBuilder = Widget Function(BuildContext context, MawyImage image);
```

그림을 그리는 것입니다. 주지 않으면 뷰어가 직접 그립니다. 네트워크로 가져오거나 `data:` URL의 바이트에서 꺼냅니다. 주면 애플리케이션이 대신 그리는데, 요청에 헤더를 얹거나 자기 클라이언트로 보내거나 캐시에서 답하거나 거절하는 방법은 이것뿐입니다.

```dart
MawyViewer(
  value: document,
  imageBuilder: (BuildContext context, MawyImage image) =>
      Image.network(image.url, headers: session.headers, semanticLabel: image.alt),
);
```

어떤 그림까지 가져올지는 링크를 어디에서 열지와 마찬가지로 뷰어가 정할 일이 아닙니다. 공개된 페이지에 그려지는 비공개 문서가 이 기능이 존재하는 이유입니다. 그 안의 URL은 남의 것이고, 묻지도 않고 모두 가져오는 뷰어는 어떤 문서가 읽히고 있는지 남에게 알려 주는 뷰어입니다.

여기에는 업로드가 없습니다. 에디터는 애플리케이션이 건넨 URL로 마크다운을 쓸 뿐이고, 파일을 고르는 일은 위젯이 아니라 플러그인의 몫입니다.

:::
