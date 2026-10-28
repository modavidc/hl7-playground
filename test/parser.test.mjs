import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import ts from 'typescript';

const source = await readFile(new URL('../src/parser.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext }
}).outputText;
const parser = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`);
const exampleSource = await readFile(new URL('../src/examples.ts', import.meta.url), 'utf8');
const compiledExamples = ts.transpileModule(exampleSource, {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext }
}).outputText;
const { examples } = await import(`data:text/javascript;base64,${Buffer.from(compiledExamples).toString('base64')}`);

const validMessage = [
  'MSH|^~\\&|APP|FAC|REC|RFAC|20250101010101||ADT^A01|CTRL1|P|2.5',
  'EVN|A01|20250101010101',
  'PID|1||MRN42^^^FAC^MR||Doe^Jane||19800101|F',
  'PV1|1|I|4W^412^A'
].join('\r');

test('parses the MSH special fields at their HL7 indexes', () => {
  const message = parser.parseMessage(validMessage);
  const msh = message.segments[0];

  assert.equal(msh.name, 'MSH');
  assert.equal(msh.fields[0].value, '|');
  assert.equal(msh.fields[1].value, '^~\\&');
  assert.deepEqual(msh.fields[1].repetitions, [[['^~\\&']]]);
  assert.equal(msh.fields[8].value, 'ADT^A01');
  assert.equal(msh.fields[11].value, '2.5');
  assert.deepEqual(message.delimiters, { field: '|', component: '^', repetition: '~', escape: '\\', subcomponent: '&' });
});

test('accepts CR, CRLF, and LF segment boundaries', () => {
  for (const separator of ['\r', '\r\n', '\n']) {
    const message = parser.parseMessage(validMessage.split('\r').join(separator));
    assert.deepEqual(message.segments.map(segment => segment.name), ['MSH', 'EVN', 'PID', 'PV1']);
  }
});

test('uses the delimiters declared in MSH', () => {
  const raw = 'MSH*&%\\!*APP*FAC*REC*RFAC*20250101010101**ADT&A01*CTRL1*P*2.5\rPID*1**MRN42**Doe&Jane';
  const message = parser.parseMessage(raw);

  assert.equal(message.delimiters.field, '*');
  assert.equal(message.delimiters.component, '&');
  assert.equal(message.segments[0].fields[8].value, 'ADT&A01');
  assert.deepEqual(message.segments[1].fields[4].repetitions, [[['Doe'], ['Jane']]]);
  assert.deepEqual(parser.validateMessage(raw, message), []);
});

test('keeps repetitions, components, and subcomponents as separate values', () => {
  const message = parser.parseMessage('OBX|1|ST|ID||one^two&three~four^five&six');
  const result = message.segments[0].fields[4];

  assert.deepEqual(result.repetitions, [
    [['one'], ['two', 'three']],
    [['four'], ['five', 'six']]
  ]);
});

test('preserves empty trailing fields and spaces inside values', () => {
  const message = parser.parseMessage('ZXX|value  ||');

  assert.deepEqual(message.segments[0].fields.map(field => field.value), ['value  ', '', '']);
});

test('reports an empty message and a missing first MSH', () => {
  assert.equal(parser.validateMessage('', parser.parseMessage(''))[0].title, 'Message is empty');
  const malformed = 'PID|1||MRN42||Doe^Jane';
  const issues = parser.validateMessage(malformed, parser.parseMessage(malformed));
  assert.ok(issues.some(item => item.title === 'MSH must be the first segment'));
});

test('keeps original source line numbers when blank lines are ignored', () => {
  const raw = `\n\n${validMessage.split('\r')[0]}\n\nPID^1|MRN42`;
  const message = parser.parseMessage(raw);
  const issues = parser.validateMessage(raw, message);

  assert.deepEqual(message.segments.map(segment => segment.lineNumber), [3, 5]);
  assert.ok(issues.some(item => item.location === 'PID (line 5)'));
});

test('reports malformed MSH encoding and invalid field separators with locations', () => {
  const raw = 'MSH|^^\\&|APP|FAC|REC|RFAC|TIME||ADT^A01|CTRL1|P|2.5\rPID^1^MRN42';
  const issues = parser.validateMessage(raw, parser.parseMessage(raw));

  assert.ok(issues.some(item => item.title === 'MSH delimiters are invalid' && item.location === 'MSH-1/2'));
  assert.ok(issues.some(item => item.title === 'Invalid segment separator' && item.location === 'PID (line 2)'));
});

test('warns about mixed line-ending styles without flagging browser-normalized LF', () => {
  const lfMessage = validMessage.replaceAll('\r', '\n');
  const mixedMessage = validMessage.replace('\rEVN', '\nEVN');
  const lfIssues = parser.validateMessage(lfMessage, parser.parseMessage(lfMessage));
  const mixedIssues = parser.validateMessage(mixedMessage, parser.parseMessage(mixedMessage));

  assert.ok(!lfIssues.some(item => item.title.includes('separator')));
  assert.ok(mixedIssues.some(item => item.title === 'Mixed segment separators'));
});

test('warns when common required fields are blank', () => {
  const raw = 'MSH|^~\\&|APP|FAC|REC|RFAC|TIME|||||P|2.5\rPID|1||||';
  const issues = parser.validateMessage(raw, parser.parseMessage(raw));

  assert.ok(issues.some(item => item.location === 'MSH-9'));
  assert.ok(issues.some(item => item.location === 'PID-5'));
});

test('rejects messages above the character limit before parsing', () => {
  const raw = 'X'.repeat(parser.MAX_MESSAGE_CHARACTERS + 1);
  const message = parser.parseMessage(raw);

  assert.equal(message.limitExceeded, 'characters');
  assert.equal(message.segments.length, 0);
  assert.equal(parser.validateMessage(raw, message)[0].title, 'Message exceeds the size limit');
});

test('rejects messages above the segment limit', () => {
  const raw = Array.from({ length: parser.MAX_SEGMENTS + 1 }, () => 'ZXX|1').join('\r');
  const message = parser.parseMessage(raw);

  assert.equal(message.limitExceeded, 'segments');
  assert.equal(parser.countSegments(raw), parser.MAX_SEGMENTS + 1);
  assert.equal(parser.validateMessage(raw, message)[0].title, 'Message has too many segments');
});

test('all built-in examples parse without basic validation issues', () => {
  assert.deepEqual(examples.map(example => example.name), ['ADT^A01', 'ORU^R01', 'ACK']);
  for (const example of examples) {
    const message = parser.parseMessage(example.message);
    assert.ok(message.segments.length > 1, `${example.name} should contain multiple segments`);
    assert.deepEqual(parser.validateMessage(example.message, message), [], `${example.name} should pass basic validation`);
  }
});
