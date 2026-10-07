import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const SRC = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) return name === 'tests' ? [] : files(p);
    return /\.(ts|tsx)$/.test(name) && !/\.test\.tsx?$/.test(name) ? [p] : [];
  });
}

const sources = files(SRC).map((p) => ({ path: relative(SRC, p), text: readFileSync(p, 'utf8') }));

describe('architecture rules (spec DO_NOT list, §070)', () => {
  it('no eval() or new Function() anywhere', () => {
    for (const f of sources) {
      expect(f.text, f.path).not.toMatch(/\beval\s*\(/);
      expect(f.text, f.path).not.toMatch(/new\s+Function\s*\(|\bFunction\s*\(\s*['"`]/);
    }
  });
  it('Math.random() is not used anywhere (all randomness via RandomSource)', () => {
    for (const f of sources) expect(f.text, f.path).not.toMatch(/Math\.random\s*\(/);
  });
  it('the math layers do not import React or the DOM', () => {
    const layerA = sources.filter((f) => /^(domain|engines|parsers|validators|solutions|curriculum|generators)\//.test(f.path));
    expect(layerA.length).toBeGreaterThan(5);
    for (const f of layerA) {
      expect(f.text, f.path).not.toMatch(/from ['"]react/);
      expect(f.text, f.path).not.toMatch(/\bdocument\.|\bwindow\./);
    }
  });
  it('no API keys or secrets in source', () => {
    for (const f of sources) expect(f.text, f.path).not.toMatch(/(api[_-]?key|secret|sk-[a-z0-9]{10,})\s*[:=]/i);
  });
});
