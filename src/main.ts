import { examples } from './examples';
import { escapeHtml } from './html';
import { countSegments, getFieldDefinition, MAX_MESSAGE_CHARACTERS, MAX_SEGMENTS, parseMessage, segmentDescriptions, validateMessage } from './parser';
import type { Hl7Field, Hl7Message } from './types';
import './styles.css';

const icons = {
  code: '<svg viewBox="0 0 24 24"><path d="m8 5-6 7 6 7M16 5l6 7-6 7M14 3l-4 18"/></svg>',
  parse: '<svg viewBox="0 0 24 24"><path d="M4 5h16M4 12h10M4 19h6M18 15v6m-3-3h6"/></svg>',
  shield: '<svg viewBox="0 0 24 24"><path d="M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11Z"/><path d="m9 12 2 2 4-4"/></svg>',
  chevron: '<svg viewBox="0 0 24 24"><path d="m9 18 6-6-6-6"/></svg>',
  copy: '<svg viewBox="0 0 24 24"><rect x="8" y="8" width="13" height="13" rx="2"/><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3"/></svg>'
};

const app = document.querySelector<HTMLDivElement>('#app')!;
const announcements = document.querySelector<HTMLDivElement>('#announcements')!;
const MAX_FILE_BYTES = 2 * 1024 * 1024;
let selectedExample = 0;
let input = examples[0].message;
let parsed = parseMessage(input);
let issues = validateMessage(input, parsed);
let expandedSegments: Set<number> | null = null;
let expandedFields = new Set<string>();
let hasPendingEdits = false;
let copyMessage = '';
let fileError = '';

type FocusTarget =
  | { id: string }
  | { attribute: 'data-example' | 'data-segment' | 'data-field'; value: string };

function captureFocusTarget(): FocusTarget | null {
  const activeElement = document.activeElement;
  if (!(activeElement instanceof HTMLElement) || !app.contains(activeElement)) return null;
  if (activeElement.id) return { id: activeElement.id };

  for (const attribute of ['data-example', 'data-segment', 'data-field'] as const) {
    const value = activeElement.getAttribute(attribute);
    if (value !== null) return { attribute, value };
  }

  return null;
}

function restoreFocusTarget(target: FocusTarget | null): void {
  if (!target) return;
  const element = 'id' in target
    ? app.querySelector<HTMLElement>(`#${target.id}`)
    : Array.from(app.querySelectorAll<HTMLElement>(`[${target.attribute}]`))
      .find(candidate => candidate.getAttribute(target.attribute) === target.value) ?? null;
  element?.focus({ preventScroll: true });
}

function renderLineNumbers(value: string): string {
  const numbers: string[] = [];
  let lineNumber = 1;
  for (let index = 0; index <= value.length; index++) {
    if (index < value.length && value[index] !== '\r' && value[index] !== '\n') continue;
    if (lineNumber > MAX_SEGMENTS) {
      numbers.push('<span aria-label="More lines">…</span>');
      break;
    }
    numbers.push(`<span>${String(lineNumber).padStart(2, '0')}</span>`);
    if (index === value.length) break;
    if (value[index] === '\r' && value[index + 1] === '\n') index++;
    lineNumber++;
  }

  return numbers.join('');
}

function announceOutcome(action: string): void {
  const errorCount = issues.filter(item => item.severity === 'error').length;
  const warningCount = issues.filter(item => item.severity === 'warning').length;
  if (!errorCount && !warningCount) {
    announcements.textContent = `${action}. ${parsed.segments.length} segments parsed with no basic structure issues.`;
    return;
  }

  const counts = [
    errorCount ? `${errorCount} error${errorCount === 1 ? '' : 's'}` : '',
    warningCount ? `${warningCount} warning${warningCount === 1 ? '' : 's'}` : ''
  ].filter(Boolean).join(' and ');
  announcements.textContent = `${action}. Validation found ${counts}. Review the Validation panel for details.`;
}

function isStructured(field: Hl7Field): boolean {
  return field.repetitions.length > 1 || field.repetitions.some(components =>
    components.length > 1 || components.some(subcomponents => subcomponents.length > 1)
  );
}

