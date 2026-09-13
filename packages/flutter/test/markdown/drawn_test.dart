import 'dart:convert';
import 'dart:io';

import 'package:flutter/widgets.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mawy/mawy.dart';

import '../support/host.dart';
import '../support/spans.dart';

/// What a drawn document says, against the list the React package is held to.
///
/// `tool/parity.dart` diffs the parse trees and stops there, because what draws
/// is a widget tree on one side and elements on the other and there is nothing
/// to put a diff between. So the two renderers drift without anything saying
/// so, and they did: a directive inside a footnote was drawn as nothing at all
/// here and as the characters the author typed there, for months, because the
/// context a note is drawn from had lost the field that carries the source.
///
/// `tool/drawn.json` is the answer, and it is deliberately not a diff. It is a
/// list of documents and, for each, the words the drawn document has to contain
/// and the characters it must not — which is the part of "what a document says"
/// that both packages can be held to in the same words. Both suites read the
/// one file, so a case added for one is a case the other answers too.
///
/// Only what both packages draw goes in it. There is no raw HTML here to draw
/// and no `wysiwyg` surface, and those differences are written up in
/// `docs/*/guide/editor.md` rather than tested around. A picture's alt text is
/// not here either while the picture is drawn, and that one is worth naming: a
/// browser draws it from the attribute when the picture will not load, so it is
/// never text on the page, where this renderer has to draw it as words. Under
/// `images: "text"` both draw it as words, and that is here. Each package
/// checks its own half in its own file.
void main() {
  final List<dynamic> cases =
      jsonDecode(File('tool/drawn.json').readAsStringSync()) as List<dynamic>;

  group('a drawn document', () {
    for (int index = 0; index < cases.length; index += 1) {
      final Map<String, dynamic> each = cases[index] as Map<String, dynamic>;
      final String markdown = each['markdown'] as String;
      final String? links = each['links'] as String?;
      final String? images = each['images'] as String?;

      testWidgets('${index + 1}. ${each['why']}', (WidgetTester tester) async {
        await tester.pumpWidget(
          host(
            MawyViewer(
              value: markdown,
              links: links == null ? MawyLinkPolicy.show : MawyLinkPolicy.values.byName(links),
              images: images == null ? MawyImagePolicy.show : MawyImagePolicy.values.byName(images),
              // Nothing but the document: the toolbar has words of its own and
              // this is about what the Markdown became.
              toolbar: const <MawyViewerToolbarItem>[],
              directives: const <String, MawyDirectiveBuilder>{},
            ),
            size: const Size(900, 2400),
          ),
        );
        await tester.pumpAndSettle();

        final String drawn = documentText(tester);

        for (final dynamic saying in each['says'] as List<dynamic>) {
          expect(drawn, contains(saying as String), reason: 'should say ${jsonEncode(saying)}');
        }

        for (final dynamic saying in (each['omits'] as List<dynamic>?) ?? const <dynamic>[]) {
          expect(
            drawn,
            isNot(contains(saying as String)),
            reason: 'should not say ${jsonEncode(saying)}',
          );
        }
      });
    }
  });
}
