#!/usr/bin/env node
/**
 * ============================================================
 *  analyze-project.mjs — Replicant-2049
 *  Analyze project source code and extract context
 * ============================================================
 *
 *  Scans backend/frontend folders and extracts:
 *    - Package.json info (dependencies, scripts)
 *    - File structure (tree)
 *    - Endpoints / Controllers / Routes
 *    - Models / Schemas / Entities
 *    - Frontend components / pages / hooks
 *    - Environment variables
 *    - Existing documentation
 * ============================================================
 */

import { resolve, join, basename, extname, relative } from 'path';
import { existsSync, readdirSync, readFileSync, statSync } from 'fs';

// ─── Constants ─────────────────────────────────────────────────
const IGNORE_DIRS = new Set([
  'node_modules', '.git', 'dist', 'build', '.next', '.nuxt',
  'coverage', '.turbo', '.cache', '.vscode', '.idea',
  'var', 'logs', 'tmp', 'temp', '__pycache__',
  'dev-dist', '.angular',
]);

const CODE_EXTENSIONS = new Set([
  '.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs',
  '.vue', '.svelte', '.py', '.go', '.rs',
  '.json', '.yaml', '.yml', '.toml',
]);

const MAX_FILE_SIZE = 30_000;  // 30KB max per file
const MAX_FILES_PER_CATEGORY = 50;
const MAX_TREE_DEPTH = 5;
const MAX_CONTEXT_TOKENS = 120_000; // Leave room for system prompt + skill + response

// ─── File Tree ─────────────────────────────────────────────────
function buildFileTree(dir, depth = 0, maxDepth = MAX_TREE_DEPTH) {
  if (depth > maxDepth || !existsSync(dir)) return [];

  const entries = [];
  try {
    const items = readdirSync(dir).sort();
    for (const item of items) {
      if (item.startsWith('.') && item !== '.env.example') continue;
      if (IGNORE_DIRS.has(item)) continue;

      const fullPath = join(dir, item);
      const stat = statSync(fullPath);

      if (stat.isDirectory()) {
        const children = buildFileTree(fullPath, depth + 1, maxDepth);
        entries.push({ name: item + '/', type: 'dir', children });
      } else {
        entries.push({ name: item, type: 'file', size: stat.size });
      }
    }
  } catch {}

  return entries;
}

function treeToString(entries, prefix = '') {
  const lines = [];
  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    const isLast = i === entries.length - 1;
    const connector = isLast ? '└── ' : '├── ';
    const childPrefix = isLast ? '    ' : '│   ';

    lines.push(prefix + connector + entry.name);

    if (entry.type === 'dir' && entry.children?.length > 0) {
      lines.push(...treeToString(entry.children, prefix + childPrefix));
    }
  }
  return lines;
}

// ─── Package.json analysis ─────────────────────────────────────
function analyzePackageJson(dir) {
  const pkgPath = join(dir, 'package.json');
  if (!existsSync(pkgPath)) return null;

  try {
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
    return {
      name: pkg.name,
      version: pkg.version,
      description: pkg.description,
      scripts: pkg.scripts || {},
      dependencies: Object.keys(pkg.dependencies || {}),
      devDependencies: Object.keys(pkg.devDependencies || {}),
      engines: pkg.engines,
    };
  } catch {
    return null;
  }
}

// ─── Read source files by pattern ──────────────────────────────
function findFiles(dir, patterns, maxFiles = MAX_FILES_PER_CATEGORY) {
  const results = [];

  function walk(currentDir, depth = 0) {
    if (depth > 6 || results.length >= maxFiles) return;
    if (!existsSync(currentDir)) return;

    try {
      const items = readdirSync(currentDir);
      for (const item of items) {
        if (results.length >= maxFiles) break;
        if (IGNORE_DIRS.has(item)) continue;

        const fullPath = join(currentDir, item);
        const stat = statSync(fullPath);

        if (stat.isDirectory()) {
          walk(fullPath, depth + 1);
        } else if (patterns.some(p => item.match(p)) && stat.size < MAX_FILE_SIZE) {
          results.push(fullPath);
        }
      }
    } catch {}
  }

  walk(dir);
  return results;
}

