#!/usr/bin/env node
/**
 * ============================================================
 *  init-project.mjs — Replicant-2049
 *  Scaffold a new project with documentation structure
 * ============================================================
 *
 *  Usage:
 *    npx replicant init [--project NAME] [--client FOLDER]
 *
 *  Creates:
 *    - {PROJECT}-more/ folder with documentation templates
 *    - project.config.js with pre-filled values
 *    - CLAUDE.md as the hub
 * ============================================================
 */

import { resolve, dirname, join, relative } from 'path';
import { existsSync, mkdirSync, readFileSync, writeFileSync, copyFileSync, readdirSync, statSync } from 'fs';
import { fileURLToPath } from 'url';
import readline from 'readline';
import { checkAtlasReady, setupAtlas } from './atlas-setup.mjs';
import { checkAuth0Ready, setupAuth0 } from './auth0-setup.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const SKILLS_DIR = resolve(__dirname, '..', 'Skills');
const BOILERPLATES_DIR = resolve(__dirname, '..', 'Boilerplates');

// ─── ANSI Colors ───────────────────────────────────────────────
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  blue: '\x1b[34m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
};

const log = {
  info: (msg) => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`),
  success: (msg) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
  warn: (msg) => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`),
  title: (msg) => console.log(`\n${colors.bright}${colors.cyan}${msg}${colors.reset}\n`),
};

// ─── Parse CLI args ────────────────────────────────────────────
function parseArgs() {
  const args = process.argv.slice(2);
  let projectName = null;
  let projectFullName = null;
  let clientFolder = null;
  let clientFullName = null;
  let description = null;
  let pmName = null;
  let devName = null;
  let targetDir = process.cwd();
  let nonInteractive = false;
  let fullMode = false;
  let backendOnly = false;
  let frontendOnly = false;
  let portBackend = '3001';
  let portFrontend = '5173';
  let dbName = null;
  let atlasMode = false;
  let atlasOrgId = null;
  let atlasProvider = 'AWS';
  let atlasRegion = 'SA_EAST_1';
  let auth0Mode = false;
  let auth0Domain = null;
  let auth0Audience = null;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--project' && args[i + 1]) {
      projectName = args[i + 1];
      i++;
    } else if (args[i] === '--name' && args[i + 1]) {
      projectFullName = args[i + 1];
      i++;
    } else if (args[i] === '--client' && args[i + 1]) {
      clientFolder = args[i + 1];
      i++;
    } else if (args[i] === '--client-name' && args[i + 1]) {
      clientFullName = args[i + 1];
      i++;
    } else if (args[i] === '--description' && args[i + 1]) {
      description = args[i + 1];
      i++;
    } else if (args[i] === '--pm' && args[i + 1]) {
      pmName = args[i + 1];
      i++;
    } else if (args[i] === '--dev' && args[i + 1]) {
      devName = args[i + 1];
      i++;
    } else if (args[i] === '--target' && args[i + 1]) {
      targetDir = resolve(args[i + 1]);
      i++;
    } else if (args[i] === '--full') {
      fullMode = true;
    } else if (args[i] === '--backend') {
      backendOnly = true;
    } else if (args[i] === '--frontend') {
      frontendOnly = true;
    } else if (args[i] === '--port-backend' && args[i + 1]) {
      portBackend = args[i + 1];
      i++;
    } else if (args[i] === '--port-frontend' && args[i + 1]) {
      portFrontend = args[i + 1];
      i++;
    } else if (args[i] === '--db-name' && args[i + 1]) {
      dbName = args[i + 1];
      i++;
    } else if (args[i] === '--atlas') {
      atlasMode = true;
    } else if (args[i] === '--atlas-org' && args[i + 1]) {
      atlasOrgId = args[i + 1];
      i++;
    } else if (args[i] === '--atlas-provider' && args[i + 1]) {
      atlasProvider = args[i + 1].toUpperCase();
      i++;
    } else if (args[i] === '--atlas-region' && args[i + 1]) {
      atlasRegion = args[i + 1];
      i++;
    } else if (args[i] === '--auth0') {
      auth0Mode = true;
    } else if (args[i] === '--auth0-domain' && args[i + 1]) {
      auth0Domain = args[i + 1];
      auth0Mode = true;
      i++;
    } else if (args[i] === '--auth0-audience' && args[i + 1]) {
      auth0Audience = args[i + 1];
      i++;
    } else if (args[i] === '-y' || args[i] === '--yes') {
      nonInteractive = true;
    } else if (args[i] === '--help' || args[i] === '-h') {
      printHelp();
      process.exit(0);
    }
  }

  return { 
    projectName, projectFullName, clientFolder, clientFullName, 
    description, pmName, devName, targetDir, nonInteractive,
    fullMode, backendOnly, frontendOnly, portBackend, portFrontend, dbName,
    atlasMode, atlasOrgId, atlasProvider, atlasRegion,
    auth0Mode, auth0Domain, auth0Audience
  };
}

