---
title: 게시하기
order: 4
---

# 게시하기

사람들이 검색 엔진을 거쳐 찾아오는 페이지라면, Mawy 문서 둘레에 무엇이 있어야 하는지.

::: fw react

## 서버에서 그리기

검색 엔진이 읽는 것은 페이지가 보낸 HTML입니다. `MawyViewer`도 서버에서 렌더한 뒤 하이드레이트하므로 그린 결과는 그 HTML 안에 있습니다. 다만 뷰어가 더하는 것은 모두 동작이고, 게시글에는 그중 무엇도 필요하지 않습니다. [`MawyDocument`](../api/components/mawy-document)는 같은 그림을 자바스크립트 없이 그립니다.

```tsx
import { MawyDocument } from 'mawy-react/server';
import 'mawy-react/styles.css';

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const post = await getPost((await params).slug);

  return (
    <article>
      <h1>{post.title}</h1>
      <MawyDocument value={post.body} headingBase={2} />
    </article>
  );
}
```

서버 컴포넌트가 있는 프레임워크에서는 서버 컴포넌트입니다. 없는 프레임워크에서는 평범한 컴포넌트이고, `renderToStaticMarkup`이 템플릿에 써 넣을 문자열로 바꿉니다.

```tsx
import { renderToStaticMarkup } from 'react-dom/server';

const html = renderToStaticMarkup(<MawyDocument value={post.body} headingBase={2} />);
```

이 패키지는 어떤 프레임워크에도 기대지 않고, 여기에는 클라이언트 번들에 넣을 진입점도 없습니다. 브라우저에 닿는 것은 마크업과 `styles.css`뿐입니다.

## 페이지가 이미 가진 제목

`#`은 `h1`입니다. 문서가 곧 페이지일 때는 맞고, 페이지가 자기 제목을 따로 쓰는 순간 틀립니다. `headingBase={2}`는 문서의 `#`을 `h2`로 그리고 그 아래 모든 제목을 같은 폭만큼 내립니다. [제목 레벨](./viewer#제목-레벨)을 보세요.

## 페이지가 자기에 대해 말하는 것

`<title>`과 설명, 정규 URL은 페이지의 것이고, 그려진 문서에서 읽어 낼 수 있는 값이 아닙니다. [`parseMarkdown`](../api/functions/parse-markdown)은 컴포넌트를 두르지 않은 같은 파서이므로, 페이지가 문서에 직접 물어보면 됩니다.

```ts
import { parseMarkdown, type MdInline } from 'mawy-react/markdown';

const plain = (nodes: MdInline[]): string =>
  nodes
    .map((node) => ('value' in node ? node.value : 'children' in node ? plain(node.children) : ''))
    .join('');

export async function generateMetadata({ params }) {
  const post = await getPost((await params).slug);
  const { root, outline } = parseMarkdown(post.body);
  const opening = root.children.find((block) => block.type === 'paragraph');

  return {
    title: post.title || outline[0]?.text,
    description: opening ? plain(opening.children).slice(0, 160) : undefined,
    alternates: { canonical: `https://example.com/posts/${post.slug}` }
  };
}
```

`outline`은 모든 제목과 그 제목이 받은 앵커입니다. 페이지 옆에 붙이는 목차도 이 값으로 만듭니다. 앵커는 그려진 문서의 것과 같으므로 게시글 중간을 가리키는 링크도 그대로 닿습니다.

## 독자가 쓴 링크

남이 쓴 문서에는 남의 링크가 들어 있습니다. 페이지가 그 링크에 대해 무엇을 밝힐지는 [`linkRel`](../api/types/link-target#mawylinkrel)이 정합니다.

```tsx
<MawyDocument
  value={post.body}
  linkRel={(href) => (href.startsWith('/') ? null : 'nofollow ugc')}
/>
```

답한 값은 링크가 이미 밝힌 것에 더해집니다. 새 탭에서 열리는 링크는 `noopener noreferrer`를 그대로 지닙니다.

## 그림

렌더러는 첫 그림을 뺀 모든 그림에 `loading="lazy"`를 단 `<img>`를 씁니다. 첫 그림에는 `loading="eager"`와 `fetchpriority="high"`를 답니다. 그림으로 시작하는 문서를 실은 페이지는 대개 그 그림으로 평가받기 때문입니다. [첫 그림](../api/types/image#첫-그림)을 보세요.

이 라이브러리가 대신 답할 수 없는 것이 둘 있습니다.

- **그림의 크기.** 마크다운에 크기가 없어서 `<img>`에도 `width`와 `height`가 없고, 바이트가 도착하면 페이지가 다시 흐릅니다. 그림의 모양을 아는 애플리케이션은 `--mawy-doc-image-aspect`로 자리를 미리 잡고, 프레임워크의 이미지 컴포넌트는 `image`로 꽂습니다.

  ```tsx
  <MawyDocument
    value={post.body}
    image={({ src, alt, title, first }) => (
      <Image
        src={src}
        alt={alt}
        title={title ?? undefined}
        width={1200}
        height={630}
        priority={first}
      />
    )}
  />
  ```

- **상대 주소가 가리키는 곳.** 문서에 쓰인 URL은 문서를 기준으로 한 것이고 페이지는 다른 곳에 있으므로, `![](./diagram.png)`은 브라우저가 애플리케이션 옆에서 찾는 그림이 됩니다. [`resolveUrl`](../api/types/url-resolver)이 그 답입니다.

## 이 라이브러리가 쓸 것이 아닌 것

`robots.txt`와 `sitemap.xml`, 정규 호스트, 구조화 데이터는 사이트의 것이고, 마크다운 렌더러는 그 무엇에도 의견이 없습니다. 렌더러가 페이지에 갚을 것은 아무것도 실행하지 않고 크롤러가 읽을 수 있는 마크업이고, 이 페이지의 나머지가 그 이야기입니다.

:::

::: fw flutter

Flutter 웹 빌드는 문서를 엘리먼트가 아니라 캔버스에 그립니다. 위젯이 스크린 리더에 자기를 아무리 잘 설명해도, 그리고 이 패키지의 위젯은 잘 설명합니다만, 크롤러가 읽을 제목도 문단도 링크도 페이지에 없습니다. 검색 엔진을 거쳐 찾아와야 하는 페이지는 HTML로 그립니다.

이것은 이 패키지의 빈자리가 아니라 애플리케이션의 어느 절반을 어디에 둘지의 문제입니다. 뷰어는 앱 안의 문서를 위한 것이고, 검색에 잡혀야 하는 게시글은 페이지로 내보내며, 그것을 그리는 절반이 React 패키지입니다.

:::
