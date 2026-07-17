'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const root = path.join(__dirname, '..');
const publicDirectory = path.join(root, 'public');

function walk(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      if (entry.name === 'node_modules') return [];
      return walk(fullPath);
    }

    return [fullPath];
  });
}

function fail(message) {
  console.error(`CHECK FAILED: ${message}`);
  process.exitCode = 1;
}

function checkJavaScriptSyntax(filePath) {
  const isBrowserModule = filePath.startsWith(`${publicDirectory}${path.sep}`);
  const source = fs.readFileSync(filePath, 'utf8');
  const args = isBrowserModule
    ? ['--input-type=module', '--check']
    : ['--check', filePath];
  const result = spawnSync(process.execPath, args, {
    encoding: 'utf8',
    input: isBrowserModule ? source : undefined,
  });

  if (result.status !== 0) {
    fail(`${path.relative(root, filePath)} has invalid JavaScript syntax.\n${result.stderr}`);
  }
}

function checkBrowserImports(filePath) {
  const source = fs.readFileSync(filePath, 'utf8');
  const importPattern = /(?:import\s+(?:[^'";]+?\s+from\s+)?|import\s*)['"](\.[^'"]+)['"]/g;
  let match;

  while ((match = importPattern.exec(source)) !== null) {
    const importPath = match[1];
    const resolved = path.resolve(path.dirname(filePath), importPath);
    const candidates = [resolved, `${resolved}.js`, path.join(resolved, 'index.js')];

    if (!candidates.some((candidate) => fs.existsSync(candidate))) {
      fail(`${path.relative(root, filePath)} imports missing module ${importPath}.`);
    }
  }
}

function checkHtmlIds(indexHtml) {
  const idPattern = /\sid=["']([^"']+)["']/g;
  const idCounts = new Map();
  let match;

  while ((match = idPattern.exec(indexHtml)) !== null) {
    idCounts.set(match[1], (idCounts.get(match[1]) || 0) + 1);
  }

  const duplicates = [...idCounts.entries()]
    .filter(([, count]) => count > 1)
    .map(([id]) => id);

  if (duplicates.length > 0) {
    fail(`public/index.html contains duplicate id(s): ${duplicates.join(', ')}.`);
  }

  const requiredCrudIds = [
    'detailEditButton',
    'detailDeleteButton',
    'deleteConfirmModal',
    'deleteConfirmButton',
  ];
  const missingCrudIds = requiredCrudIds.filter((id) => !idCounts.has(id));

  if (missingCrudIds.length > 0) {
    fail(`CRUD interface is missing required element id(s): ${missingCrudIds.join(', ')}.`);
  }
}

function checkLocalAssets(indexHtml) {
  const assetPattern = /(?:src|href)=["']([^"']+)["']/g;
  let match;

  while ((match = assetPattern.exec(indexHtml)) !== null) {
    const reference = match[1];

    if (
      reference.startsWith('http://')
      || reference.startsWith('https://')
      || reference.startsWith('//')
      || reference.startsWith('#')
      || reference.startsWith('data:')
    ) {
      continue;
    }

    const cleanReference = reference.split(/[?#]/, 1)[0];
    const resolved = path.resolve(publicDirectory, cleanReference);

    if (!fs.existsSync(resolved)) {
      fail(`public/index.html references missing local asset ${reference}.`);
    }
  }
}

const allFiles = walk(root);
const javaScriptFiles = allFiles.filter((filePath) => filePath.endsWith('.js'));

javaScriptFiles.forEach(checkJavaScriptSyntax);
javaScriptFiles
  .filter((filePath) => filePath.startsWith(`${publicDirectory}${path.sep}`))
  .forEach(checkBrowserImports);

const indexPath = path.join(publicDirectory, 'index.html');
const indexHtml = fs.readFileSync(indexPath, 'utf8');

if (!indexHtml.includes('href="style.css')) {
  fail('public/index.html does not load public/style.css.');
}

if (!indexHtml.includes('src="app.js')) {
  fail('public/index.html does not load public/app.js.');
}

checkHtmlIds(indexHtml);
checkLocalAssets(indexHtml);

const browserApiSource = fs.readFileSync(path.join(publicDirectory, 'js', 'api.js'), 'utf8');
const modalSource = fs.readFileSync(path.join(publicDirectory, 'js', 'modal.js'), 'utf8');
const detailSource = fs.readFileSync(path.join(publicDirectory, 'js', 'entryDetail.js'), 'utf8');

if (!/method:\s*['"]PATCH['"]/.test(browserApiSource) || !/patchRemoteEntry/.test(modalSource)) {
  fail('The browser update flow is not connected to PATCH /api/entries/:id.');
}

if (!/method:\s*['"]DELETE['"]/.test(browserApiSource) || !/deleteRemoteEntry/.test(detailSource)) {
  fail('The browser delete flow is not connected to DELETE /api/entries/:id.');
}

const routeFiles = [
  path.join(root, 'server.js'),
  ...walk(path.join(root, 'src')),
  ...walk(path.join(root, 'Firebase')).filter((filePath) => !/test-[^/\\]+\.js$/.test(filePath)),
].filter((filePath) => filePath.endsWith('.js'));

const routePattern = /app\.(get|post|put|patch|delete)\(\s*['"]([^'"]+)['"]/g;
const routes = [];

routeFiles.forEach((filePath) => {
  const source = fs.readFileSync(filePath, 'utf8');
  let match;

  while ((match = routePattern.exec(source)) !== null) {
    routes.push({ method: match[1].toUpperCase(), path: match[2] });
  }
});

const expectedRoutes = [
  { method: 'GET', path: '/api/entries' },
  { method: 'POST', path: '/api/entries' },
  { method: 'PATCH', path: '/api/entries/:id' },
  { method: 'DELETE', path: '/api/entries/:id' },
];

if (JSON.stringify(routes) !== JSON.stringify(expectedRoutes)) {
  fail(`Expected the four complete-CRUD routes, found: ${JSON.stringify(routes)}`);
}

allFiles
  .filter((filePath) => filePath.endsWith('.json'))
  .forEach((filePath) => {
    const source = fs.readFileSync(filePath, 'utf8');
    if (/"private_key"\s*:|"private_key_id"\s*:/.test(source)) {
      fail(`Possible Firebase service-account credential found in ${path.relative(root, filePath)}.`);
    }
  });

if (process.exitCode) {
  process.exit(process.exitCode);
}

console.log(`Syntax checked: ${javaScriptFiles.length} JavaScript files.`);
console.log('Browser module imports resolved successfully.');
console.log('HTML id and local-asset checks passed.');
console.log('API contract check passed: GET, POST, PATCH, and DELETE journal routes.');
console.log('Credential scan passed.');
