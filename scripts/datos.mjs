// Convierte datos/datos.xlsx -> datos/datos.json (lo que lee lib/datos.ts).
//
//   node scripts/datos.mjs          convierte una vez
//
// `npm run dev` lo ejecuta al arrancar y vuelve a ejecutarlo cada vez que se guarda el Excel
// (ver scripts/dev.mjs). Si el Excel tiene errores, se muestran con hoja y fila, y se conserva el JSON anterior.
// Las hojas y columnas se explican en la hoja "Instrucciones" del propio Excel.

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import ExcelJS from 'exceljs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const EXCEL_PATH = path.join(ROOT, 'datos', 'datos.xlsx');
export const JSON_PATH = path.join(ROOT, 'datos', 'datos.json');

const SEP = ' › ';
const TIPOS_PROPIEDAD = ['Texto', 'Número', 'Fecha', 'Lista'];
const ESTADOS_CONFIG = ['Activa', 'En configuración'];
const USOS = ['Almacén', 'Mantenimiento'];
// Términos que no deben aparecer (nomenclatura acordada en producto.md)
const PROHIBIDOS = [/\btaller(es)?\b/i, /\btipos? de componente\b/i];

// ---------- lectura genérica ----------

const norm = (s) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');
const p2 = (v) => String(v).padStart(2, '0');

function texto(v) {
  if (v === null || v === undefined) return '';
  if (v instanceof Date) {
    // Excel convierte "20-08-2026 08:00" en fecha; la devolvemos como texto dd-mm-aaaa [hh:mm].
    const f = `${p2(v.getUTCDate())}-${p2(v.getUTCMonth() + 1)}-${v.getUTCFullYear()}`;
    return v.getUTCHours() || v.getUTCMinutes() ? `${f} ${p2(v.getUTCHours())}:${p2(v.getUTCMinutes())}` : f;
  }
  if (typeof v === 'object') {
    if (Array.isArray(v.richText)) return v.richText.map((r) => r.text).join('').trim();
    if ('result' in v) return texto(v.result);
    if ('text' in v) return texto(v.text);
    if ('error' in v) return '';
  }
  return String(v).trim();
}

/** Filas no vacías de una hoja como objetos { _fila, <clave>: texto }. */
function leerHoja(wb, nombre, columnas, errores) {
  const ws = wb.worksheets.find((w) => norm(w.name) === norm(nombre));
  if (!ws) { errores.push(`Falta la hoja "${nombre}".`); return []; }
  const cab = {};
  ws.getRow(1).eachCell((cell, col) => { cab[norm(texto(cell.value))] = col; });
  const colDe = {};
  for (const [clave, titulo] of Object.entries(columnas)) {
    colDe[clave] = cab[norm(titulo)];
    if (!colDe[clave]) errores.push(`Hoja "${ws.name}": falta la columna "${titulo}".`);
  }
  const filas = [];
  for (let r = 2; r <= ws.rowCount; r++) {
    const row = ws.getRow(r);
    const f = { _fila: r, _hoja: ws.name };
    let vacia = true;
    for (const [clave, col] of Object.entries(colDe)) {
      f[clave] = col ? texto(row.getCell(col).value) : '';
      if (f[clave]) vacia = false;
    }
    if (!vacia) filas.push(f);
  }
  return filas;
}

const lista = (s) => s.split(/[,;]/).map((x) => x.trim()).filter(Boolean);
const ruta = (s) => s.split(/\s*[›>]\s*/).map((x) => x.trim()).filter(Boolean).join(SEP);
const numero = (s) => (s === '' ? null : Number(String(s).replace(/\./g, '').replace(',', '.')));
const donde = (f) => `Hoja "${f._hoja}", fila ${f._fila}`;

// ---------- conversión ----------