function readFileSafe(filePath, maxSize = MAX_FILE_SIZE) {
  try {
    const stat = statSync(filePath);
    if (stat.size > maxSize) {
      return readFileSync(filePath, 'utf8').substring(0, maxSize) + '\n... [truncated]';
    }
    return readFileSync(filePath, 'utf8');
  } catch {
    return null;
  }
}

// ─── Backend Analysis ──────────────────────────────────────────
function analyzeBackend(backendDir) {
  if (!existsSync(backendDir)) return null;

  const analysis = {
    type: 'backend',
    dir: backendDir,
    package: analyzePackageJson(backendDir),
    framework: null,
    controllers: [],
    models: [],
    modules: [],
    services: [],
    middleware: [],
    envVars: [],
    tree: null,
  };

  // Detect framework
  const deps = [
    ...(analysis.package?.dependencies || []),
    ...(analysis.package?.devDependencies || []),
  ];
  
  if (deps.includes('@nestjs/core')) analysis.framework = 'NestJS';
  else if (deps.includes('express')) analysis.framework = 'Express';
  else if (deps.includes('fastify')) analysis.framework = 'Fastify';
  else if (deps.includes('koa')) analysis.framework = 'Koa';

  // File tree
  const tree = buildFileTree(backendDir);
  analysis.tree = treeToString(tree).join('\n');

  // Controllers / Routes
  const controllerFiles = findFiles(backendDir, [
    /\.controller\.(ts|js)$/,
    /\.routes?\.(ts|js)$/,
    /router\.(ts|js)$/,
  ]);
  
  for (const file of controllerFiles) {
    const content = readFileSafe(file);
    if (!content) continue;

    const relPath = relative(backendDir, file);
    const endpoints = [];

    // NestJS decorators
    const nestMatches = content.matchAll(/@(Get|Post|Put|Patch|Delete|Head|Options|All)\(([^)]*)\)/g);
    for (const m of nestMatches) {
      endpoints.push({ method: m[1].toUpperCase(), path: m[2].replace(/['"]/g, '') || '/' });
    }

    // Express routes
    const expressMatches = content.matchAll(/\.(get|post|put|patch|delete|all)\(\s*['"`]([^'"`]+)['"`]/g);
    for (const m of expressMatches) {
      endpoints.push({ method: m[1].toUpperCase(), path: m[2] });
    }

    analysis.controllers.push({
      file: relPath,
      endpoints,
      source: content,
    });
  }

  // Models / Schemas / Entities
  const modelFiles = findFiles(backendDir, [
    /\.schema\.(ts|js)$/,
    /\.entity\.(ts|js)$/,
    /\.model\.(ts|js)$/,
    /\.dto\.(ts|js)$/,
  ]);

  for (const file of modelFiles) {
    const content = readFileSafe(file);
    if (!content) continue;
    analysis.models.push({
      file: relative(backendDir, file),
      source: content,
    });
  }

  // Modules (NestJS)
  const moduleFiles = findFiles(backendDir, [/\.module\.(ts|js)$/]);
  for (const file of moduleFiles) {
    const content = readFileSafe(file);
    if (!content) continue;
    analysis.modules.push({
      file: relative(backendDir, file),
      source: content,
    });
  }

  // Services  
  const serviceFiles = findFiles(backendDir, [/\.service\.(ts|js)$/]);
  for (const file of serviceFiles) {
    const content = readFileSafe(file);
    if (!content) continue;
    analysis.services.push({
      file: relative(backendDir, file),
      source: content,
    });
  }

  // Guards, Interceptors, Pipes, Filters (middleware-like)
  const middlewareFiles = findFiles(backendDir, [
    /\.guard\.(ts|js)$/,
    /\.interceptor\.(ts|js)$/,
    /\.pipe\.(ts|js)$/,
    /\.filter\.(ts|js)$/,
    /\.middleware\.(ts|js)$/,
  ]);
  for (const file of middlewareFiles) {
    const content = readFileSafe(file);
    if (!content) continue;
    analysis.middleware.push({
      file: relative(backendDir, file),
      source: content,
    });
  }

  // Environment variables from .env.example
  const envExamplePath = join(backendDir, '.env.example');
  if (existsSync(envExamplePath)) {
    const envContent = readFileSafe(envExamplePath);
    if (envContent) {
      const envLines = envContent.split('\n').filter(l => l.trim() && !l.startsWith('#'));
      analysis.envVars = envLines.map(l => {
        const [key] = l.split('=');
        return key?.trim();
      }).filter(Boolean);
    }
  }

  return analysis;
}

// ─── Frontend Analysis ─────────────────────────────────────────
function analyzeFrontend(frontendDir) {
  if (!existsSync(frontendDir)) return null;

  const analysis = {
    type: 'frontend',
    dir: frontendDir,
    package: analyzePackageJson(frontendDir),
    framework: null,
    components: [],
    pages: [],
    hooks: [],
    types: [],
    config: [],
    tree: null,
  };

  // Detect framework
  const deps = [
    ...(analysis.package?.dependencies || []),
    ...(analysis.package?.devDependencies || []),
  ];

  if (deps.includes('react') || deps.includes('react-dom')) analysis.framework = 'React';
  else if (deps.includes('vue')) analysis.framework = 'Vue';
  else if (deps.includes('svelte')) analysis.framework = 'Svelte';
  else if (deps.includes('@angular/core')) analysis.framework = 'Angular';
  else if (deps.includes('next')) analysis.framework = 'Next.js';

  // File tree
  const tree = buildFileTree(frontendDir);
  analysis.tree = treeToString(tree).join('\n');

  // Components
  const componentFiles = findFiles(frontendDir, [
    /\.(tsx|jsx|vue|svelte)$/, // All component files
  ]);

  for (const file of componentFiles) {
    const content = readFileSafe(file);
    if (!content) continue;
    const relPath = relative(frontendDir, file);
    
    // Categorize
    const lowerPath = relPath.toLowerCase();
    if (lowerPath.includes('page') || lowerPath.includes('views/') || lowerPath.includes('routes/')) {
      analysis.pages.push({ file: relPath, source: content });
    } else {
      analysis.components.push({ file: relPath, source: content });
    }
  }

  // Hooks (React)
  const hookFiles = findFiles(frontendDir, [/^use[-.].*\.(ts|tsx|js|jsx)$/]);
  for (const file of hookFiles) {
    const content = readFileSafe(file);
    if (!content) continue;
    analysis.hooks.push({ file: relative(frontendDir, file), source: content });
  }

  // Types
  const typeFiles = findFiles(frontendDir, [/\.types?\.(ts|tsx)$/, /types\/.*\.(ts|tsx)$/]);
  for (const file of typeFiles) {
    const content = readFileSafe(file);
    if (!content) continue;
    analysis.types.push({ file: relative(frontendDir, file), source: content });
  }

  // Config files
  const configFiles = findFiles(frontendDir, [
    /^(vite|next|nuxt|angular|webpack)\.config\.(ts|js|mjs)$/,
    /tailwind\.config\.(ts|js)$/,
    /tsconfig.*\.json$/,
  ]);
  for (const file of configFiles) {
    const content = readFileSafe(file);
    if (!content) continue;
    analysis.config.push({ file: relative(frontendDir, file), source: content });
  }

  return analysis;
}

// ─── Existing Docs Analysis ────────────────────────────────────
function analyzeExistingDocs(moreDir) {
  if (!existsSync(moreDir)) return null;

  const docs = {};
  const docFiles = ['CLAUDE.md', 'SRS.md', 'PLAN.md', 'TUTORIAL.md', 
                     'LOVABLE-PROMPT.md', 'ERASER-DSL.md', 'README.md'];

  for (const docFile of docFiles) {
    const filePath = join(moreDir, docFile);
    if (existsSync(filePath)) {
      const content = readFileSafe(filePath);
      if (content) {
        const isTemplate = content.includes('{{PROYECTO}}') || content.includes('{{CLIENTE}}');
        docs[docFile] = { content, isTemplate };
      }
    }
  }

  return docs;
}

// ─── Main Analysis Function ────────────────────────────────────
/**
 * Analyze a project and return structured context.
 * 
 * @param {string} projectDir - Root directory containing backend/frontend/more folders
 * @param {string} projectCode - Project code (e.g., 'TC', 'APP-PAGOS-PENDIENTES')
 * @param {object} config - Optional project.config.js contents  
 * @returns {object} Full project analysis
 */
export function analyzeProject(projectDir, projectCode, config = null) {
  const result = {
    projectCode,
    projectDir,
    timestamp: new Date().toISOString(),
    config: null,
    backend: null,
    frontend: null,
    existingDocs: null,
    summary: {},
  };

  // Determine folder paths
  const backendDir = config?.paths?.backend
    ? resolve(projectDir, config.paths.backend)
    : findSubfolder(projectDir, projectCode, 'backend');

  const frontendDir = config?.paths?.frontend
    ? resolve(projectDir, config.paths.frontend)
    : findSubfolder(projectDir, projectCode, 'frontend');

  const moreDir = config?.paths?.docs
    ? resolve(projectDir, config.paths.docs)
    : findSubfolder(projectDir, projectCode, 'more');

  // Analyze each part
  if (backendDir) {
    result.backend = analyzeBackend(backendDir);
  }

  if (frontendDir) {
    result.frontend = analyzeFrontend(frontendDir);
  }

  if (moreDir) {
    result.existingDocs = analyzeExistingDocs(moreDir);
  }

  // Load config if available
  result.config = config;

  // Build summary
  result.summary = {
    hasBackend: !!result.backend,
    hasFrontend: !!result.frontend,
    hasExistingDocs: !!result.existingDocs,
    backendFramework: result.backend?.framework,
    frontendFramework: result.frontend?.framework,
    controllerCount: result.backend?.controllers?.length || 0,
    endpointCount: result.backend?.controllers?.reduce((sum, c) => sum + c.endpoints.length, 0) || 0,
    modelCount: result.backend?.models?.length || 0,
    componentCount: result.frontend?.components?.length || 0,
    pageCount: result.frontend?.pages?.length || 0,
    hookCount: result.frontend?.hooks?.length || 0,
  };

  return result;
}

// ─── Helper to find project subfolders ─────────────────────────
function findSubfolder(projectDir, projectCode, suffix) {
  // Try exact match first
  const exact = join(projectDir, `${projectCode}-${suffix}`);
  if (existsSync(exact)) return exact;

  // Try case-insensitive
  try {
    const items = readdirSync(projectDir);
    const target = `${projectCode}-${suffix}`.toLowerCase();
    for (const item of items) {
      if (item.toLowerCase() === target && statSync(join(projectDir, item)).isDirectory()) {
        return join(projectDir, item);
      }
    }
  } catch {}

  return null;
}

// ─── Compact context for LLM ──────────────────────────────────

/**
 * Truncate source code to first N lines to save tokens.
 * Keeps imports, class/function declarations, and decorators.
 */
function truncateSource(source, maxLines = 60) {
  const lines = source.split('\n');
  if (lines.length <= maxLines) return source;
  return lines.slice(0, maxLines).join('\n') + `\n// ... (${lines.length - maxLines} more lines)`;
}

/**
 * Add a section to the context only if we're within token budget.
 * Returns true if section was added, false if budget exceeded.
 */
function addWithBudget(sections, text, budgetRef) {
  const tokens = estimateTokens(text);
  if (budgetRef.used + tokens > budgetRef.max) return false;
  sections.push(text);
  budgetRef.used += tokens;
  return true;
}

/**
 * Convert full analysis into a compact text representation 
 * suitable for sending to Claude API (token-efficient).
 * Respects MAX_CONTEXT_TOKENS budget.
 */
export function analysisToContext(analysis) {
  const sections = [];
  const budget = { used: 0, max: MAX_CONTEXT_TOKENS };

  // === PRIORITY 1: Always include summary & structure ===
  const header = [
    `# Project: ${analysis.projectCode}`,
    `Analyzed: ${analysis.timestamp}`,
    '',
    '## Summary',
    `- Backend: ${analysis.summary.hasBackend ? `${analysis.summary.backendFramework} (${analysis.summary.controllerCount} controllers, ${analysis.summary.endpointCount} endpoints, ${analysis.summary.modelCount} models)` : 'Not found'}`,
    `- Frontend: ${analysis.summary.hasFrontend ? `${analysis.summary.frontendFramework} (${analysis.summary.componentCount} components, ${analysis.summary.pageCount} pages, ${analysis.summary.hookCount} hooks)` : 'Not found'}`,
    `- Existing docs: ${analysis.summary.hasExistingDocs ? 'Yes' : 'No'}`,
  ].join('\n');
  addWithBudget(sections, header, budget);

  // Config
  if (analysis.config) {
    addWithBudget(sections, '\n## Project Config\n```json\n' + JSON.stringify(analysis.config, null, 2) + '\n```', budget);
  }

  // === PRIORITY 2: File trees (compact, very useful) ===
  if (analysis.backend) {
    const be = analysis.backend;
    addWithBudget(sections, `\n## Backend\nFramework: ${be.framework || 'Unknown'}`, budget);
    
    if (be.package) {
      addWithBudget(sections, `\n### Dependencies\n${be.package.dependencies.join(', ')}`, budget);
    }
    addWithBudget(sections, `\n### File Structure\n\`\`\`\n${be.tree}\n\`\`\``, budget);

    if (be.envVars.length > 0) {
      addWithBudget(sections, `\n### Environment Variables\n${be.envVars.join(', ')}`, budget);
    }
  }

  if (analysis.frontend) {
    const fe = analysis.frontend;
    addWithBudget(sections, `\n## Frontend\nFramework: ${fe.framework || 'Unknown'}`, budget);
    
    if (fe.package) {
      addWithBudget(sections, `\n### Dependencies\n${fe.package.dependencies.join(', ')}`, budget);
    }
    addWithBudget(sections, `\n### File Structure\n\`\`\`\n${fe.tree}\n\`\`\``, budget);
  }

  // === PRIORITY 3: Models, Schemas, DTOs (crucial for SRS) ===
  if (analysis.backend?.models?.length > 0) {
    addWithBudget(sections, `\n### Models / Schemas / DTOs`, budget);
    for (const model of analysis.backend.models) {
      if (!addWithBudget(sections, `\n#### ${model.file}\n\`\`\`typescript\n${truncateSource(model.source, 80)}\n\`\`\``, budget)) break;
    }
  }

  // === PRIORITY 4: Types (if frontend) ===
  if (analysis.frontend?.types?.length > 0) {
    addWithBudget(sections, `\n### Types`, budget);
    for (const t of analysis.frontend.types) {
      if (!addWithBudget(sections, `\n#### ${t.file}\n\`\`\`typescript\n${truncateSource(t.source, 60)}\n\`\`\``, budget)) break;
    }
  }

  // === PRIORITY 5: Controllers with endpoints ===
  if (analysis.backend?.controllers?.length > 0) {
    addWithBudget(sections, `\n### Controllers & Endpoints`, budget);
    for (const ctrl of analysis.backend.controllers) {
      let ctrlText = `\n#### ${ctrl.file}`;
      if (ctrl.endpoints.length > 0) {
        ctrlText += '\nEndpoints:\n' + ctrl.endpoints.map(ep => `  ${ep.method} ${ep.path}`).join('\n');
      }
      ctrlText += `\n\`\`\`typescript\n${truncateSource(ctrl.source, 80)}\n\`\`\``;
      if (!addWithBudget(sections, ctrlText, budget)) break;
    }
  }

  // === PRIORITY 6: Services ===
  if (analysis.backend?.services?.length > 0) {
    addWithBudget(sections, `\n### Services`, budget);
    for (const svc of analysis.backend.services) {
      if (!addWithBudget(sections, `\n#### ${svc.file}\n\`\`\`typescript\n${truncateSource(svc.source, 50)}\n\`\`\``, budget)) break;
    }
  }

  // === PRIORITY 7: Modules ===
  if (analysis.backend?.modules?.length > 0) {
    addWithBudget(sections, `\n### Modules`, budget);
    for (const mod of analysis.backend.modules) {
      if (!addWithBudget(sections, `\n#### ${mod.file}\n\`\`\`typescript\n${truncateSource(mod.source, 40)}\n\`\`\``, budget)) break;
    }
  }

  // === PRIORITY 8: Hooks (React) ===
  if (analysis.frontend?.hooks?.length > 0) {
    addWithBudget(sections, `\n### Hooks`, budget);
    for (const hook of analysis.frontend.hooks) {
      if (!addWithBudget(sections, `\n#### ${hook.file}\n\`\`\`typescript\n${truncateSource(hook.source, 40)}\n\`\`\``, budget)) break;
    }
  }

  // === PRIORITY 9: Pages ===
  if (analysis.frontend?.pages?.length > 0) {
    addWithBudget(sections, `\n### Pages (${analysis.frontend.pages.length} total)`, budget);
    for (const page of analysis.frontend.pages) {
      if (!addWithBudget(sections, `\n#### ${page.file}\n\`\`\`tsx\n${truncateSource(page.source, 50)}\n\`\`\``, budget)) break;
    }
  }

  // === PRIORITY 10: Components (lowest priority, most numerous) ===
  if (analysis.frontend?.components?.length > 0) {
    addWithBudget(sections, `\n### Components (${analysis.frontend.components.length} total)`, budget);
    for (const comp of analysis.frontend.components) {
      if (!addWithBudget(sections, `\n#### ${comp.file}\n\`\`\`tsx\n${truncateSource(comp.source, 30)}\n\`\`\``, budget)) break;
    }
  }

  // === PRIORITY 11: Guards / Middleware ===
  if (analysis.backend?.middleware?.length > 0) {
    addWithBudget(sections, `\n### Guards / Interceptors / Pipes / Filters`, budget);
    for (const mw of analysis.backend.middleware) {
      if (!addWithBudget(sections, `\n#### ${mw.file}\n\`\`\`typescript\n${truncateSource(mw.source, 30)}\n\`\`\``, budget)) break;
    }
  }

  // === Existing docs (only non-template) ===
  if (analysis.existingDocs) {
    for (const [filename, doc] of Object.entries(analysis.existingDocs)) {
      if (!doc.isTemplate) {
        addWithBudget(sections, `\n## Existing: ${filename}\n${doc.content.substring(0, 3000)}`, budget);
      }
    }
  }

  // Report budget usage
  const usedPct = Math.round((budget.used / budget.max) * 100);
  sections.push(`\n<!-- Context: ~${budget.used.toLocaleString()} / ${budget.max.toLocaleString()} tokens (${usedPct}%) -->`);

  return sections.join('\n');
}

// ─── Estimate tokens ──────────────────────────────────────────
/**
 * Rough estimation: ~4 chars per token for English/code
 */
export function estimateTokens(text) {
  return Math.ceil(text.length / 4);
}
