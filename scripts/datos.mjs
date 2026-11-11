// Convierte datos/datos.xlsx -> datos/datos.json (lo que importa lib/data.ts).
//
//   node scripts/datos.mjs          convierte una vez
//
// `npm run dev` lo ejecuta al arrancar y vuelve a ejecutarlo cada vez que se guarda el Excel
// (ver scripts/dev.mjs). Si el Excel tiene errores, se muestran y se conserva el JSON anterior.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ExcelJS from 'exceljs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const EXCEL_PATH = path.join(ROOT, 'datos', 'datos.xlsx');
export const JSON_PATH = path.join(ROOT, 'datos', 'datos.json');

const TIPOS_FLOTA = ['Unidad', 'Coche', 'Bogie', 'Eje', 'Rueda', 'Reductora'];
const TIPOS_ALMACEN = ['Bogie', 'Eje', 'Rueda', 'Reductora'];
// Tipo del padre que exige cada tipo (en la flota y en los almacenes).
const PADRE = { Coche: 'Unidad', Bogie: 'Coche', Eje: 'Bogie', Rueda: 'Eje', Reductora: 'Eje' };

// ---------- lectura genérica de hojas ----------

const norm = (s) =>
  String(s ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');

const p2 = (v) => String(v).padStart(2, '0');

function texto(v) {
  if (v === null || v === undefined) return '';
  if (v instanceof Date) {
    // Excel convierte "20-08-2026 08:00" en fecha; la devolvemos al formato de la app.
    return `${p2(v.getUTCDate())}-${p2(v.getUTCMonth() + 1)}-${v.getUTCFullYear()} ${p2(v.getUTCHours())}:${p2(v.getUTCMinutes())}`;
  }
  if (typeof v === 'object') {
    if (Array.isArray(v.richText)) return v.richText.map((r) => r.text).join('').trim();
    if ('result' in v) return texto(v.result);
    if ('text' in v) return texto(v.text);
    if ('error' in v) return '';
  }
  return String(v).trim();
}

// Devuelve las filas no vacías de una hoja como objetos { _fila, <clave>: texto }.
function leerHoja(wb, nombreHoja, columnas, errores) {
  const ws = wb.worksheets.find((w) => norm(w.name) === norm(nombreHoja));
  if (!ws) {
    errores.push(`Falta la hoja "${nombreHoja}".`);
    return [];
  }
  const cabecera = {};
  ws.getRow(1).eachCell((cell, col) => {
    cabecera[norm(texto(cell.value))] = col;
  });
  const colDe = {};
  for (const [clave, titulo] of Object.entries(columnas)) {
    const col = cabecera[norm(titulo)];
    if (!col) errores.push(`Hoja "${ws.name}": falta la columna "${titulo}".`);
    colDe[clave] = col;
  }
  const filas = [];
  for (let r = 2; r <= ws.rowCount; r++) {
    const row = ws.getRow(r);
    const fila = { _fila: r };
    let vacia = true;
    for (const [clave, col] of Object.entries(colDe)) {
      fila[clave] = col ? texto(row.getCell(col).value) : '';
      if (fila[clave]) vacia = false;
    }
    if (!vacia) filas.push(fila);
  }
  return filas;
}

const lista = (s) =>
  s
    .split(/[,;]/)
    .map((x) => x.trim())
    .filter(Boolean);

function kmTexto(v) {
  const n = parseInt(String(v).replace(/[^\d]/g, ''), 10) || 0;
  return n.toLocaleString('es-ES') + 'km';
}

// ---------- Flota ----------

const DEPTH = { Unidad: 0, Coche: 1, Bogie: 2, Eje: 3, Rueda: 4, Reductora: 4 };

function construirFlotas(filas, errores) {
  const flotas = {};
  // Clave "flota|código" -> nodo, para enlazar cada fila con su padre.
  const porCodigo = new Map();
  const donde = (f) => `Hoja "Flota", fila ${f._fila}`;

  for (const f of filas) {
    const tipo = TIPOS_FLOTA.find((t) => norm(t) === norm(f.tipo));
    if (!tipo) {
      errores.push(`${donde(f)}: tipo "${f.tipo}" no válido (usa ${TIPOS_FLOTA.join(', ')}).`);
      continue;
    }
    if (!f.flota) errores.push(`${donde(f)}: falta la flota.`);
    if (!f.codigo) {
      errores.push(`${donde(f)}: falta el código.`);
      continue;
    }
    const clave = f.flota + '|' + f.codigo;
    if (porCodigo.has(clave)) {
      errores.push(`${donde(f)}: el código "${f.codigo}" está repetido en la flota "${f.flota}".`);
      continue;
    }

    // Antepasados según el tipo: una Rueda necesita Unidad, Coche, Bogie y Eje rellenos, etc.
    const cadena = ['Unidad', 'Coche', 'Bogie', 'Eje'].slice(0, DEPTH[tipo]);
    const faltan = cadena.filter((t) => !f[t.toLowerCase()]);
    if (faltan.length) {
      errores.push(`${donde(f)}: un ${tipo} necesita rellenar ${faltan.join(', ')}.`);
      continue;
    }

    let padre = null;
    if (tipo !== 'Unidad') {
      const tipoPadre = PADRE[tipo];
      padre = porCodigo.get(f.flota + '|' + f[tipoPadre.toLowerCase()]);
      if (!padre || padre.tipo !== tipoPadre) {
        errores.push(`${donde(f)}: no hay ningún ${tipoPadre} "${f[tipoPadre.toLowerCase()]}" en la flota "${f.flota}" en filas anteriores.`);
        continue;
      }
    }

    // Los códigos de antepasados salen de la cadena real de padres; las columnas de la fila
    // solo tienen que coincidir con ella.
    const anc = { Unidad: f.codigo };
    for (let p = padre; p; p = p.padre) anc[p.tipo] = p.code;
    const distintos = cadena.filter((t) => anc[t] !== f[t.toLowerCase()]);
    if (distintos.length) {
      errores.push(
        `${donde(f)}: ${distintos.map((t) => `${t} "${f[t.toLowerCase()]}"`).join(', ')} no coincide con el ${PADRE[tipo]} "${padre.code}" ` +
          `(que está en ${distintos.map((t) => `${t} "${anc[t]}"`).join(', ')}).`
      );
      continue;
    }

    const hermanos = padre ? padre.children || (padre.children = []) : flotas[f.flota] || (flotas[f.flota] = []);
    const nodo = {
      id: idNodo(tipo, f.codigo, padre, hermanos),
      label: f.nombre || tipo,
      code: f.codigo,
      tipo,
      depth: DEPTH[tipo],
      km: kmTexto(f.km),
      unidadCode: anc.Unidad,
    };
    // Mismos campos que generaba la versión anterior de lib/data.ts para cada tipo.
    if (tipo !== 'Unidad') nodo.cocheCode = tipo === 'Coche' ? f.codigo : anc.Coche;
    if (DEPTH[tipo] >= 2) nodo.bogieCode = tipo === 'Bogie' ? f.codigo : anc.Bogie;
    if (DEPTH[tipo] === 4) nodo.ejeCode = anc.Eje;
    if (f.gmao) nodo.gmao = f.gmao;
    if (f.tag) nodo.tag = f.tag;

    hermanos.push(nodo);
    // Referencia al padre no enumerable: sirve para recorrer la cadena pero no va al JSON.
    Object.defineProperty(nodo, 'padre', { value: padre, enumerable: false });
    porCodigo.set(clave, nodo);
  }
  return flotas;
}

// Ids con el mismo formato que la versión anterior (u3220, c3221, c3221b1, c3221b1e2, c3221b1e2-r1).
function idNodo(tipo, code, padre, hermanos) {
  const n = hermanos.filter((h) => h.tipo === tipo).length + 1;
  switch (tipo) {
    case 'Unidad':
      return 'u' + code;
    case 'Coche':
      return 'c' + code;
    case 'Bogie':
      return padre.id + 'b' + n;
    case 'Eje':
      return padre.id + 'e' + n;
    case 'Rueda':
      return padre.id + '-r' + n;
    default:
      return padre.id + '-d' + n;
  }
}

// ---------- Almacenes ----------

function construirAlmacenes(filas, errores) {
  const almacenes = {};
  const donde = (f) => `Hoja "Almacenes", fila ${f._fila}`;
  const nombres = [];
  const porAlmacen = {};

  for (const f of filas) {
    const tipo = TIPOS_ALMACEN.find((t) => norm(t) === norm(f.tipo));
    if (!tipo) {
      errores.push(`${donde(f)}: tipo "${f.tipo}" no válido (usa ${TIPOS_ALMACEN.join(', ')}).`);
      continue;
    }
    if (!f.almacen) {
      errores.push(`${donde(f)}: falta el almacén.`);
      continue;
    }
    if (!f.codigo) {
      errores.push(`${donde(f)}: falta el código.`);
      continue;
    }
    if (!porAlmacen[f.almacen]) {
      nombres.push(f.almacen);
      porAlmacen[f.almacen] = { filas: [], porCodigo: new Map() };
    }
    const a = porAlmacen[f.almacen];
    if (a.porCodigo.has(f.codigo)) {
      errores.push(`${donde(f)}: el código "${f.codigo}" está repetido en el almacén "${f.almacen}".`);
      continue;
    }
    const item = {
      id: tipo + '-' + nombres.indexOf(f.almacen) + '-' + a.filas.filter((x) => x.item.tipo === tipo).length,
      label: f.nombre || tipo,
      code: f.codigo,
      km: kmTexto(f.km),
      tipo,
      gmao: f.gmao,
      tag: f.tag,
      conHijos: false,
      conPadre: false,
    };
    a.filas.push({ f, item });
    a.porCodigo.set(f.codigo, item);
  }

  for (const nombre of nombres) {
    const a = porAlmacen[nombre];
    // Enlaza cada pieza con la pieza del mismo almacén en la que está montada.
    for (const { f, item } of a.filas) {
      if (!f.padre) continue;
      const padre = a.porCodigo.get(f.padre);
      if (!padre || padre.tipo !== PADRE[item.tipo]) {
        errores.push(`${donde(f)}: "Montado en" debe ser el código de un ${PADRE[item.tipo]} del almacén "${nombre}" (no existe "${f.padre}").`);
        continue;
      }
      item.conPadre = true;
      item.groupLabel = padre.label;
      item.groupCode = padre.code;
      item.groupKm = padre.km;
      padre.conHijos = true;
      padre.children = (padre.children || []).concat(item);
    }
    const items = {};
    const counts = {};
    for (const t of TIPOS_ALMACEN) {
      items[t] = a.filas.filter((x) => x.item.tipo === t).map((x) => x.item);
      counts[t] = items[t].length;
    }
    almacenes[nombre] = { code: nombre, counts, items };
  }
  return almacenes;
}

// ---------- Movimientos, talleres y listas ----------

function construirMovimientos(filas, operaciones, errores) {
  const iconos = Object.fromEntries(operaciones.map((o) => [o.operacion, lista(o.iconos)]));
  return filas.map((f, i) => {
    if (!iconos[f.operacion]) {
      errores.push(`Hoja "Movimientos", fila ${f._fila}: la operación "${f.operacion}" no está en la hoja "Operaciones".`);
    }
    const pos = (lado) =>
      [1, 2]
        .map((n) => ({ title: f[lado + 'Lugar' + n], code: f[lado + 'Codigo' + n] }))
        .filter((p) => p.title || p.code);
    return {
      id: 'mov-' + i,
      fecha: f.fecha,
      operacion: f.operacion,
      operacionIcons: iconos[f.operacion] || [],
      componente: f.componente,
      antes: pos('antes'),
      despues: pos('despues'),
    };
  });
}

function construirTalleres(filas, almacenes) {
  return filas.map((f, i) => ({
    id: 'taller-' + (i + 1),
    nombre: f.nombre,
    ubicacion: f.ubicacion,
    contacto: f.contacto,
    telefono: f.telefono,
    uso: lista(f.uso),
    // Los talleres que tienen almacén en la hoja "Almacenes" no se pueden renombrar desde la app,
    // porque otras pantallas los buscan por ese nombre exacto.
    editableName: !almacenes[f.nombre],
  }));
}

// ---------- conversión completa ----------

export async function leerExcel(excelPath = EXCEL_PATH) {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(excelPath);
  const errores = [];

  const flota = leerHoja(wb, 'Flota', {
    flota: 'Flota',
    unidad: 'Unidad',
    coche: 'Coche',
    bogie: 'Bogie',
    eje: 'Eje',
    tipo: 'Tipo',
    nombre: 'Nombre',
    codigo: 'Código',
    km: 'Km',
    gmao: 'GMAO',
    tag: 'TAG',
  }, errores);
  const almacen = leerHoja(wb, 'Almacenes', {
    almacen: 'Almacén',
    tipo: 'Tipo',
    nombre: 'Nombre',
    codigo: 'Código',
    km: 'Km',
    gmao: 'GMAO',
    tag: 'TAG',
    padre: 'Montado en',
  }, errores);
  const movs = leerHoja(wb, 'Movimientos', {
    fecha: 'Fecha',
    operacion: 'Operación',
    componente: 'Componente',
    antesLugar1: 'Antes lugar 1',
    antesCodigo1: 'Antes código 1',
    antesLugar2: 'Antes lugar 2',
    antesCodigo2: 'Antes código 2',
    despuesLugar1: 'Después lugar 1',
    despuesCodigo1: 'Después código 1',
    despuesLugar2: 'Después lugar 2',
    despuesCodigo2: 'Después código 2',
  }, errores);
  const ops = leerHoja(wb, 'Operaciones', { operacion: 'Operación', iconos: 'Iconos' }, errores);
  const talleres = leerHoja(wb, 'Talleres', {
    nombre: 'Nombre',
    ubicacion: 'Ubicación',
    contacto: 'Contacto',
    telefono: 'Teléfono',
    uso: 'Uso',
  }, errores);
  const listas = leerHoja(wb, 'Listas', { tiposComponente: 'Tipos de componente', usosTaller: 'Usos de taller' }, errores);

  const flotas = construirFlotas(flota, errores);
  const almacenes = construirAlmacenes(almacen, errores);
  const datos = {
    flotas,
    almacenes,
    movimientos: construirMovimientos(movs, ops, errores),
    operaciones: ops.map((o) => o.operacion),
    talleres: construirTalleres(talleres, almacenes),
    tiposComponente: listas.map((l) => l.tiposComponente).filter(Boolean),
    usosTaller: listas.map((l) => l.usosTaller).filter(Boolean),
  };
  if (!Object.keys(flotas).length) errores.push('La hoja "Flota" no tiene ninguna unidad.');
  if (!Object.keys(almacenes).length) errores.push('La hoja "Almacenes" no tiene ninguna pieza.');
  return { datos, errores };
}

// Convierte y escribe el JSON. Devuelve true si todo fue bien, false si el Excel tiene errores
// y null si no se pudo leer el archivo.
export async function convertir({ silencioso = false, avisarLectura = true } = {}) {
  let resultado;
  try {
    resultado = await leerExcel();
  } catch (e) {
    if (avisarLectura) console.error(`\n✗ No se pudo leer ${path.relative(ROOT, EXCEL_PATH)}: ${e.message}\n`);
    return null;
  }
  const { datos, errores } = resultado;
  if (errores.length) {
    console.error(`\n✗ El Excel tiene ${errores.length} error(es); la app sigue usando los datos anteriores:`);
    errores.slice(0, 30).forEach((e) => console.error('   - ' + e));
    if (errores.length > 30) console.error(`   ... y ${errores.length - 30} más`);
    console.error('');
    return false;
  }
  const json = JSON.stringify(datos, null, 2) + '\n';
  const anterior = fs.existsSync(JSON_PATH) ? fs.readFileSync(JSON_PATH, 'utf8') : '';
  if (json !== anterior) fs.writeFileSync(JSON_PATH, json);
  if (!silencioso) {
    const piezas = Object.values(datos.flotas).flat().length;
    console.log(
      `✓ Datos actualizados desde el Excel (${Object.keys(datos.flotas).length} flotas, ${piezas} unidades, ` +
        `${Object.keys(datos.almacenes).length} almacenes, ${datos.movimientos.length} movimientos, ${datos.talleres.length} talleres)`
    );
  }
  return true;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  convertir().then((ok) => process.exit(ok ? 0 : 1));
}