function printHelp() {
  console.log(`
${colors.bright}Replicant-2049 — Project Initializer${colors.reset}

${colors.cyan}Usage:${colors.reset}
  npx replicant init [options]

${colors.cyan}Options:${colors.reset}
  --project NAME        Project code (e.g., TC, APP-PAGOS)
  --name FULLNAME       Project full name
  --client FOLDER       Client folder name (e.g., NOR-PAN, INCBA)
  --client-name NAME    Client full name
  --description DESC    Short description
  --pm NAME             Project Manager name
  --dev NAME            Developer name
  --target DIR          Target directory (default: current dir)
  --full                Scaffold full project: backend + frontend + docs
  --backend             Only scaffold backend (with --full)
  --frontend            Only scaffold frontend (with --full)
  --port-backend PORT   Backend port (default: 3001)
  --port-frontend PORT  Frontend port (default: 5173)
  --db-name NAME        MongoDB database name (default: project code lowercase)
  --atlas               Create MongoDB Atlas project + cluster + user automatically
  --atlas-org ID        Atlas organization ID (auto-detect if not provided)
  --atlas-provider P    Cloud provider: AWS, AZURE, GCP (default: AWS)
  --atlas-region R      Region (default: SA_EAST_1)
  --auth0               Configure Auth0 tenant (SPA app, API, M2M, roles)
  --auth0-domain DOMAIN Auth0 tenant domain (auto-detect if CLI authenticated)
  --auth0-audience URL  Custom API audience (default: https://api.{project}.norpan.com)
  -y, --yes             Non-interactive mode (use defaults)
  --help, -h            Show this help

${colors.cyan}Examples:${colors.reset}
  npx replicant init --project TC --client NOR-PAN
  npx replicant init --project TC --client NOR-PAN --full
  npx replicant init --project TC --client NOR-PAN --full --atlas
  npx replicant init --project TC --client NOR-PAN --full --atlas --atlas-region SA_EAST_1
  npx replicant init --project TC --client NOR-PAN --full --auth0
  npx replicant init --project TC --client NOR-PAN --full --atlas --auth0
  npx replicant init --project TC --client NOR-PAN --full -y
  npx replicant init  # Interactive mode
`);
}

// ─── Interactive prompts ───────────────────────────────────────
async function prompt(question, defaultValue = '') {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    const defaultHint = defaultValue ? ` (${defaultValue})` : '';
    rl.question(`${colors.cyan}?${colors.reset} ${question}${defaultHint}: `, (answer) => {
      rl.close();
      resolve(answer.trim() || defaultValue);
    });
  });
}

async function gatherProjectInfo(args) {
  log.title('🚀 Replicant-2049 — Project Initializer');

  // Use CLI args or defaults if non-interactive mode
  const useDefaults = args.nonInteractive;
  
  const projectCode = args.projectName || (useDefaults ? 'PROYECTO' : await prompt('Project code', 'PROYECTO'));
  const projectFullName = args.projectFullName || (useDefaults ? `Sistema de ${projectCode}` : await prompt('Project full name', `Sistema de ${projectCode}`));
  const clientFolder = args.clientFolder || (useDefaults ? 'CLIENTE' : await prompt('Client folder', 'CLIENTE'));
  const clientFullName = args.clientFullName || (useDefaults ? `${clientFolder} S.R.L.` : await prompt('Client full name', `${clientFolder} S.R.L.`));
  const description = args.description || (useDefaults ? 'Sistema de gestión' : await prompt('Short description', 'Sistema de gestión'));
  const pmName = args.pmName || (useDefaults ? 'Felipe Rebolledo' : await prompt('Project Manager', 'Felipe Rebolledo'));
  const devName = args.devName || (useDefaults ? 'Camilo Acencio' : await prompt('Developer', 'Camilo Acencio'));

  return {
    project: {
      code: projectCode.toUpperCase(),
      name: projectFullName,
      description,
    },
    client: {
      folder: clientFolder.toUpperCase(),
      name: clientFullName,
    },
    team: {
      pm: pmName,
      developer: devName,
    },
  };
}

