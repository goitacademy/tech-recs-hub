#!/usr/bin/env node
// Validate the `const RECS = {...}` data in each given index.html with validate() from site/_shared/recs.js.
// Usage: node scripts/validate-recs.js site/<folder>/index.html [...]
'use strict';

const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const { validate } = require(path.join(root, 'site', '_shared', 'recs.js'));

let failed = false;
for (const file of process.argv.slice(2)) {
  const html = fs.readFileSync(file, 'utf8');
  const match = html.match(/<script>\s*const RECS\s*=\s*([\s\S]*?);?\s*<\/script>/);
  let errors;
  if (!match) {
    errors = ['no inline <script> that starts with "const RECS = {"'];
  } else {
    try {
      // Parsed as one expression: any code after the data object is a syntax error.
      errors = validate(new Function(`return (${match[1]}\n);`)());
    } catch (e) {
      errors = [`RECS data does not run: ${e.message}`];
    }
  }
  for (const error of errors) console.error(`ERROR: ${path.relative(root, path.resolve(file))}: ${error}`);
  if (errors.length) failed = true;
}
process.exit(failed ? 1 : 0);
