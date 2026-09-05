/// Everywhere that is not a browser, where a gallery is the whole application.
library;

import 'package:mawy/mawy.dart';

/// Nothing to listen to: there is no page around this one to hear from.
///
/// Returns null rather than a function that does nothing, so the caller can
/// tell "not embedded" from "embedded and quiet" if it ever needs to.
void Function()? listenToHostColorScheme(void Function(MawyColorScheme) onScheme) => null;