function renderValueTree(segmentName: string, field: Hl7Field): string {
  return field.repetitions.map((components, repetitionIndex) => {
    const repetitionLabel = field.repetitions.length > 1
      ? `<div class="repetition-label">Repetition ${repetitionIndex + 1}</div>`
      : '';
    const componentRows = components.map((subcomponents, componentIndex) => {
      const componentPath = `${segmentName}-${field.index}.${componentIndex + 1}`;
      const value = subcomponents.join(' & ') || '—';
      const childRows = subcomponents.length > 1
        ? `<div class="subcomponent-list">${subcomponents.map((part, subcomponentIndex) => `<div class="subcomponent-row"><code>${escapeHtml(`${componentPath}.${subcomponentIndex + 1}`)}</code><span>${escapeHtml(part || '—')}</span></div>`).join('')}</div>`
        : '';
      return `<div class="component-row"><code>${escapeHtml(componentPath)}</code><span>${escapeHtml(value)}</span></div>${childRows}`;
    }).join('');

    return `<div class="repetition-group">${repetitionLabel}${componentRows}</div>`;
  }).join('');
}

function renderField(segmentName: string, field: Hl7Field): string {
  const fieldKey = `${segmentName}-${field.index}`;
  const definition = getFieldDefinition(segmentName, field.index, field.value);
  const expanded = expandedFields.has(fieldKey);
  const fieldKeyHtml = escapeHtml(fieldKey);
  const structure = isStructured(field);
  const hint = structure
    ? `${field.repetitions.length} rep${field.repetitions.length === 1 ? '' : 's'} · ${field.repetitions[0].length} comp`
    : '';

  return `<div class="field-group">
    <div class="field-row">
      <span class="field-index">${fieldKeyHtml}</span>
      <button class="field-label-button" data-field="${fieldKeyHtml}" aria-expanded="${expanded}" aria-label="Explain ${fieldKeyHtml}: ${escapeHtml(definition.name)}">
        <span class="field-label">${escapeHtml(definition.name)}</span><span class="info-mark" aria-hidden="true">i</span>
      </button>
      <span class="field-value ${field.value ? '' : 'empty'}">${escapeHtml(field.value || '—')}</span>
      ${hint ? `<span class="component-hint">${escapeHtml(hint)}</span>` : ''}
    </div>
    ${expanded ? `<div class="field-detail"><p>${escapeHtml(definition.description)}</p>${definition.datatype ? `<span class="datatype-badge">HL7 type <code>${escapeHtml(definition.datatype)}</code></span>` : ''}${structure ? `<div class="component-tree">${renderValueTree(segmentName, field)}</div>` : ''}</div>` : ''}
  </div>`;
}

function renderSegment(segment: Hl7Message['segments'][number]): string {
  const expanded = expandedSegments === null || expandedSegments.has(segment.index);
  const description = segmentDescriptions[segment.name]
    ?? (segment.name.startsWith('Z') ? 'Local extension (implementation-defined)' : 'HL7 Segment');
  return `<div class="segment ${expanded ? 'is-open' : ''}">
    <button class="segment-row" data-segment="${segment.index}" aria-expanded="${expanded}">
      <span class="tree-chevron">${icons.chevron}</span>
      <span class="segment-name">${escapeHtml(segment.name)}</span>
      <span class="segment-description">${escapeHtml(description)}</span>
      <span class="field-count">${segment.fields.length} fields</span>
    </button>
    ${expanded ? `<div class="fields">${segment.fields.map(field => renderField(segment.name, field)).join('')}</div>` : ''}
  </div>`;
}

