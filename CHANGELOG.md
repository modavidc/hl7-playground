# Changelog

This project follows semantic versioning. Releases below `1.0.0` are previews and may change without backward compatibility.

## [Unreleased]

- Preserve original source line numbers across blank lines.
- Bound message parsing to 512,000 characters and 500 non-empty segments.
- Preserve keyboard focus through tree interactions and announce parse results to assistive technology.
- Add parser, HTML escaping, and browser interaction coverage, plus pull request checks.
- Add a synthetic DFT^P03 example and field guidance for FT1, IN1, GP1, and PR1.
- Clarify that the PID-3 notice is a basic structural hint, identify local Z segments, and run browser checks before Pages deployment.
- Refresh the README screenshot for the financial transaction example.

## [0.1.0] - 2026-10-28

Initial preview release.

- Parse HL7 v2 messages in the browser and explore segments, fields, repetitions, components, and subcomponents.
- Explain common fields across MSH, EVN, PID, PV1, AL1, DG1, ORC, OBR, OBX, and MSA.
- Report basic structural issues with message locations.
- Include synthetic ADT^A01, ORU^R01, and ACK examples.
- Add a responsive interface using the modavidc Design System V2.
- Add parser tests, documentation, and a GitHub Pages deployment workflow.