// ─── File creation ─────────────────────────────────────────────
function ensureDir(dirPath) {
  if (!existsSync(dirPath)) {
    mkdirSync(dirPath, { recursive: true });
    log.success(`Created directory: ${dirPath}`);
  }
}

function replaceVariables(content, info) {
  const replacements = {
    '{{PROYECTO}}': info.project.code,
    '{{PROYECTO_LOWER}}': info.project.code.toLowerCase().replace(/-/g, '-'),
    '{{NOMBRE_COMPLETO}}': info.project.name,
    '{{DESCRIPCION_CORTA}}': info.project.description,
    '{{CLIENTE}}': info.client.name,
    '{{PM}}': info.team.pm,
    '{{DEV}}': info.team.developer,
    '{{AUTOR}}': 'INCBA',
    '{{FECHA}}': new Date().toISOString().split('T')[0],
    '{{YEAR}}': new Date().getFullYear().toString(),
    '{{VERSION}}': '1.0.0',
    '{{PORT_BACKEND}}': info.ports?.backend || '3001',
    '{{PORT_FRONTEND}}': info.ports?.frontend || '5173',
    '{{DB_NAME}}': info.dbName || info.project.code.toLowerCase().replace(/-/g, '_'),
  };

  let result = content;
  for (const [key, value] of Object.entries(replacements)) {
    result = result.replace(new RegExp(key.replace(/[{}]/g, '\\$&'), 'g'), value);
  }
  return result;
}

