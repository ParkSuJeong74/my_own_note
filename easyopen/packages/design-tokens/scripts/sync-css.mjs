import {readFileSync, writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {easyOpenTheme} from '../index.js';

const kebab = value => value.replace(/[A-Z]/g, letter => '-' + letter.toLowerCase());
export function renderThemeCss() {
  const declarations = [];
  for (const [group, values] of Object.entries(easyOpenTheme)) {
    for (const [name, value] of Object.entries(values)) {
      const prefix = group === 'color' ? '' : kebab(group) + '-';
      const formatted = typeof value === 'number' ? value + 'px' : value;
      declarations.push('  --eo-' + prefix + kebab(name) + ': ' + formatted + ';');
    }
  }
  return '/* Generated from packages/design-tokens/index.js. Run npm run sync:css in that package. */\n:root {\n' + declarations.join('\n') + '\n}\n';
}
const files = [
  new URL('../theme.css', import.meta.url),
  new URL('../../../apps/api/src/app/workspace/tokens.css', import.meta.url),
];
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const css = renderThemeCss();
  for (const file of files) {
    if (process.argv.includes('--check')) {
      if (readFileSync(file, 'utf8') !== css) throw new Error('Design tokens are out of sync: ' + file.pathname);
    } else {
      writeFileSync(file, css);
    }
  }
}
