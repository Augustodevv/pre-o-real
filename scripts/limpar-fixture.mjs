// Reduz uma página salva para virar fixture de teste: remove scripts (exceto JSON-LD),
// estilos, SVGs e comentários, mantendo a marcação que os adaptadores leem.
// Uso: node scripts/limpar-fixture.mjs pagina-salva.html tests/fixtures/<loja>/<nome>.html
import { readFileSync, writeFileSync } from 'node:fs';

const [input, output] = process.argv.slice(2);
if (!input || !output) {
  console.error('Uso: node scripts/limpar-fixture.mjs <entrada.html> <saida.html>');
  process.exit(1);
}
const html = readFileSync(input, 'utf8')
  .replace(/<script(?![^>]*application\/ld\+json)[^>]*>[\s\S]*?<\/script>/gi, '')
  .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
  .replace(/<svg[^>]*>[\s\S]*?<\/svg>/gi, '<svg></svg>')
  .replace(/<!--[\s\S]*?-->/g, '')
  // Estilos em linha e atributos enormes (imagens dinâmicas, rastreamento). O atributo
  // "data" fica, porque guarda o preço do <number-flow-react> da KaBuM.
  .replace(/\sstyle="[^"]*"/gi, '')
  .replace(/\s(?!data=)[\w:-]+="[^"]{400,}"/g, '')
  .replace(/<link[^>]*rel="(?:preload|prefetch|stylesheet|preconnect|dns-prefetch)"[^>]*>/gi, '')
  .replace(/\n\s*\n+/g, '\n');
writeFileSync(output, html);
console.log(`${input}: ${(readFileSync(input).length / 1024).toFixed(0)} KB → ${output}: ${(html.length / 1024).toFixed(0)} KB`);
