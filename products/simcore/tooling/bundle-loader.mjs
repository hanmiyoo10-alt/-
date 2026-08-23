import vm from 'node:vm';

export class HarnessError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'HarnessError';
    this.code = code;
  }
}

function moduleMarkers(source) {
  const re = /SimCore\.define\("([^"]+)"\s*,\s*function\s*\(require,\s*module,\s*exports\)\s*\{/g;
  const out = [];
  let match;
  while ((match = re.exec(source))) out.push({ name: match[1], index: match.index });
  return out;
}

export function extractModuleSource(source, name) {
  const markers = moduleMarkers(source).filter((row) => row.name === name);
  if (markers.length === 0) throw new HarnessError('MODULE_EXTRACTION_FAILED', `module missing: ${name}`);
  if (markers.length !== 1) throw new HarnessError('MODULE_EXTRACTION_AMBIGUOUS', `module duplicate: ${name}`);
  const all = moduleMarkers(source);
  const start = markers[0].index;
  const next = all.find((row) => row.index > start);
  if (!next) throw new HarnessError('MODULE_EXTRACTION_FAILED', `module end missing: ${name}`);
  return source.slice(start, next.index);
}

function matchingBrace(source, openIndex) {
  let depth = 0;
  let state = 'code';
  for (let i = openIndex; i < source.length; i += 1) {
    const c = source[i];
    const n = source[i + 1];
    if (state === 'line') { if (c === '\n') state = 'code'; continue; }
    if (state === 'block') { if (c === '*' && n === '/') { state = 'code'; i += 1; } continue; }
    if (state === 'single') { if (c === '\\') { i += 1; continue; } if (c === "'") state = 'code'; continue; }
    if (state === 'double') { if (c === '\\') { i += 1; continue; } if (c === '"') state = 'code'; continue; }
    if (state === 'template') { if (c === '\\') { i += 1; continue; } if (c === '`') state = 'code'; continue; }
    if (c === '/' && n === '/') { state = 'line'; i += 1; continue; }
    if (c === '/' && n === '*') { state = 'block'; i += 1; continue; }
    if (c === "'") { state = 'single'; continue; }
    if (c === '"') { state = 'double'; continue; }
    if (c === '`') { state = 'template'; continue; }
    if (c === '{') depth += 1;
    if (c === '}') {
      depth -= 1;
      if (depth === 0) return i;
    }
  }
  throw new HarnessError('FUNCTION_EXTRACTION_FAILED', 'function closing brace missing');
}

export function extractFunctionSource(source, name) {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(`(?:async\\s+)?function\\s+${escaped}\\s*\\(`, 'g');
  const matches = [...source.matchAll(re)];
  if (matches.length === 0) throw new HarnessError('FUNCTION_EXTRACTION_FAILED', `function missing: ${name}`);
  if (matches.length !== 1) throw new HarnessError('FUNCTION_EXTRACTION_AMBIGUOUS', `function duplicate: ${name}`);
  const start = matches[0].index;
  const paren = source.indexOf('(', start);
  let depth = 0;
  let closeParen = -1;
  let state = 'code';
  for (let i = paren; i < source.length; i += 1) {
    const c = source[i];
    const n = source[i + 1];
    if (state === 'line') { if (c === '\n') state = 'code'; continue; }
    if (state === 'block') { if (c === '*' && n === '/') { state = 'code'; i += 1; } continue; }
    if (state === 'single') { if (c === '\\') { i += 1; continue; } if (c === "'") state = 'code'; continue; }
    if (state === 'double') { if (c === '\\') { i += 1; continue; } if (c === '"') state = 'code'; continue; }
    if (state === 'template') { if (c === '\\') { i += 1; continue; } if (c === '`') state = 'code'; continue; }
    if (c === '/' && n === '/') { state = 'line'; i += 1; continue; }
    if (c === '/' && n === '*') { state = 'block'; i += 1; continue; }
    if (c === "'") { state = 'single'; continue; }
    if (c === '"') { state = 'double'; continue; }
    if (c === '`') { state = 'template'; continue; }
    if (c === '(') depth += 1;
    if (c === ')') {
      depth -= 1;
      if (depth === 0) { closeParen = i; break; }
    }
  }
  if (closeParen < 0) throw new HarnessError('FUNCTION_EXTRACTION_FAILED', `function parameters incomplete: ${name}`);
  const open = source.indexOf('{', closeParen + 1);
  if (open < 0) throw new HarnessError('FUNCTION_EXTRACTION_FAILED', `function body missing: ${name}`);
  const end = matchingBrace(source, open);
  return source.slice(start, end + 1);
}

export function loadFunctions(source, names, globals = {}) {
  const chunks = names.map((name) => extractFunctionSource(source, name));
  const sandbox = vm.createContext({ ...globals });
  try {
    const script = new vm.Script(`${chunks.join('\n')}\n({ ${names.join(', ')} })`);
    return script.runInContext(sandbox, { timeout: 1000 });
  } catch (error) {
    if (error instanceof HarnessError) throw error;
    throw new HarnessError('FUNCTION_DEPENDENCY_UNRESOLVED', String(error?.message || error));
  }
}

export class BundleLoader {
  constructor(source, { stubs = {} } = {}) {
    this.source = String(source);
    this.stubs = stubs;
    this.cache = new Map();
  }

  load(name) {
    if (this.cache.has(name)) return this.cache.get(name);
    const slice = extractModuleSource(this.source, name);
    let loaded = null;
    const SimCore = {
      define: (declared, factory) => {
        if (declared !== name) return;
        const module = { exports: {} };
        const require = (id) => {
          if (Object.prototype.hasOwnProperty.call(this.stubs, id)) return this.stubs[id];
          if (id.startsWith('./')) return this.load(id.slice(2));
          throw new HarnessError('MODULE_DEPENDENCY_UNRESOLVED', `module ${name} requested ${id}`);
        };
        factory(require, module, module.exports);
        loaded = module.exports;
      },
    };
    try {
      const context = vm.createContext({ SimCore, console: Object.freeze({ log() {}, warn() {}, error() {} }) });
      new vm.Script(slice).runInContext(context, { timeout: 1000 });
    } catch (error) {
      if (error instanceof HarnessError) throw error;
      throw new HarnessError('MODULE_EXECUTION_FAILED', `${name}: ${error?.message || error}`);
    }
    if (!loaded) throw new HarnessError('MODULE_EXTRACTION_FAILED', `module did not register: ${name}`);
    this.cache.set(name, loaded);
    return loaded;
  }
}

export function invokeExtracted(fn, ...args) {
  try {
    return fn(...args);
  } catch (error) {
    if (error?.name === 'ReferenceError') {
      throw new HarnessError('FUNCTION_DEPENDENCY_UNRESOLVED', String(error?.message || error));
    }
    throw error;
  }
}
