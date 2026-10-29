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

HL7 Playground is a browser-based inspector for HL7 v2 messages.

Built for HL7 integrators, interoperability teams, QA engineers, and developers debugging message flows.

Trace each value to its segment and review structural warnings without sending message data to a server.

**Status:** Preview tool for structural inspection and learning. Latest tag: `v0.1.0`; changes on `main` after this tag are unreleased.

<p>
  <a href="https://modavidc.github.io/hl7-playground/">Open the live demo</a> ·
  <a href="https://github.com/modavidc/hl7-playground/issues/new?template=bug_report.yml">Report a bug</a> ·
  <a href="https://github.com/modavidc/hl7-playground/issues/new?template=feature_request.yml">Request a feature</a>
</p>

<p align="center">
  <a href="screenshots/hl7-playground-demo.gif"><img src="screenshots/hl7-playground-demo.gif" alt="HL7 Playground parsing a synthetic DFT message and explaining its transaction code" width="960"></a><br>
  <sub>Click the demo to open the full-size GIF.</sub>
</p>

## What it does

- Parses delimiters declared in MSH and preserves fields, repetitions, components, and subcomponents.
- Explains common fields across MSH, EVN, PID, PV1, AL1, DG1, ORC, OBR, OBX, FT1, IN1, GP1, PR1, and MSA.
- Flags basic structural issues and links findings to their segment or field in the tree.
- Includes synthetic ADT^A01, ORU^R01, ACK, and DFT^P03 examples.
- Opens `.hl7` and `.txt` files locally; message content is not sent to a service.

## Quick start in 30 seconds

Paste an HL7 message, select **Parse message**, and explore the message tree.

1. [Open the live demo](https://modavidc.github.io/hl7-playground/).
2. Paste this synthetic ADT message or choose the built-in **ADT^A01** example, then select **Parse message**.

```hl7
MSH|^~\&|SENDER|FACILITY|RECEIVER|FACILITY|20260101120000||ADT^A01|MSG0001|P|2.5
PID|1||DEMO-001^^^FACILITY^MR||Sample^Patient
PV1|1|O
```

3. Expand **PID** to inspect its fields. Select a field name for its explanation; if validation finds an issue, choose **View in tree** to jump to its location.

### Run locally

No backend, token, or environment variables are required for local use.

```sh
git clone https://github.com/modavidc/hl7-playground.git
cd hl7-playground
npm ci
npm run dev
```

Open the local URL printed by Vite. Choose an example or paste a message, then select **Parse message**.

## Troubleshooting

| Problem | What it means | How to fix |
| --- | --- | --- |
| The message does not parse as expected | The header or delimiters may be malformed. | Keep `MSH` intact. Separators are read from `MSH-1` and `MSH-2`; segment boundaries may be CR, LF, or CRLF. |
| A file is rejected | The format or size is outside the supported limits. | Use a `.hl7` or `.txt` file under 2 MB. |
| A structural warning remains | The check found a basic issue; it does not apply a message profile. | Follow the location shown in the tree and verify profile requirements with your integration documentation. |
| A field explanation is missing or differs | The field guide covers common v2.5 usage; meanings can vary by version or profile. | Check the version-specific HL7 reference or the sending implementation's documentation. |

## Tests

```sh
npm test
npx playwright install chromium
npm run test:ui
npm run build
```

Parser tests cover delimiters, nested fields, limits, validation, and examples. Browser checks cover parsing, local files, field guidance, keyboard interaction, and Z segments. On every pull request and before Pages deployment, GitHub Actions runs both suites and a production build.

## Architecture

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

## Scope and limits

- **What it does:** Parses HL7 v2 messages, renders their structure, explains common fields, and reports basic structural checks.
- **What it does not do:** Validate implementation guides or profiles, certify conformance, decode escape sequences, parse MLLP framing, or replace a production interface engine.
- **Field guidance:** Common v2.5 usage only. Meanings may vary by version or profile; `Z` segments are implementation-defined. An empty PID-3 warning is a structural hint.
- **Input limits:** 512,000 characters and 500 non-empty segments per message; imported files are capped at 2 MB.
- **Data and use:** Examples are synthetic. Do not include real patient information in public issues or use the tool for clinical decisions.

## HL7 references

These references provide additional context for common segment fields:

- [MSH segment mapping](https://hl7.org/fhir/uv/v2mappings/ConceptMap-segment-msh-to-encounter.html)
- [PID segment mapping](https://www.hl7.org/fhir/uv/v2mappings/ConceptMap-segment-pid-to-patient.html)
- [OBX segment mapping](https://www.hl7.org/fhir/uv/v2mappings/ConceptMap-segment-obx-to-observation.html)
- [HL7 v2.5.1 financial management segments](https://www.hl7.eu/HL7v2x/v251/std251/ch06.html)

## Feedback and contributions

Contributions are welcome for parser edge cases, synthetic examples, validation logic, and usability improvements. Use the issue forms to [report a bug](https://github.com/modavidc/hl7-playground/issues/new?template=bug_report.yml) or [request a feature](https://github.com/modavidc/hl7-playground/issues/new?template=feature_request.yml). Include synthetic messages only.

## License

The project source is available under the [MIT License](LICENSE). Bundled Schibsted Grotesk and JetBrains Mono font files have separate SIL Open Font License notices in `public/fonts/FONT-LICENSES.txt`.
