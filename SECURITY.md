# Security Policy

## Supported versions

Both packages are published at `1.0.0`. Only the **latest release** of each package receives security fixes; there are no maintained release branches behind it, so upgrading is how a fix arrives.

| Package            | Version        | Supported |
| ------------------ | -------------- | --------- |
| `mawy-react` (npm) | Latest release | Yes       |
| `mawy-react` (npm) | Anything older | No        |
| `mawy` (pub.dev)   | Latest release | Yes       |
| `mawy` (pub.dev)   | Anything older | No        |

If a release line is ever maintained on its own, this table will name it.

## Reporting a vulnerability

**Do not open a public issue for a security problem**, and do not describe one in a pull request. A vulnerability that is public before there is a version to upgrade to puts every application that embeds this library at risk.

Report it privately through one of these routes:

- **GitHub Security Advisories.** [Open a draft advisory](https://github.com/jooy2/mawy/security/advisories/new). This is the preferred route: it keeps the report, the fix and the eventual disclosure in one place.
- **Email.** [jooy2.contact@gmail.com](mailto:jooy2.contact@gmail.com), with `mawy security` in the subject.

Please include, as far as you can:

- The version of the package, and the browser or runtime it was reproduced on.
- What an attacker can do with it: read data, run script, or escape into the embedding page. Say that rather than only what the input looks like.
- The smallest input or document that reproduces it, and the steps to get there.
- Whether it is already public anywhere.

### What happens next

- **Within 3 days** you should have an acknowledgement that the report arrived.
- **Within 14 days** you should have an assessment: whether it is accepted, what the impact is judged to be, and a rough timetable.
- A fix is released as soon as it is ready, and the advisory is published with it. If you would like to be credited, say so in the report and name what you would like to be credited as.

If you do not hear back inside those windows, please follow up rather than assume the report arrived.

## Scope

This project is a Markdown editor and viewer that runs inside somebody else's page, so the things most worth reporting are the ones that cross that boundary:

- **Cross-site scripting from document content.** A Markdown document, an embedded HTML block, a link or image URL (`javascript:`, `data:`), or a pasted fragment that ends up executing script in the embedding page.
- **Escaping the rendered output.** Content that breaks out of the structure the renderer intended and injects attributes, event handlers or elements the caller never allowed.
- **Denial of service in the parser.** An input of reasonable size that makes parsing or rendering take unbounded time or memory: pathological backtracking, unbounded nesting, or quadratic growth.
- **Supply chain.** A vulnerability in something the published package actually depends on at runtime, reachable through the way we use it.

Out of scope:

- Reports about a **development dependency** that never reaches a consumer's bundle, unless you can show a path from it into a published artifact.
- **Rendering untrusted Markdown with sanitisation deliberately turned off**, where the documentation says that option makes the caller responsible for the content.
- Findings from an automated scanner with no demonstrated impact.
- Anything about the documentation site's hosting rather than the library.

## Disclosure

We ask for coordinated disclosure: give us a chance to release a fix before the details are public. In return, we answer within the timetable above, and if a fix will take longer than that, we will say so and why.
