import 'package:flutter/widgets.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mawy/mawy.dart';

import '../support/host.dart';

/// One piece of code written several ways, drawn as tabs.
///
/// The parser reads the shape and stops there, so the name is the
/// application's: what this file is about is the drawing it registers for one.

const String document = '''
::: code-group

```js
sub(10, 1, 5);
```

```dart
sub(<int>[10, 1, 5]);
```

:::''';

Widget _viewer(String value) => MawyViewer(
  value: value,
  toolbar: const <MawyViewerToolbarItem>[],
  directives: <String, MawyDirectiveBuilder>{
    'code-group': (BuildContext context, MawyDirective directive) =>
        MawyCodeGroup(tokens: MawyTokens.light, directive: directive),
    'lang': (BuildContext context, MawyDirective directive) =>
        MawyCodeGroup(tokens: MawyTokens.light, directive: directive),
  },
);

void main() {
  group('MawyCodeGroup', () {
    testWidgets('draws a tab per block, named by the language on the fence', (
      WidgetTester tester,
    ) async {
      await tester.pumpWidget(host(_viewer(document)));
      await tester.pumpAndSettle();

      expect(find.text('js'), findsOneWidget);
      expect(find.text('dart'), findsOneWidget);

      // One of them showing, and the other nowhere on the screen.
      expect(find.textContaining('sub(10, 1, 5);'), findsOneWidget);
      expect(find.textContaining('sub(<int>[10, 1, 5]);'), findsNothing);
    });

    testWidgets('shows the block whose tab was chosen', (WidgetTester tester) async {
      await tester.pumpWidget(host(_viewer(document)));
      await tester.pumpAndSettle();

      await tester.tap(find.text('dart'));
      await tester.pumpAndSettle();

      expect(find.textContaining('sub(<int>[10, 1, 5]);'), findsOneWidget);
      expect(find.textContaining('sub(10, 1, 5);'), findsNothing);
    });

    testWidgets('takes the names the document gave, where a language is not the word', (
      WidgetTester tester,
    ) async {
      await tester.pumpWidget(
        host(
          _viewer(document.replaceFirst('::: code-group', '::: code-group{tabs=Browser,Flutter}')),
        ),
      );
      await tester.pumpAndSettle();

      expect(find.text('Browser'), findsOneWidget);
      expect(find.text('Flutter'), findsOneWidget);
      expect(find.text('js'), findsNothing);
    });

    testWidgets('names a group of one by the title the line wrote', (WidgetTester tester) async {
      await tester.pumpWidget(host(_viewer('::: lang bash\n\n```bash\nnpm i mawy\n```\n\n:::')));
      await tester.pumpAndSettle();

      // The title, and not a second name beside it saying the language again.
      expect(find.text('bash'), findsOneWidget);
    });

    testWidgets('draws nothing for a group with nothing in it', (WidgetTester tester) async {
      await tester.pumpWidget(host(_viewer('::: code-group\n:::')));
      await tester.pumpAndSettle();

      expect(find.byType(MawyCodeGroup), findsOneWidget);
      expect(find.byType(SingleChildScrollView), findsNothing);
    });
  });
}
