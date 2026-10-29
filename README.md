# HL7 Playground

<p align="center">
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white">
  <img alt="Vite" src="https://img.shields.io/badge/Vite-646CFF?logo=vite&logoColor=white">
  <img alt="Playwright" src="https://img.shields.io/badge/Playwright-2EAD33?logo=playwright&logoColor=white">
  <a href="https://github.com/modavidc/hl7-playground/tags"><img alt="Latest tag" src="https://img.shields.io/github/v/tag/modavidc/hl7-playground?sort=semver&label=latest%20tag"></a>
  <a href="https://github.com/modavidc/hl7-playground/actions/workflows/ci.yml"><img alt="Continuous integration with GitHub Actions" src="https://img.shields.io/badge/CI-GitHub_Actions-2088FF?logo=githubactions&logoColor=white"></a>
  <a href="https://github.com/modavidc/hl7-playground/actions/workflows/pages.yml"><img alt="GitHub Pages deployment" src="https://img.shields.io/github/actions/workflow/status/modavidc/hl7-playground/pages.yml?branch=main&label=Pages"></a>
  <a href="LICENSE"><img alt="MIT License" src="https://img.shields.io/badge/license-MIT-1E7D47.svg"></a>
</p>

HL7 Playground turns HL7 v2 messages into an expandable tree. Paste a message to inspect its segments, follow fields through components, and see basic structural warnings. Parsing stays in your browser.

<p>
  <a href="https://modavidc.github.io/hl7-playground/">🚀 Open the live demo</a> ·
  <a href="https://github.com/modavidc/hl7-playground/issues/new?template=bug_report.yml">🐛 Report a bug</a> ·
  <a href="https://github.com/modavidc/hl7-playground/issues/new?template=feature_request.yml">💡 Request a feature</a>
</p>

<p align="center">
  <a href="screenshots/hl7-playground-demo.gif"><img src="screenshots/hl7-playground-demo.gif" alt="HL7 Playground parsing a synthetic DFT message and explaining its transaction code" width="960"></a><br>
  <sub>Click the demo to open the full-size GIF.</sub>
</p>

## ✨ What it does

HL7 v2 messages are compact and hard to scan by eye. HL7 Playground separates a message into an expandable tree so you can follow each value back to its segment and field.

- Parses delimiters declared in MSH and preserves fields, repetitions, components, and subcomponents.
- Explains common fields across MSH, EVN, PID, PV1, AL1, DG1, ORC, OBR, OBX, FT1, IN1, GP1, PR1, and MSA.
- Flags a missing or malformed MSH, invalid segment separators, mixed line endings, and blank fields used by its basic checks.
- Includes ADT^A01, ORU^R01, ACK, and a synthetic DFT^P03 financial transaction.
- Opens `.hl7` and `.txt` files locally in the browser. File contents are not uploaded.
- Keeps parsing and fonts in the browser. Message content is not sent to a service.
- Limits input to 512,000 characters and imported files to 2 MB.

## 🚀 Run it locally

```sh
git clone https://github.com/modavidc/hl7-playground.git
cd hl7-playground
npm ci
npm run dev
```

Open the local URL printed by Vite. Choose an example or paste your own HL7 v2 message, then select **Parse message**.

## 🧪 Checks and tests

```sh
npm test
npx playwright install chromium
npm run test:ui
npm run build
```

The parser tests cover delimiter handling, line endings, nested field structure, limits, validation locations, and built-in examples. Browser tests cover parsing, local file loading, field guidance, keyboard focus, accessibility announcements, and local Z segments. Pull requests run both test suites and a production build. The Pages workflow runs the same checks before deployment.

## 🌳 Architecture

```text
hl7-playground/
├── .github/
│   ├── ISSUE_TEMPLATE/
│   │   ├── bug_report.yml
│   │   ├── config.yml
│   │   └── feature_request.yml
│   └── workflows/
│       ├── ci.yml                 # Pull request checks
│       └── pages.yml              # Test, build, and deploy to GitHub Pages
├── e2e/
│   └── playground.spec.ts         # Browser interaction tests
├── public/
│   └── fonts/                     # Locally served fonts and license notices
├── screenshots/
│   └── hl7-playground-demo.gif
├── src/
│   ├── examples.ts                # Synthetic demo messages
│   ├── html.ts                    # Escapes untrusted message content
│   ├── main.ts                    # Single-page interface and tree rendering
│   ├── parser.ts                  # HL7 v2 parsing, field guide, and basic checks
│   ├── styles.css                 # modavidc Design System V2
│   └── types.ts                   # Parser data types
├── test/
│   ├── html.test.mjs
│   └── parser.test.mjs
├── index.html
├── package.json
└── playwright.config.ts
```

## 📝 Version

The latest tag is `v0.1.0`, a preview release. Changes on `main` after that tag are not part of a release yet. Parser behavior and field coverage may change before `1.0.0`.

## ⚠️ Scope and limits

This is an educational inspector with basic structural checks. It does not validate an implementation guide or certify conformance, decode HL7 escape sequences, parse MLLP framing, or replace a production interface engine. An empty PID-3 warning is a structural hint, not a profile-conformance result. The built-in field guide covers common v2.5 use; field meaning can vary by version and message profile. `Z` segments are local extensions, so their field meanings depend on the sending implementation.

Input is limited to 512,000 characters and 500 non-empty segments; imported files are capped at 2 MB. Examples contain synthetic data. **Do not include real patient information in public bug reports or feature requests.** Do not use this tool for clinical decisions.

## 📚 HL7 references

These references provide additional context for common segment fields:

- [MSH segment mapping](https://hl7.org/fhir/uv/v2mappings/ConceptMap-segment-msh-to-encounter.html)
- [PID segment mapping](https://www.hl7.org/fhir/uv/v2mappings/ConceptMap-segment-pid-to-patient.html)
- [OBX segment mapping](https://www.hl7.org/fhir/uv/v2mappings/ConceptMap-segment-obx-to-observation.html)
- [HL7 v2.5.1 financial management segments](https://www.hl7.eu/HL7v2x/v251/std251/ch06.html)

## 🤝 Feedback and contributions

Use the issue forms to [report a bug](https://github.com/modavidc/hl7-playground/issues/new?template=bug_report.yml) or [request a feature](https://github.com/modavidc/hl7-playground/issues/new?template=feature_request.yml). Include synthetic messages only.

## 📄 License

The project source is available under the [MIT License](LICENSE). Bundled Schibsted Grotesk and JetBrains Mono font files have separate SIL Open Font License notices in `public/fonts/FONT-LICENSES.txt`.
