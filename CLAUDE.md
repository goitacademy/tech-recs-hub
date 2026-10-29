# Tech recs hub

Static site with mentor tech recommendations for GoIT courses: practical advice from the mentor to students, one page per course. Published to GitHub Pages by `.github/workflows/deploy.yml` on every push to `main`. Only `site/` is published.

- `site/_shared/recs.css`, `site/_shared/recs.js` — the one shared template: design, rendering, search, block tabs, self-check, data validation (`validate()`).
- `site/<course-slug>-<6 hex>/index.html` — one page. It contains only `<title>` and the course data (`const RECS = {...}`) and loads the template.

Each page is shared by direct link only. There is no index page or list of pages. Do not create one.

## Add a page

The user gives course material: a course program, mentor notes, an old recommendations HTML, or a request to write recommendations.

1. Run `scripts/new-recs.sh <course-slug>` (lowercase latin letters, digits, hyphens; e.g. `python-core`).
   It prints the new folder, e.g. `site/python-core-3fa9c1`. Never create or rename page folders by hand.
2. Copy `index.html` from an existing page folder into the new folder. Change `<title>` (`<Course> · Технічні рекомендації ментора`) and replace the `RECS` object with the new course data (format below). Change nothing else in the file.
3. Content rules:
   - If the user gives finished text (notes, an old page), keep it word for word. Change only the structure.
   - If the user asks you to write the recommendations, write them from the course program the user gives. Ask about anything you do not know (module list, tools and versions, typical student mistakes). Do not invent course content, homework requirements or links.
   - Address the student as «ви». Write practical advice: what to do, why, and what goes wrong. Ukrainian text, code and identifiers as in the course.
   - Links: only `https://`, only official docs or sources the user gave. Check that each link opens.
4. Run `scripts/check.sh` and fix every error.
5. Open the page for the user to review: `/usr/bin/open site/<folder>/index.html`. Publish only after the user says it is OK.
6. Commit (`feat(recs): add <course-slug>`) and push to `main`.
   If `git push` fails on credentials, push once with: `git -c credential.helper= -c credential.helper='!gh auth git-credential' push`. Do not change the global git config.
7. Give the user the URL: `https://goitacademy.github.io/tech-recs-hub/<folder>/`. It works 1–2 minutes after the push.

## Change a page

1. Find the folder: `ls site | grep <course-slug>`. If there is more than one, ask the user which one.
2. Change only the `RECS` object (and `<title>` if the course name changes). Never rename the folder: the URL changes and old links stop working.
3. Run `scripts/check.sh`, open the page for review, then commit (`fix(recs): <what changed> in <course-slug>`) and push to `main`.

## Remove a page

Ask the user to confirm, then delete the folder, commit (`chore(recs): remove <course-slug>`) and push.
The URL then returns 404. The old version stays in the public git history.

## Data format

```js
const RECS = {
  course: 'Python Core',               // required; page heading and top bar
  subtitle: 'Практичні поради…',       // optional; text under the heading
  intro: [ /* content */ ],            // optional; content under the subtitle
  // exactly one of:
  modules: [ /* module */ ],           // course without blocks: one long page
  blocks: [                            // course with blocks: one tab per block (#b1, #b2, …)
    {
      title: 'Prompt Engineering & AI Agents',  // required
      summary: '…',                    // optional; text on the block card at the top
      intro: '…',                      // optional; text under the block heading
      outro: '…',                      // optional; dashed box at the end of the block
      modules: [ /* module */ ]        // required
    }
  ],
  outro: '…'                           // optional; dashed box at the end of the page
};

// module
{
  title: 'Контроль потоку та функції', // required
  label: 'Модуль 5',                   // optional; default "Модуль <n>" (n = position in its list); the badge shows the number from the label
  icon: 'loop',                        // optional; one of ICONS in recs.js (default bulb)
  intro: '…',                          // optional; text under the module title
  note: '…',                           // optional; dark mentor note above the tips
  tips: [                              // required; numbered cards
    { title: 'enumerate() замість ручного лічильника', body: /* content */ }
  ],
  mistake: { title: '…', body: /* content */ },  // optional; "Типова помилка" box; title optional
  checklist: [ { q: 'Питання?', a: 'Відповідь' } ], // optional; self-check, answer hidden under «Відповідь»; a optional
  outro: /* content */,                // optional; after the checklist
  links: [ { text: 'Документація pathlib', url: 'https://docs.python.org/3/library/pathlib.html' } ]  // optional
}

// content: one paragraph of text, or a list of items:
'Абзац тексту'                         // paragraph
{ heading: 'Підзаголовок' }
{ list: ['пункт', 'пункт'] }           // bullet list
{ steps: ['крок', 'крок'] }            // numbered list
{ code: 'def f():\n    pass' }         // dark code block with «Копіювати»
{ template: 'Шаблон відповіді…' }      // light block for text templates (prompts, checklists) with «Копіювати»
{ callout: 'why', title: '…', body: /* content without callouts */ }  // title optional
```

Callout kinds: `why` (Чому так — the reason), `how` (Як правильно — concrete steps), `ex` (Приклад), `tip` (Лайфхак — a trick that saves time; also «Порада ментора»), `warn` (Увага — critical point), `error` (Типова помилка inside a tip), `note` (Примітка). The template shows a legend of the kinds used on the page.

Text may contain only `<b> <strong> <i> <em> <u> <code> <br>` and `<a href="https://…">`. Escape `<`, `>`, `&` in text as `&lt;`, `&gt;`, `&amp;`. In `code` and `template`, use real line breaks (`\n` or a template string) and only `<span class="kw|st|nm|cm">` for highlighting (keyword, string, number, comment). Unknown fields, tags and icons are errors.

Use `blocks` only if the course program has blocks. Colors come from the template (blue, pink, green, yellow, violet in turn), never from the data.

## Change the template

`site/_shared/` changes every page at once. After a change, run `scripts/check.sh`, open several pages (one with `blocks`, one with `modules`) and check them, then commit (`feat(template): ...` or `fix(template): ...`).
If the data format changes, update `validate()` in `recs.js`, the format above, and every page in the same commit.

## Rules

- One change touches one page folder, or only the template.
- Never put CSS or JS into a page. Design and behavior belong in `site/_shared/`.
- Never link one page to another.
- Never add files to the root of `site/` or extra files to a page folder.
- Never put personal data (names, emails, phone numbers of real people) or internal information in a page: the repository is public.
- The repository name is part of every URL. Renaming it breaks all links: GitHub does not redirect project site URLs after a rename.
