const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

module.exports = function loadTypescript(file, mocks = {}, globals = {}) {
  const filename = path.resolve(__dirname, '../..', file);
  const source = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const exports = {};
  vm.runInNewContext(source, {
    exports,
    require: name => Object.hasOwn(mocks, name) ? mocks[name] : require(name),
    AbortController, setTimeout, clearTimeout, ...globals,
  }, { filename });
  return exports;
};
