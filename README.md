# Math Lab (Rihaan Math)

Brick-themed math practice for kids, rebuilt from the original single-page **Math Lab**
(https://swaruplab.bio.uci.edu/rihaan-math/) to the Rihaan Math engineering spec.

* **Kid screen:** only the question, **💡 Ways to solve** (2+ strategies for every problem, step by step, plus
  🧱 brick models), and the answer spot. Kids can answer with the brick number pad, by **handwriting** (recognised
  on the device), or the keyboard. Also: read-aloud 🔊, brick tower rewards, buddy, celebrations.
* **Grown-ups area (🔒 passcode):** choose the math (several topics and operations at once), **🎓 Grade Level
  Math** (California Common Core math standards, K–8: 224 skills tagged with standard codes), level and custom
  ranges, practice or quiz mode, timer, tries, when strategies appear, answer modes, colours (the original 19
  swatches as brick colours), baseplate, fonts, text size, contrast, sounds, celebrations, read-aloud, progress by
  topic and standard, quiz PDF reports, printable worksheets with answer keys, and the passcode.

## Develop

```bash
npm install
npm run dev          # http://localhost:5173
npm test             # unit + property + integration tests (Vitest, fast-check)
npm run test:e2e     # browser tests on the production build (Playwright; first run: npx playwright install chromium)
npm run build        # type-check + production build into dist/
```

## Deploy

**Live site:** https://swaruprihaan-arch.github.io/Math/ — every push to `main` runs the tests, builds the site and
publishes it with GitHub Pages (`.github/workflows/deploy.yml`).

The build uses relative paths and hash routes (`#/`, `#/parent`), so it also works from any other folder with
**no server rewrites** — e.g. copy the contents of `dist/` into the folder nginx serves at `/rihaan-math/` to update
`https://swaruplab.bio.uci.edu/rihaan-math/`.

## How it is built

| Layer | Folder | Notes |
|---|---|---|
| Math semantics | `src/domain`, `src/engines`, `src/curriculum`, `src/parsers`, `src/validators`, `src/solutions` | exact `bigint` rationals, seeded randomness, no `eval`, answers compared by value |
| Presentation | `src/components`, `src/styles`, `src/pdf` | React + brick CSS; jsPDF bundled (no CDN) |
| Interaction | `src/state`, `src/app` | pure state machines (question / quiz / timer), settings & progress in `localStorage` |

* Correctness: `parseAnswer(raw, schema)` → `evaluateEquivalence(value, canonical, policy)`; unreadable input is a hint,
  never a wrong answer; a right value in the wrong form (e.g. not simplified) is a hint too.
* Every generated question is checked in tests: its solution and every alternative strategy reach the canonical answer,
  typing the canonical answer is graded correct, and the same seed reproduces the same question.
* Handwriting: a small neural network (784-128-10, int8) trained on MNIST with augmentation (98.5% test accuracy),
  plus stroke rules for `.`, `−`, `/`, `:`. Training script is not part of the app; weights live in `src/handwriting/model.ts`.
* The parent passcode is a convenience lock (salted PBKDF2 hash in this browser), not server-side security. There is
  no recovery code: a forgotten passcode is reset by clearing the site's data in the browser (this also resets settings and progress).
