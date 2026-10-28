# HL7 Playground

<p>
  <a href="https://github.com/modavidc/hl7-playground/tags"><img alt="Latest tag" src="https://img.shields.io/github/v/tag/modavidc/hl7-playground?sort=semver"></a>
  <a href="https://github.com/modavidc/hl7-playground/actions/workflows/pages.yml"><img alt="GitHub Pages deployment" src="https://img.shields.io/github/actions/workflow/status/modavidc/hl7-playground/pages.yml?branch=main&label=Pages"></a>
  <a href="LICENSE"><img alt="MIT License" src="https://img.shields.io/badge/license-MIT-1E7D47.svg"></a>
</p>

**Explore an HL7 v2 message as a structure you can understand.** Paste a message to inspect its segments and fields, expand components, and see where basic checks find problems. Parsing happens in your browser.

Built under the **modavidc** personal brand.

**Latest tagged version:** `v0.1.0` · preview release. Changes on `main` after this tag are unreleased; interfaces and field coverage may change before `1.0.0`.

![HL7 Playground desktop interface](screenshots/hl7-playground.png)

## Why this exists

HL7 v2 is common in healthcare integrations, but its compact segment format makes messages difficult to read by eye. HL7 Playground turns that text into an explorable view and explains common fields as you inspect them.

## Try it

Try the [live GitHub Pages demo](https://modavidc.github.io/hl7-playground/). Every push to `main` runs the parser checks, builds the static site, and deploys the `dist` output.

Run it locally:

```sh
npm ci
npm run dev
```

## Releases

The project follows semantic versioning. Versions below `1.0.0` are previews, so parser behavior and field definitions can still change. See [CHANGELOG.md](CHANGELOG.md) for the release history.

## Features

- Parses HL7 v2 messages using the delimiters declared in MSH.
- Preserves fields, repetitions, components, and subcomponents.
- Explains common MSH, EVN, PID, PV1, AL1, DG1, ORC, OBR, OBX, FT1, IN1, GP1, PR1, and MSA fields.
- Checks for a missing or malformed MSH, invalid segment separators, mixed line endings, and blank common required fields.
- Includes ADT^A01, ORU^R01, ACK, and a synthetic DFT^P03 financial transaction example.
- Limits input to 512,000 characters and 500 non-empty segments to keep parsing responsive.
- Keeps parsing and fonts local to the browser; message content is not sent to a service.

## Quality checks

```sh
npm test
npx playwright install chromium
npm run test:ui
npm run build
```

The parser suite covers header indexing, delimiter handling, line endings, nested field structure, empty fields, input limits, validation locations, HTML escaping, and all built-in examples. The browser suite covers keyboard focus, validation announcements, source line locations, the DFT example, and oversized inputs. Pull requests and the Pages deployment workflow run both suites and a production build before publishing.

## Scope and limits

This is an educational inspector and basic structural checker. It does not validate an implementation guide or certify conformance, decode HL7 escape sequences, parse MLLP framing, or replace a production interface engine. A warning such as an empty PID-3 is a basic structural hint, not an implementation guide conformance result. Input is limited to 512,000 characters and 500 non-empty segments. Some fields change meaning or data type by version and message profile; the built-in field guide covers common v2.5 use and labels values such as OBX-5 as dependent on OBX-2. `Z` segments are local extensions and their field meanings depend on the sending implementation. Examples contain synthetic data. Do not use this tool for clinical decisions.

## Built-in field references

Names and descriptions are intended as a quick guide. See the HL7-maintained references for additional context:

- [MSH segment mapping](https://hl7.org/fhir/uv/v2mappings/ConceptMap-segment-msh-to-encounter.html)
- [PID segment mapping](https://www.hl7.org/fhir/uv/v2mappings/ConceptMap-segment-pid-to-patient.html)
- [OBX segment mapping](https://www.hl7.org/fhir/uv/v2mappings/ConceptMap-segment-obx-to-observation.html)
- [HL7 v2.5.1 financial management segments](https://www.hl7.eu/HL7v2x/v251/std251/ch06.html) (FT1, IN1, GP1, and PR1)

## Licensing

The project source is available under the [MIT License](LICENSE). Bundled Schibsted Grotesk and JetBrains Mono font files have their own SIL Open Font License notices in `public/fonts/FONT-LICENSES.txt`.

## Project structure

- `src/parser.ts` parses messages, runs basic checks, and contains the built-in field guide.
- `src/html.ts` escapes message content before it is inserted into the page.
- `src/examples.ts` contains the synthetic demonstration messages.
- `src/main.ts` renders the single-page inspector.
- `src/styles.css` applies the modavidc Design System V2 typography and colors.
- `test/parser.test.mjs` exercises parser and validation behavior with Node's built-in test runner.
- `e2e/playground.spec.ts` covers the main browser interactions.
- `.github/workflows/ci.yml` runs tests and a build for pull requests.
- `.github/workflows/pages.yml` tests, builds, and deploys the static app to GitHub Pages.
- `public/fonts/FONT-LICENSES.txt` carries the licenses for the bundled font files.

## Roadmap

- Expand field coverage and version-specific definitions.
- Add optional message profiles for deeper validation.
- Add downloadable JSON exports and a shareable sample library.