function render() {
  const focusTarget = captureFocusTarget();
  const messageType = parsed.segments[0]?.fields.find(field => field.index === 9)?.value
    .split(parsed.delimiters.component).join(' ^ ') || 'HL7 MESSAGE';
  const errorCount = issues.filter(item => item.severity === 'error').length;
  const warningCount = issues.filter(item => item.severity === 'warning').length;
  const validationLabel = errorCount
    ? `${errorCount} error${errorCount === 1 ? '' : 's'}`
    : warningCount
      ? `${warningCount} warning${warningCount === 1 ? '' : 's'}`
      : 'All clear';
  const segmentCount = countSegments(input);
  const inputSummary = input.length > MAX_MESSAGE_CHARACTERS
    ? 'Character limit exceeded'
    : segmentCount > MAX_SEGMENTS
      ? `More than ${MAX_SEGMENTS.toLocaleString('en-US')} segments`
      : `${segmentCount} segments`;
  const emptyState = parsed.limitExceeded === 'characters'
    ? 'Message exceeds the 512,000 character limit.'
    : parsed.limitExceeded === 'segments'
      ? `Message exceeds the ${MAX_SEGMENTS.toLocaleString('en-US')} segment limit.`
      : 'Your parsed message will appear here.';

  app.innerHTML = `
    <header class="topbar">
      <a class="brand" href="#" aria-label="HL7 Playground"><span class="brand-mark">HL7</span><span>Playground</span><span class="version">BETA</span></a>
      <nav aria-label="Main navigation"><a class="nav-active" href="#workspace">Playground</a><a href="#about">About HL7</a><a href="https://github.com/modavidc/hl7-playground" target="_blank" rel="noreferrer">GitHub <span class="external">↗</span></a></nav>
      <div class="privacy"><span class="privacy-dot"></span> Private by design</div>
    </header>
    <main id="workspace">
      <section class="hero"><div class="eyebrow"><span class="eyebrow-line"></span> THE HL7 V2 MESSAGE INSPECTOR</div><h1><span>HL7</span> Playground</h1><p>Paste a message. See the structure. Find what needs attention.</p></section>
      <section class="examples" aria-labelledby="examples-heading"><h2 class="section-kicker" id="examples-heading">START WITH AN EXAMPLE</h2><div class="example-row">${examples.map((example, index) => `<button class="example-card ${selectedExample === index ? 'selected' : ''}" data-example="${index}" aria-pressed="${selectedExample === index}"><span class="example-type">${escapeHtml(example.type)}</span><span class="example-name">${escapeHtml(example.name)} <span class="arrow" aria-hidden="true">↗</span></span><span class="example-description">${escapeHtml(example.description)}</span></button>`).join('')}</div></section>
      <section class="workbench" aria-label="HL7 message workspace">
        <div class="panel editor-panel">
          <div class="panel-heading"><div><span class="panel-icon editor-icon">${icons.code}</span><span class="panel-title">Message input</span><span class="panel-subtitle">HL7 v2</span></div><div class="editor-actions"><input id="message-file" class="file-input" type="file" accept=".hl7,.txt,text/plain" aria-label="Choose an HL7 v2 file"><button type="button" class="text-button" id="load-file">Load .hl7</button><button type="button" class="text-button" id="clear">Clear</button></div></div>
          <div id="file-error" class="file-error" role="alert" ${fileError ? '' : 'hidden'}>${escapeHtml(fileError)}</div>
          <div class="editor-wrap"><div class="line-numbers" aria-hidden="true">${renderLineNumbers(input)}</div><textarea id="message" spellcheck="false" aria-label="HL7 v2 message input" aria-describedby="input-summary">${escapeHtml(input)}</textarea></div>
          <div class="editor-footer"><span><span class="live-dot"></span> Runs locally in your browser</span><span id="input-summary" title="Maximum ${MAX_MESSAGE_CHARACTERS.toLocaleString('en-US')} characters or ${MAX_SEGMENTS.toLocaleString('en-US')} segments">${inputSummary}</span></div>
          <button class="parse-button" id="parse">${icons.parse}<span>Parse message</span><kbd>Ctrl / ⌘ ↵</kbd></button>
        </div>
        <div class="panel results-panel">
          <div class="panel-heading results-heading"><div><span class="panel-icon result-icon">${icons.parse}</span><span class="panel-title">Parsed structure</span></div><button class="icon-button" id="copy" aria-label="Copy parsed JSON">${icons.copy}</button></div>
          <div class="result-meta"><span class="message-pill">${escapeHtml(messageType)}</span><span class="meta-count">${parsed.segments.length} segments</span></div>
          <div class="stale-indicator" role="status" ${hasPendingEdits ? '' : 'hidden'}>The input changed. Parse again to refresh these results.</div>
          <div class="tree" id="tree">${parsed.segments.length ? parsed.segments.map(renderSegment).join('') : `<div class="empty-state">${emptyState}</div>`}</div>
          <section class="validation" aria-labelledby="validation-heading">
            <div class="validation-title" id="validation-heading"><span class="panel-icon validation-icon">${icons.shield}</span><span>Validation</span><span class="validation-count ${errorCount ? 'has-error' : warningCount ? 'has-warning' : ''}">${validationLabel}</span></div>
            ${issues.length ? issues.map(item => `<div class="issue ${item.severity}"><span class="issue-symbol" aria-hidden="true">${item.severity === 'error' ? '!' : '△'}</span><div><strong>${escapeHtml(item.title)}${item.location ? ` <code>${escapeHtml(item.location)}</code>` : ''}</strong><span>${escapeHtml(item.detail)}</span></div></div>`).join('') : '<div class="success-message"><span aria-hidden="true">✓</span> No basic structure issues found.</div>'}
          </section>
        </div>
      </section>
      <footer id="about"><span>Built for learning and debugging HL7 v2</span><span class="footer-credit"><strong>HL7 Playground</strong><span>by</span><a href="https://modavidc.com" target="_blank" rel="noreferrer" aria-label="modavidc personal brand"><img src="./modavidc-logo.svg" alt="modavidc"></a></span><span>Messages stay on your device <span class="footer-lock">◆</span></span></footer>
    </main>`;

  restoreFocusTarget(focusTarget);

  const textarea = app.querySelector<HTMLTextAreaElement>('#message')!;
  const fileInput = app.querySelector<HTMLInputElement>('#message-file')!;
  app.querySelector<HTMLButtonElement>('#load-file')!.addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', async () => {
    const file = fileInput.files?.[0];
    if (!file) return;

    if (file.size > MAX_FILE_BYTES) {
      fileError = 'This file exceeds the 2 MB local file limit.';
      render();
      announcements.textContent = fileError;
      return;
    }

    try {
      input = await file.text();
      fileInput.value = '';
      fileError = '';
      selectedExample = -1;
      parsed = parseMessage(input);
      issues = validateMessage(input, parsed);
      expandedSegments = null;
      expandedFields.clear();
      hasPendingEdits = false;
      render();
      announceOutcome(`Loaded ${file.name}`);
    } catch {
      fileInput.value = '';
      fileError = 'The selected file could not be read as text.';
      render();
      announcements.textContent = fileError;
    }
  });

  textarea.addEventListener('input', () => {
    input = textarea.value;
    fileError = '';
    app.querySelector<HTMLElement>('#file-error')!.hidden = true;
    hasPendingEdits = true;
    selectedExample = -1;
    app.querySelectorAll<HTMLButtonElement>('[data-example]').forEach(button => {
      button.classList.remove('selected');
      button.setAttribute('aria-pressed', 'false');
    });
    app.querySelector('.line-numbers')!.innerHTML = renderLineNumbers(input);
    const summary = app.querySelector<HTMLElement>('#input-summary')!;
    summary.textContent = input.length > MAX_MESSAGE_CHARACTERS
      ? 'Character limit exceeded'
      : `${input.length.toLocaleString('en-US')} characters`;
    app.querySelector<HTMLElement>('.stale-indicator')!.hidden = false;
    app.querySelector<HTMLButtonElement>('#copy')!.disabled = true;
  });

  app.querySelectorAll<HTMLButtonElement>('[data-example]').forEach(button => button.addEventListener('click', () => {
    selectedExample = Number(button.dataset.example);
    fileError = '';
    input = examples[selectedExample].message;
    parsed = parseMessage(input);
    issues = validateMessage(input, parsed);
    expandedSegments = null;
    expandedFields.clear();
    hasPendingEdits = false;
    render();
    announceOutcome(`Loaded ${examples[selectedExample].name}`);
  }));

  app.querySelector('#parse')!.addEventListener('click', () => {
    input = textarea.value;
    fileError = '';
    parsed = parseMessage(input);
    issues = validateMessage(input, parsed);
    expandedSegments = null;
    expandedFields.clear();
    hasPendingEdits = false;
    render();
    announceOutcome('Parsing complete');
  });

  app.querySelector('#clear')!.addEventListener('click', () => {
    input = '';
    fileError = '';
    parsed = parseMessage(input);
    issues = validateMessage(input, parsed);
    selectedExample = -1;
    expandedSegments = null;
    expandedFields.clear();
    hasPendingEdits = false;
    render();
    app.querySelector<HTMLTextAreaElement>('#message')!.focus();
    announceOutcome('Message cleared');
  });

  app.querySelectorAll<HTMLButtonElement>('[data-segment]').forEach(button => button.addEventListener('click', () => {
    const index = Number(button.dataset.segment);
    if (expandedSegments === null) {
      expandedSegments = new Set(parsed.segments.filter(segment => segment.index !== index).map(segment => segment.index));
    } else if (expandedSegments.has(index)) {
      expandedSegments.delete(index);
    } else {
      expandedSegments.add(index);
    }
    render();
  }));

  app.querySelectorAll<HTMLButtonElement>('[data-field]').forEach(button => button.addEventListener('click', () => {
    const key = button.dataset.field!;
    if (expandedFields.has(key)) expandedFields.delete(key);
    else expandedFields.add(key);
    render();
  }));

  app.querySelector('#copy')!.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(parsed, null, 2));
      copyMessage = 'Copied';
      announcements.textContent = 'Parsed JSON copied to the clipboard.';
    } catch {
      copyMessage = 'Clipboard unavailable';
      announcements.textContent = 'Clipboard access is unavailable.';
    }
    const copyButton = app.querySelector<HTMLButtonElement>('#copy')!;
    copyButton.disabled = false;
    copyButton.innerHTML = `<span class="copied-label">${copyMessage}</span>`;
    window.setTimeout(() => { copyMessage = ''; render(); }, 1400);
  });

  textarea.addEventListener('keydown', event => {
    if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') app.querySelector<HTMLButtonElement>('#parse')!.click();
  });
}

render();