function createDocFromTemplate(templateName, outputPath, info) {
  const templatePath = join(SKILLS_DIR, `${templateName}_TEMPLATE.md`);
  
  if (!existsSync(templatePath)) {
    log.warn(`Template not found: ${templatePath}`);
    return false;
  }

  // Read the template and normalize line endings
  let templateContent = readFileSync(templatePath, 'utf8');
  templateContent = templateContent.replace(/\r\n/g, '\n');
  
  // Find the start of the template block (```markdown after ## Plantilla)
  const startMarker = '## Plantilla';
  const startIndex = templateContent.indexOf(startMarker);
  
  if (startIndex === -1) {
    log.warn(`Could not find "## Plantilla" in: ${templateName}`);
    return false;
  }
  
  // Find ```markdown after the plantilla header
  const mdBlockStart = templateContent.indexOf('```markdown\n', startIndex);
  if (mdBlockStart === -1) {
    log.warn(`Could not find markdown block in: ${templateName}`);
    return false;
  }
  
  const contentStart = mdBlockStart + '```markdown\n'.length;
  
  // Find the end of the template block - look for ``` at start of line 
  // followed by section markers (---\n\n## or just ---\n\n*)
  const afterContent = templateContent.slice(contentStart);
  const endMatch = afterContent.match(/\n```\n\n---/);
  
  if (!endMatch) {
    log.warn(`Could not find end of template in: ${templateName}`);
    return false;
  }
  
  const templateMarkdown = afterContent.slice(0, endMatch.index);
  
  if (templateMarkdown) {
    const docContent = replaceVariables(templateMarkdown, info);
    writeFileSync(outputPath, docContent, 'utf8');
    log.success(`Created: ${outputPath}`);
    return true;
  } else {
    log.warn(`Could not extract template from: ${templateName}`);
    return false;
  }
}

function createProjectConfig(targetDir, info) {
  const examplePath = resolve(__dirname, '..', 'project.config.example.js');
  const outputPath = join(targetDir, 'project.config.js');

  if (existsSync(examplePath)) {
    let content = readFileSync(examplePath, 'utf8');
    content = content
      .replace(/code: 'PROYECTO'/g, `code: '${info.project.code}'`)
      .replace(/name: 'Sistema de Gestión de Ejemplo'/g, `name: '${info.project.name}'`)
      .replace(/description: 'Sistema web para gestionar X procesos del cliente Y'/g, `description: '${info.project.description}'`)
      .replace(/name: 'Cliente S.R.L.'/g, `name: '${info.client.name}'`)
      .replace(/folder: 'CLIENTE'/g, `folder: '${info.client.folder}'`)
      .replace(/pm: 'Felipe Rebolledo'/g, `pm: '${info.team.pm}'`)
      .replace(/developer: 'Camilo Acencio'/g, `developer: '${info.team.developer}'`);
    
    writeFileSync(outputPath, content, 'utf8');
    log.success(`Created: ${outputPath}`);
  } else {
    log.warn('project.config.example.js not found');
  }
}

// ─── Boilerplate Scaffolding ───────────────────────────────────
/**
 * Recursively copy a boilerplate directory, replacing template variables.
 * Binary files are copied as-is; text files get variable replacement.
 */
function copyBoilerplateDir(srcDir, destDir, info) {
  ensureDir(destDir);
  
  const entries = readdirSync(srcDir);
  let fileCount = 0;
  
  for (const entry of entries) {
    const srcPath = join(srcDir, entry);
    const destPath = join(destDir, entry);
    const stat = statSync(srcPath);
    
    if (stat.isDirectory()) {
      fileCount += copyBoilerplateDir(srcPath, destPath, info);
    } else {
      // Check if it's a text file that needs variable replacement
      const textExtensions = ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.json', '.html', '.css', '.md', '.env', '.example', '.gitignore'];
      const isText = textExtensions.some(ext => entry.endsWith(ext)) || 
                     entry === '.gitignore' || entry === '.env.example' || entry === 'Procfile';
      
      if (isText) {
        let content = readFileSync(srcPath, 'utf8');
        content = replaceVariables(content, info);
        writeFileSync(destPath, content, 'utf8');
      } else {
        copyFileSync(srcPath, destPath);
      }
      fileCount++;
    }
  }
  
  return fileCount;
}

/**
 * Scaffold full project: backend, frontend, or both from Boilerplates.
 */
function scaffoldFullProject(targetDir, info, options) {
  const { backendOnly, frontendOnly } = options;
  const projectCode = info.project.code;
  
  const doBackend = !frontendOnly;
  const doFrontend = !backendOnly;
  
  if (doBackend) {
    const backendSrc = join(BOILERPLATES_DIR, 'express-backend');
    const backendDest = join(targetDir, `${projectCode}-backend`);
    
    if (!existsSync(backendSrc)) {
      log.warn('Backend boilerplate not found at: ' + backendSrc);
    } else {
      log.title('🔧 Scaffolding backend...');
      const count = copyBoilerplateDir(backendSrc, backendDest, info);
      
      // Create .env from .env.example
      const envExample = join(backendDest, '.env.example');
      const envFile = join(backendDest, '.env');
      if (existsSync(envExample) && !existsSync(envFile)) {
        copyFileSync(envExample, envFile);
        log.success(`Created: .env (from .env.example)`);
      }
      
      log.success(`Backend scaffolded: ${count} files → ${projectCode}-backend/`);
    }
  }
  
  if (doFrontend) {
    const frontendSrc = join(BOILERPLATES_DIR, 'react-frontend');
    const frontendDest = join(targetDir, `${projectCode}-frontend`);
    
    if (!existsSync(frontendSrc)) {
      log.warn('Frontend boilerplate not found at: ' + frontendSrc);
    } else {
      log.title('🎨 Scaffolding frontend...');
      const count = copyBoilerplateDir(frontendSrc, frontendDest, info);
      
      // Create .env from .env.example
      const envExample = join(frontendDest, '.env.example');
      const envFile = join(frontendDest, '.env');
      if (existsSync(envExample) && !existsSync(envFile)) {
        copyFileSync(envExample, envFile);
        log.success(`Created: .env (from .env.example)`);
      }
      
      log.success(`Frontend scaffolded: ${count} files → ${projectCode}-frontend/`);
    }
  }
  
  return { doBackend, doFrontend };
}

// ─── Main ──────────────────────────────────────────────────────
async function main() {
  const args = parseArgs();
  
  // Gather project info (interactive if not provided)
  const info = await gatherProjectInfo(args);
  
  // Attach ports and dbName to info for variable replacement
  info.ports = {
    backend: args.portBackend,
    frontend: args.portFrontend,
  };
  info.dbName = args.dbName || info.project.code.toLowerCase().replace(/-/g, '_');
  
  const targetDir = args.targetDir;
  const projectCode = info.project.code;
  const moreDir = join(targetDir, `${projectCode}-more`);
  const ssDir = join(moreDir, 'SS');
  const diagramsDir = join(moreDir, 'diagrams');

  log.title('📁 Creating project structure...');

  // Create directories
  ensureDir(moreDir);
  ensureDir(ssDir);
  ensureDir(diagramsDir);

  // Create documents from templates
  log.title('📝 Generating documentation...');

  createDocFromTemplate('CLAUDE', join(moreDir, 'CLAUDE.md'), info);
  createDocFromTemplate('SRS', join(moreDir, 'SRS.md'), info);
  createDocFromTemplate('PLAN', join(moreDir, 'PLAN.md'), info);
  createDocFromTemplate('LOVABLE_PROMPT', join(moreDir, 'LOVABLE-PROMPT.md'), info);
  createDocFromTemplate('ERASER_DSL', join(moreDir, 'ERASER-DSL.md'), info);

  // Create config file in target directory
  createProjectConfig(targetDir, info);

  // Create empty TUTORIAL.md (to be filled later)
  const tutorialPath = join(moreDir, 'TUTORIAL.md');
  if (!existsSync(tutorialPath)) {
    writeFileSync(tutorialPath, `# ${info.project.name} — Tutorial de Usuario

> Este documento se generará durante el desarrollo del proyecto.

## Contenido

*Pendiente de documentación.*

---

*INCBA — ${new Date().getFullYear()}*
`, 'utf8');
    log.success(`Created: ${tutorialPath}`);
  }

  // ─── Full Mode: scaffold backend + frontend ─────────────────
  let scaffoldResult = null;
  if (args.fullMode) {
    scaffoldResult = scaffoldFullProject(targetDir, info, {
      backendOnly: args.backendOnly,
      frontendOnly: args.frontendOnly,
    });
  }

  // ─── Atlas Mode: create MongoDB Atlas project + cluster ─────
  let atlasResult = null;
  if (args.atlasMode) {
    const check = checkAtlasReady();
    if (!check.ok) {
      log.warn(check.message);
      log.info('Saltando configuración de Atlas. Podés ejecutarlo después:');
      log.info('  atlas auth login && node src/atlas-setup.mjs');
    } else {
      const backendDir = scaffoldResult?.doBackend
        ? join(targetDir, `${projectCode}-backend`)
        : null;

      atlasResult = await setupAtlas({
        projectName: `${info.client.folder}-${projectCode}`,
        dbName: info.dbName,
        orgId: args.atlasOrgId,
        provider: args.atlasProvider,
        region: args.atlasRegion,
        backendDir,
      });
    }
  }

  // ─── Auth0 Mode: configure Auth0 tenant ─────────────────────
  let auth0Result = null;
  if (args.auth0Mode) {
    const check = checkAuth0Ready();
    if (!check.ok) {
      log.warn(check.message);
      log.info('Saltando configuración de Auth0. Podés ejecutarlo después:');
      log.info('  auth0 login --domain <tenant>.us.auth0.com');
    } else {
      const backendDir = scaffoldResult?.doBackend
        ? join(targetDir, `${projectCode}-backend`)
        : null;
      const frontendDir = scaffoldResult?.doFrontend
        ? join(targetDir, `${projectCode}-frontend`)
        : null;

      auth0Result = await setupAuth0({
        projectName: projectCode,
        projectLower: info.dbName,
        domain: args.auth0Domain,
        audience: args.auth0Audience,
        portFrontend: parseInt(info.ports?.frontend || '5173', 10),
        portBackend: parseInt(info.ports?.backend || '3001', 10),
        frontendDir,
        backendDir,
        tenantsList: check.tenants,
      });
    }
  }

  // Summary
  log.title('✅ Project initialized successfully!');
  
  let structureTree = `
${colors.cyan}Created structure:${colors.reset}
  ${projectCode}-more/
  ├── CLAUDE.md        ${colors.green}← Hub central${colors.reset}
  ├── SRS.md           ${colors.yellow}← Completar requisitos${colors.reset}
  ├── PLAN.md          ${colors.yellow}← Completar plan${colors.reset}
  ├── LOVABLE-PROMPT.md
  ├── ERASER-DSL.md
  ├── TUTORIAL.md
  ├── SS/              ${colors.cyan}← Screenshots aquí${colors.reset}
  └── diagrams/        ${colors.cyan}← Diagramas PNG aquí${colors.reset}
  
  project.config.js    ${colors.green}← Configuración del proyecto${colors.reset}`;

  if (scaffoldResult) {
    if (scaffoldResult.doBackend) {
      structureTree += `

  ${projectCode}-backend/
  ├── src/
  │   ├── app.ts           ${colors.green}← Express server${colors.reset}
  │   ├── config/          ${colors.cyan}← env, database${colors.reset}
  │   ├── middleware/       ${colors.cyan}← auth, roles, validate, errorHandler${colors.reset}
  │   ├── models/           ${colors.cyan}← User model${colors.reset}
  │   └── routes/           ${colors.cyan}← health, users/me${colors.reset}
  ├── package.json
  ├── tsconfig.json
  ├── .env               ${colors.green}← Variables de entorno (local)${colors.reset}
  └── .env.example`;
    }
    if (scaffoldResult.doFrontend) {
      structureTree += `

  ${projectCode}-frontend/
  ├── src/
  │   ├── App.tsx          ${colors.green}← Root component${colors.reset}
  │   ├── config/          ${colors.cyan}← Auth0, skip-auth${colors.reset}
  │   ├── hooks/           ${colors.cyan}← useApi, useCurrentUser${colors.reset}
  │   ├── components/      ${colors.cyan}← auth, layout, ErrorBoundary${colors.reset}
  │   ├── pages/           ${colors.cyan}← Dashboard, Login, NotFound${colors.reset}
  │   └── providers/       ${colors.cyan}← Auth0Provider${colors.reset}
  ├── package.json
  ├── vite.config.ts
  ├── tailwind.config.ts
  ├── components.json      ${colors.green}← shadcn/ui config${colors.reset}
  ├── .env               ${colors.green}← Variables de entorno (local)${colors.reset}
  └── .env.example`;
    }
  }

  console.log(structureTree);

  // Next steps
  let nextSteps = `
${colors.cyan}Next steps:${colors.reset}
  1. Review and complete ${colors.bright}SRS.md${colors.reset} with your requirements
  2. Review and complete ${colors.bright}PLAN.md${colors.reset} with your timeline
  3. Use ${colors.bright}CLAUDE.md${colors.reset} as context hub during development
  4. Run ${colors.bright}npx replicant sync${colors.reset} to track progress`;

  if (scaffoldResult) {
    if (scaffoldResult.doBackend) {
      nextSteps += `
  5. ${colors.bright}cd ${projectCode}-backend${colors.reset} && npm install && npm run dev`;
    }
    if (scaffoldResult.doFrontend) {
      nextSteps += `
  ${scaffoldResult.doBackend ? '6' : '5'}. ${colors.bright}cd ${projectCode}-frontend${colors.reset} && npm install && npx shadcn@latest add button sonner tooltip && npm run dev`;
    }
    if (!auth0Result?.success) {
      nextSteps += `
  ${scaffoldResult.doBackend && scaffoldResult.doFrontend ? '7' : '6'}. Configure Auth0: update ${colors.bright}.env${colors.reset} files with your tenant credentials`;
    }
  }

  if (atlasResult?.success) {
    nextSteps += `
  ${colors.green}✓ MongoDB Atlas ya configurado${colors.reset} — MONGODB_URI en .env`;
  } else if (args.atlasMode && !atlasResult?.success) {
    nextSteps += `
  ${colors.yellow}⚠ Configurar Atlas manualmente o reintentar:${colors.reset} atlas auth login`;
  }

  if (auth0Result?.success) {
    nextSteps += `
  ${colors.green}✓ Auth0 ya configurado${colors.reset} — credenciales en .env (${auth0Result.domain})`;
    nextSteps += `
  ${colors.yellow}⚠ Autorizar M2M app para Management API en Auth0 Dashboard${colors.reset}`;
  } else if (args.auth0Mode && !auth0Result?.success) {
    nextSteps += `
  ${colors.yellow}⚠ Configurar Auth0 manualmente o reintentar:${colors.reset} auth0 login --domain <tenant>.us.auth0.com`;
  }

  console.log(nextSteps);
  console.log('');
}

main().catch(console.error);
