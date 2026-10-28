import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import ts from 'typescript';

const source = await readFile(new URL('../src/html.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext }
}).outputText;
const { escapeHtml } = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`);

test('escapes untrusted text before it is inserted into HTML', () => {
  assert.equal(escapeHtml(`<tag attr="value"> & 'text'`), '&lt;tag attr=&quot;value&quot;&gt; &amp; &#39;text&#39;');
  assert.equal(escapeHtml('&lt;script&gt;'), '&amp;lt;script&amp;gt;');
});