async function leerExcel() {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(EXCEL_PATH);
  const E = []; // errores
  const err = (f, msg) => E.push(`${donde(f)}: ${msg}`);
  const obligatorio = (f, campos) => campos.every(([k, t]) => (f[k] ? true : (err(f, `falta ${t}`), false)));
  const unicos = (filas, clave, que) => {
    const vistos = new Map();
    filas.forEach((f) => {
      const k = norm(f[clave]);
      if (!k) return;
      if (vistos.has(k)) err(f, `${que} "${f[clave]}" repetido (ya está en la fila ${vistos.get(k)})`);
      else vistos.set(k, f._fila);
    });
  };

  const H = {
    flotas: leerHoja(wb, 'Flotas', { nombre: 'Flota', descripcion: 'Descripción' }, E),
    lineas: leerHoja(wb, 'Líneas', { nombre: 'Línea' }, E),
    estructuras: leerHoja(wb, 'Estructuras', { nombre: 'Estructura', descripcion: 'Descripción' }, E),
    huecos: leerHoja(wb, 'Huecos', { estructura: 'Estructura', hueco: 'Hueco', categoria: 'Categoría' }, E),
    categorias: leerHoja(wb, 'Categorías', { nombre: 'Categoría' }, E),
    propsCategoria: leerHoja(wb, 'Propiedades de categoría', { nombre: 'Propiedad', tipo: 'Tipo' }, E),
    propsPorCategoria: leerHoja(wb, 'Propiedades por categoría', { categoria: 'Categoría', propiedad: 'Propiedad', historico: 'Histórico' }, E),
    propsHueco: leerHoja(wb, 'Propiedades de hueco', { nombre: 'Propiedad', tipo: 'Tipo', ejemplo: 'Ejemplo' }, E),
    propsPorHueco: leerHoja(wb, 'Propiedades por hueco', { estructura: 'Estructura', hueco: 'Hueco', propiedad: 'Propiedad' }, E),
    configuraciones: leerHoja(wb, 'Configuraciones', { flota: 'Flota', nombre: 'Configuración', descripcion: 'Descripción', estructura: 'Estructura', unidades: 'Nº de unidades', estado: 'Estado' }, E),
    almacenes: leerHoja(wb, 'Almacenes', { nombre: 'Almacén', ubicacion: 'Ubicación', contacto: 'Contacto', telefono: 'Teléfono', usos: 'Usos' }, E),
    unidades: leerHoja(wb, 'Unidades', { serie: 'Nº de serie', flota: 'Flota', configuracion: 'Configuración', km: 'Km', fechaAlta: 'Fecha de alta' }, E),
    activos: leerHoja(wb, 'Activos', { serie: 'Nº de serie', categoria: 'Categoría', unidad: 'Unidad', hueco: 'Hueco', almacen: 'Almacén', montadoEn: 'Montado en', km: 'Km', ciclos: 'Ciclos', horas: 'Horas', gmao: 'GMAO', tag: 'TAG' }, E),
    valores: leerHoja(wb, 'Valores de propiedades', { serie: 'Nº de serie', propiedad: 'Propiedad', valor: 'Valor', fecha: 'Fecha' }, E),
    movimientos: leerHoja(wb, 'Movimientos', { numero: 'Nº de movimiento', fecha: 'Fecha', tipo: 'Tipo de movimiento', serie: 'Nº de serie del activo', categoria: 'Categoría', origen: 'Origen', huecoOrigen: 'Hueco de origen', destino: 'Destino', huecoDestino: 'Hueco de destino' }, E),
    tiposMovimiento: leerHoja(wb, 'Tipos de movimiento', { nombre: 'Tipo de movimiento', icono: 'Icono' }, E),
  };
  if (E.length) return { datos: null, errores: E }; // sin hojas o columnas no se puede seguir

  // Nomenclatura: ningún texto con términos anteriores
  for (const filas of Object.values(H)) for (const f of filas) {
    for (const [k, v] of Object.entries(f)) {
      if (k.startsWith('_') || !v) continue;
      const p = PROHIBIDOS.find((re) => re.test(v));
      if (p) err(f, `"${v}" usa un término no acordado (${p.source.replace(/\\b|\(es\)\?|s\?/g, '')}); usa almacén, categoría, activo o movimiento`);
    }
  }

  // Catálogos
  unicos(H.flotas, 'nombre', 'Flota'); unicos(H.lineas, 'nombre', 'Línea'); unicos(H.estructuras, 'nombre', 'Estructura');
  unicos(H.categorias, 'nombre', 'Categoría'); unicos(H.propsCategoria, 'nombre', 'Propiedad'); unicos(H.propsHueco, 'nombre', 'Propiedad');
  unicos(H.almacenes, 'nombre', 'Almacén'); unicos(H.tiposMovimiento, 'nombre', 'Tipo de movimiento');
  const hay = (filas, v) => filas.some((f) => norm(f.nombre) === norm(v));
  const nombreDe = (filas, v) => filas.find((f) => norm(f.nombre) === norm(v))?.nombre ?? v;
  H.flotas.forEach((f) => obligatorio(f, [['nombre', 'la flota']]));
  H.propsCategoria.forEach((f) => { if (!TIPOS_PROPIEDAD.includes(f.tipo)) err(f, `tipo "${f.tipo}" no válido (${TIPOS_PROPIEDAD.join(', ')})`); });
  H.propsHueco.forEach((f) => { if (!TIPOS_PROPIEDAD.includes(f.tipo)) err(f, `tipo "${f.tipo}" no válido (${TIPOS_PROPIEDAD.join(', ')})`); });
  const categoriaValida = (f, c) => (hay(H.categorias, c) ? true : (err(f, `la categoría "${c}" no está en la hoja Categorías`), false));
  if (!hay(H.categorias, 'Tren')) E.push('Hoja "Categorías": falta la categoría "Tren" (raíz de todas las estructuras).');

  // Estructuras y huecos (la raíz Tren la añade la app)
  const estructuras = H.estructuras.map((e) => ({ nombre: e.nombre, descripcion: e.descripcion, huecos: [] }));
  const huecosDe = new Map(estructuras.map((e) => [norm(e.nombre), new Map()]));
  for (const f of H.huecos) {
    if (!obligatorio(f, [['estructura', 'la estructura'], ['hueco', 'el hueco'], ['categoria', 'la categoría']])) continue;
    const m = huecosDe.get(norm(f.estructura));
    if (!m) { err(f, `la estructura "${f.estructura}" no está en la hoja Estructuras`); continue; }
    const r = ruta(f.hueco);
    if (norm(r.split(SEP)[0]) === 'tren') { err(f, 'la ruta del hueco se escribe sin "Tren" (Coche 1 › Bogie 1)'); continue; }
    if (m.has(r)) { err(f, `hueco "${r}" repetido en ${f.estructura}`); continue; }
    const padre = r.split(SEP).slice(0, -1).join(SEP);
    if (padre && !m.has(padre)) { err(f, `el hueco padre "${padre}" no está en una fila anterior de ${f.estructura}`); continue; }
    categoriaValida(f, f.categoria);
    m.set(r, f.categoria);
    estructuras.find((e) => norm(e.nombre) === norm(f.estructura)).huecos.push({ ruta: r, categoria: nombreDe(H.categorias, f.categoria) });
  }
  estructuras.forEach((e) => { if (!e.huecos.length) E.push(`Hoja "Huecos": la estructura "${e.nombre}" no tiene ningún hueco.`); });

  // Propiedades
  const propsPorCategoria = [];
  for (const f of H.propsPorCategoria) {
    if (!obligatorio(f, [['categoria', 'la categoría'], ['propiedad', 'la propiedad']])) continue;
    if (!categoriaValida(f, f.categoria)) continue;
    if (!hay(H.propsCategoria, f.propiedad)) { err(f, `la propiedad "${f.propiedad}" no está en la hoja Propiedades de categoría`); continue; }
    if (f.historico && !['si', 'no'].includes(norm(f.historico))) err(f, 'Histórico tiene que ser Sí o No');
    propsPorCategoria.push({ categoria: nombreDe(H.categorias, f.categoria), propiedad: nombreDe(H.propsCategoria, f.propiedad), historico: norm(f.historico) === 'si' });
  }
  const propsPorHueco = [];
  for (const f of H.propsPorHueco) {
    if (!obligatorio(f, [['estructura', 'la estructura'], ['hueco', 'el hueco'], ['propiedad', 'la propiedad']])) continue;
    const m = huecosDe.get(norm(f.estructura));
    if (!m) { err(f, `la estructura "${f.estructura}" no está en la hoja Estructuras`); continue; }
    const r = ruta(f.hueco);
    if (r !== 'Tren' && !m.has(r)) { err(f, `el hueco "${r}" no está en ${f.estructura}`); continue; }
    if (!hay(H.propsHueco, f.propiedad)) { err(f, `la propiedad "${f.propiedad}" no está en la hoja Propiedades de hueco`); continue; }
    propsPorHueco.push({ estructura: nombreDe(H.estructuras, f.estructura), hueco: r, propiedad: nombreDe(H.propsHueco, f.propiedad) });
  }

  // Configuraciones
  const configuraciones = [];
  const claveCfg = (flota, cfg) => `${norm(flota)}|${norm(cfg)}`;
  const cfgs = new Map();
  for (const f of H.configuraciones) {
    if (!obligatorio(f, [['flota', 'la flota'], ['estructura', 'la estructura'], ['unidades', 'el nº de unidades'], ['estado', 'el estado']])) continue;
    if (!hay(H.flotas, f.flota)) { err(f, `la flota "${f.flota}" no está en la hoja Flotas`); continue; }
    if (!hay(H.estructuras, f.estructura)) { err(f, `la estructura "${f.estructura}" no está en la hoja Estructuras`); continue; }
    const n = numero(f.unidades);
    if (!Number.isInteger(n) || n < 1) { err(f, 'el nº de unidades tiene que ser un número entero mayor que 0'); continue; }
    if (!ESTADOS_CONFIG.includes(f.estado)) { err(f, `estado "${f.estado}" no válido (${ESTADOS_CONFIG.join(' o ')})`); continue; }
    const k = claveCfg(f.flota, f.nombre);
    if (cfgs.has(k)) { err(f, `configuración repetida en ${f.flota}`); continue; }
    const c = { flota: nombreDe(H.flotas, f.flota), nombre: f.nombre, descripcion: f.descripcion, estructura: nombreDe(H.estructuras, f.estructura), unidades: n, estado: f.estado, _f: f };
    cfgs.set(k, c); configuraciones.push(c);
  }
  // Una flota con varias configuraciones: todas con nombre. Con una sola: sin nombre.
  for (const fl of H.flotas) {
    const suyas = configuraciones.filter((c) => norm(c.flota) === norm(fl.nombre));
    if (suyas.length > 1) suyas.filter((c) => !c.nombre).forEach((c) => err(c._f, `${fl.nombre} tiene varias configuraciones: indica el nombre de esta`));
  }

  // Almacenes
  const almacenes = [];
  for (const f of H.almacenes) {
    if (!obligatorio(f, [['nombre', 'el almacén'], ['usos', 'los usos']])) continue;
    const usos = lista(f.usos);
    const malos = usos.filter((u) => !USOS.includes(u));
    if (malos.length) err(f, `uso "${malos.join(', ')}" no válido (${USOS.join(', ')})`);
    almacenes.push({ nombre: f.nombre, ubicacion: f.ubicacion, contacto: f.contacto, telefono: f.telefono, usos: usos.filter((u) => USOS.includes(u)) });
  }

  // Unidades
  const unidades = [];
  const unidadPorSerie = new Map();
  unicos(H.unidades, 'serie', 'Nº de serie de unidad');
  for (const f of H.unidades) {
    if (!obligatorio(f, [['serie', 'el nº de serie'], ['flota', 'la flota']])) continue;
    if (!/^\d{4}$/.test(f.serie)) { err(f, `el nº de serie de la unidad "${f.serie}" tiene que tener 4 dígitos (1001)`); continue; }
    const c = cfgs.get(claveCfg(f.flota, f.configuracion));
    if (!c) { err(f, `no hay configuración "${f.configuracion || '(única)'}" en la flota "${f.flota}"`); continue; }
    const u = { serie: f.serie, flota: c.flota, configuracion: c.nombre, km: numero(f.km), fechaAlta: f.fechaAlta };
    unidades.push(u); unidadPorSerie.set(f.serie, { u, c });
  }
  configuraciones.forEach((c) => {
    const n = unidades.filter((u) => u.flota === c.flota && u.configuracion === c.nombre).length;
    if (n > c.unidades) err(c._f, `tiene ${c.unidades} unidades pero en la hoja Unidades hay ${n}`);
  });

  // Activos
  const activos = [];
  const porSerie = new Map();
  const ocupados = new Map();
  unicos(H.activos, 'serie', 'Nº de serie de activo');
  for (const f of H.activos) {
    if (!obligatorio(f, [['serie', 'el nº de serie'], ['categoria', 'la categoría']])) continue;
    if (unidadPorSerie.has(f.serie)) err(f, `el nº de serie "${f.serie}" es el de una unidad`);
    if (!categoriaValida(f, f.categoria)) continue;
    const enUnidad = !!(f.unidad || f.hueco), enAlmacen = !!f.almacen;
    if (enUnidad && enAlmacen) { err(f, 'un activo está en una unidad (Unidad y Hueco) o en un almacén, no en los dos'); continue; }
    if (!enUnidad && !enAlmacen) { err(f, 'indica dónde está: Unidad y Hueco, o Almacén'); continue; }
    const a = { serie: f.serie, categoria: nombreDe(H.categorias, f.categoria), unidad: '', hueco: '', almacen: '', montadoEn: f.montadoEn,
      km: numero(f.km), ciclos: numero(f.ciclos), horas: numero(f.horas), gmao: f.gmao, tag: f.tag };
    if (enUnidad) {
      if (!f.unidad || !f.hueco) { err(f, 'en una unidad hay que indicar la Unidad y el Hueco'); continue; }
      const u = unidadPorSerie.get(f.unidad);
      if (!u) { err(f, `la unidad "${f.unidad}" no está en la hoja Unidades`); continue; }
      const r = ruta(f.hueco);
      const cat = huecosDe.get(norm(u.c.estructura))?.get(r);
      if (!cat) { err(f, `el hueco "${r}" no está en ${u.c.estructura} (la estructura de la unidad ${f.unidad})`); continue; }
      if (norm(cat) !== norm(f.categoria)) { err(f, `el hueco "${r}" es de la categoría ${cat}, no ${f.categoria}`); continue; }
      const k = `${f.unidad}|${r}`;
      if (ocupados.has(k)) { err(f, `el hueco "${r}" de la unidad ${f.unidad} ya tiene el activo ${ocupados.get(k)}`); continue; }
      ocupados.set(k, f.serie);
      if (f.montadoEn) err(f, '"Montado en" solo se usa para activos de un almacén');
      Object.assign(a, { unidad: f.unidad, hueco: r, montadoEn: '' });
    } else {
      if (!hay(H.almacenes, f.almacen)) { err(f, `el almacén "${f.almacen}" no está en la hoja Almacenes`); continue; }
      a.almacen = nombreDe(H.almacenes, f.almacen);
    }
    activos.push(a); porSerie.set(a.serie, { a, f });
  }
  for (const { a, f } of porSerie.values()) {
    if (!a.montadoEn) continue;
    const p = porSerie.get(a.montadoEn)?.a;
    if (!p) err(f, `"Montado en": el activo "${a.montadoEn}" no está en la hoja Activos`);
    else if (p.almacen !== a.almacen) err(f, `"Montado en": el activo "${a.montadoEn}" no está en el mismo almacén`);
  }

  // Valores de propiedades
  const valores = [];
  for (const f of H.valores) {
    if (!obligatorio(f, [['serie', 'el nº de serie'], ['propiedad', 'la propiedad'], ['valor', 'el valor']])) continue;
    if (!porSerie.has(f.serie)) { err(f, `el activo "${f.serie}" no está en la hoja Activos`); continue; }
    if (!hay(H.propsCategoria, f.propiedad)) { err(f, `la propiedad "${f.propiedad}" no está en la hoja Propiedades de categoría`); continue; }
    if (f.fecha && !/^\d{2}-\d{2}-\d{4}$/.test(f.fecha)) err(f, `fecha "${f.fecha}" no válida (dd-mm-aaaa)`);
    valores.push({ serie: f.serie, propiedad: nombreDe(H.propsCategoria, f.propiedad), valor: f.valor, fecha: f.fecha });
  }

  // Movimientos
  const tiposMovimiento = H.tiposMovimiento.filter((f) => obligatorio(f, [['nombre', 'el tipo'], ['icono', 'el icono']])).map((f) => ({ nombre: f.nombre, icono: f.icono }));
  const lugar = (f, l, h, que) => {
    if (!l) { err(f, `falta el ${que}`); return false; }
    if (unidadPorSerie.has(l)) {
      if (!h) { err(f, `el ${que} es la unidad ${l}: indica también el hueco`); return false; }
      const { c } = unidadPorSerie.get(l);
      if (!huecosDe.get(norm(c.estructura))?.has(ruta(h))) { err(f, `el hueco "${ruta(h)}" no está en ${c.estructura} (unidad ${l})`); return false; }
      return true;
    }
    if (hay(H.almacenes, l)) { if (h) err(f, `el ${que} es un almacén: el hueco va vacío`); return true; }
    err(f, `el ${que} "${l}" no es ninguna unidad de la hoja Unidades ni ningún almacén`);
    return false;
  };
  const movimientos = [];
  for (const f of H.movimientos) {
    if (!obligatorio(f, [['numero', 'el nº de movimiento'], ['fecha', 'la fecha'], ['tipo', 'el tipo de movimiento'], ['serie', 'el nº de serie del activo'], ['categoria', 'la categoría']])) continue;
    if (!/^\d{2}-\d{2}-\d{4} \d{2}:\d{2}$/.test(f.fecha)) err(f, `fecha "${f.fecha}" no válida (dd-mm-aaaa hh:mm)`);
    if (!hay(H.tiposMovimiento, f.tipo)) err(f, `el tipo "${f.tipo}" no está en la hoja Tipos de movimiento`);
    categoriaValida(f, f.categoria);
    const ok = lugar(f, f.origen, f.huecoOrigen, 'origen') & lugar(f, f.destino, f.huecoDestino, 'destino');
    if (!ok) continue;
    movimientos.push({ numero: f.numero, fecha: f.fecha, tipo: nombreDe(H.tiposMovimiento, f.tipo), serie: f.serie, categoria: nombreDe(H.categorias, f.categoria),
      origen: f.origen, huecoOrigen: f.huecoOrigen ? ruta(f.huecoOrigen) : '', destino: f.destino, huecoDestino: f.huecoDestino ? ruta(f.huecoDestino) : '' });
  }
  const porNumero = new Map();
  movimientos.forEach((m) => porNumero.set(m.numero, [...(porNumero.get(m.numero) ?? []), m]));
  for (const [num, l] of porNumero) if (new Set(l.map((m) => `${m.fecha}|${m.tipo}`)).size > 1) E.push(`Hoja "Movimientos": las filas del movimiento ${num} tienen fecha o tipo distintos.`);

  configuraciones.forEach((c) => delete c._f);
  const datos = {
    flotas: H.flotas.map((f) => ({ nombre: f.nombre, descripcion: f.descripcion })),
    lineas: H.lineas.map((f) => f.nombre),
    estructuras,
    categorias: H.categorias.map((f) => f.nombre),
    propsCategoria: H.propsCategoria.map((f) => ({ nombre: f.nombre, tipo: f.tipo })),
    propsPorCategoria,
    propsHueco: H.propsHueco.map((f) => ({ nombre: f.nombre, tipo: f.tipo, ejemplo: f.ejemplo })),
    propsPorHueco,
    configuraciones,
    almacenes,
    unidades,
    activos,
    valores,
    movimientos,
    tiposMovimiento,
  };
  return { datos, errores: E };
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
  // La versión cambia con los datos: al cambiar el Excel, el prototipo vuelve a estos datos.
  const cuerpo = JSON.stringify(datos);
  const version = crypto.createHash('sha1').update(cuerpo).digest('hex').slice(0, 10);
  const json = JSON.stringify({ version, ...datos }, null, 1) + '\n';
  const anterior = fs.existsSync(JSON_PATH) ? fs.readFileSync(JSON_PATH, 'utf8') : '';
  if (json !== anterior) fs.writeFileSync(JSON_PATH, json);
  if (!silencioso) {
    console.log(`✓ Datos actualizados desde el Excel (${datos.flotas.length} flotas, ${datos.estructuras.length} estructuras, ` +
      `${datos.configuraciones.length} configuraciones, ${datos.unidades.length} unidades, ${datos.activos.length} activos, ` +
      `${datos.almacenes.length} almacenes, ${new Set(datos.movimientos.map((m) => m.numero)).size} movimientos)`);
  }
  return true;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  convertir().then((ok) => process.exit(ok ? 0 : 1));
}
