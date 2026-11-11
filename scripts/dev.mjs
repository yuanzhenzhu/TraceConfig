// `npm run dev`: convierte datos/datos.xlsx, arranca `next dev` y vuelve a convertir cada vez
// que se guarda el Excel (Next recarga la página al cambiar datos/datos.json).

import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { convertir, EXCEL_PATH } from './datos.mjs';

await convertir();

const require = createRequire(import.meta.url);
const next = spawn(process.execPath, [require.resolve('next/dist/bin/next'), 'dev', ...process.argv.slice(2)], {
  stdio: 'inherit',
});
next.on('exit', (code) => process.exit(code ?? 0));
['SIGINT', 'SIGTERM'].forEach((sig) => process.on(sig, () => next.kill(sig)));

// Se vigila la carpeta y no el archivo: Excel guarda escribiendo un temporal y renombrándolo,
// lo que haría perder la vigilancia de un archivo concreto.
const excel = path.basename(EXCEL_PATH);
let timer = null;
fs.watch(path.dirname(EXCEL_PATH), (_evento, archivo) => {
  if (archivo !== excel) return;
  clearTimeout(timer);
  // Excel escribe en varios pasos; esperamos a que termine antes de leer.
  timer = setTimeout(async () => {
    // Si no se puede leer, puede que Excel siguiera escribiendo: un reintento antes de avisar.
    if ((await convertir({ avisarLectura: false })) === null) setTimeout(convertir, 1500);
  }, 500);
});
console.log(`  Vigilando ${path.relative(process.cwd(), EXCEL_PATH)}: al guardarlo, la app se actualiza sola.\n`);
