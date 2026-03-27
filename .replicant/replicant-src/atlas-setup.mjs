#!/usr/bin/env node
/**
 * ============================================================
 *  atlas-setup.mjs — Replicant-2049
 *  Automate MongoDB Atlas setup for new projects
 * ============================================================
 *
 *  Uses the Atlas CLI (`atlas`) to:
 *    1. Detect INCBA organization (auto or explicit)
 *    2. Create Atlas project
 *    3. Create M10 cluster (AWS SA_EAST_1 10GB — matches TC/APP-PAGOS)
 *    4. Assign team roles (apps@nor-pan.com, benjamin@incba.com.ar)
 *    5. Create database user
 *    6. Whitelist access (0.0.0.0/0 for dev)
 *    7. Wait for cluster ready
 *    8. Return connection string → write to .env
 *
 *  Prerequisites:
 *    - Atlas CLI installed: winget install MongoDB.MongoDBAtlasCLI
 *    - Authenticated: atlas auth login
 *
 * ============================================================
 */

import { execSync } from 'child_process';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { randomBytes } from 'crypto';

// ─── INCBA Defaults ────────────────────────────────────────────
const INCBA_DEFAULTS = {
  orgId: '6564c09adde45a0d99799caf',   // Apps's Org (INCBA/NOR-PAN)
  provider: 'AWS',
  region: 'SA_EAST_1',                  // São Paulo — same as TC, APP-PAGOS
  tier: 'M10',                          // Production tier — same as TC, APP-PAGOS
  diskSizeGB: 10,                       // Same as existing clusters
  mdbVersion: '8.0',                    // Same as existing clusters
  // Team members to add to every new project
  teamRoles: [
    { email: 'apps@nor-pan.com',        role: 'GROUP_OWNER' },
    { email: 'benjamin@incba.com.ar',   role: 'GROUP_READ_ONLY' },
  ],
};

// ─── ANSI Colors ───────────────────────────────────────────────
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  blue: '\x1b[34m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  red: '\x1b[31m',
};

const log = {
  info: (msg) => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`),
  success: (msg) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
  warn: (msg) => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}✗${colors.reset} ${msg}`),
  title: (msg) => console.log(`\n${colors.bright}${colors.cyan}${msg}${colors.reset}\n`),
  step: (n, total, msg) => console.log(`  ${colors.dim}[${n}/${total}]${colors.reset} ${msg}`),
};

// ─── Atlas CLI wrapper ─────────────────────────────────────────

/**
 * Execute an Atlas CLI command and return parsed JSON output.
 * @param {string} cmd - Command args after "atlas"
 * @param {object} [opts] - Options
 * @param {boolean} [opts.json=true] - Parse as JSON
 * @param {boolean} [opts.silent=false] - Suppress error logging
 * @returns {any} Parsed JSON or raw stdout string
 */
function atlas(cmd, { json = true, silent = false } = {}) {
  const fullCmd = `atlas ${cmd}${json ? ' --output json' : ''}`;
  try {
    const result = execSync(fullCmd, {
      encoding: 'utf8',
      timeout: 120_000,
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    return json ? JSON.parse(result) : result.trim();
  } catch (err) {
    if (!silent) {
      const stderr = err.stderr?.toString().trim() || err.message;
      log.error(`Atlas CLI failed: ${stderr}`);
    }
    return null;
  }
}

/**
 * Check if Atlas CLI is installed and authenticated.
 * @returns {{ ok: boolean, message?: string }}
 */
export function checkAtlasReady() {
  // 1. Check CLI installed
  try {
    execSync('atlas --version', { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] });
  } catch {
    return {
      ok: false,
      message: 'Atlas CLI no está instalado.\n  Instalar: winget install MongoDB.MongoDBAtlasCLI',
    };
  }

  // 2. Check authenticated
  const orgs = atlas('orgs list', { silent: true });
  if (!orgs) {
    return {
      ok: false,
      message: 'Atlas CLI no está autenticado.\n  Ejecutar: atlas auth login',
    };
  }

  return { ok: true };
}

/**
 * Generate a secure random password for the DB user.
 * Avoids special chars that might break URIs or shell escaping.
 */
function generatePassword(length = 24) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const bytes = randomBytes(length);
  let password = '';
  for (let i = 0; i < length; i++) {
    password += chars[bytes[i] % chars.length];
  }
  return password;
}

// ─── Atlas Setup Steps ─────────────────────────────────────────

/**
 * Get the INCBA organization.
 * Priority: explicit orgId > INCBA default > detect by project presence > first org.
 */
function getOrganization(orgId) {
  const result = atlas('orgs list');
  if (!result?.results?.length) {
    log.error('No se encontraron organizaciones en Atlas.');
    return null;
  }

  // 1. Explicit org ID
  if (orgId) {
    const org = result.results.find((o) => o.id === orgId);
    if (!org) {
      log.error(`Organización con ID "${orgId}" no encontrada.`);
      return null;
    }
    log.info(`Organización: ${colors.bright}${org.name}${colors.reset} (${org.id})`);
    return org;
  }

  // 2. INCBA default org
  const incbaOrg = result.results.find((o) => o.id === INCBA_DEFAULTS.orgId);
  if (incbaOrg) {
    log.info(`Organización INCBA: ${colors.bright}${incbaOrg.name}${colors.reset} (${incbaOrg.id})`);
    return incbaOrg;
  }

  // 3. Detect org that has existing NOR-PAN projects
  for (const org of result.results) {
    const projects = atlas(`projects list --orgId ${org.id}`, { silent: true });
    if (projects?.results?.some((p) => /norpan|nor-pan|pagos|cotizador/i.test(p.name))) {
      log.info(`Organización detectada (tiene proyectos NOR-PAN): ${colors.bright}${org.name}${colors.reset} (${org.id})`);
      return org;
    }
  }

  // 4. Fallback: first org
  const org = result.results[0];
  log.info(`Organización (default): ${colors.bright}${org.name}${colors.reset} (${org.id})`);
  return org;
}

/**
 * Create an Atlas project or return existing one.
 */
function getOrCreateProject(projectName, orgId) {
  // Check if project already exists
  const projects = atlas('projects list');
  if (projects?.results) {
    const existing = projects.results.find(
      (p) => p.name.toLowerCase() === projectName.toLowerCase()
    );
    if (existing) {
      log.info(`Proyecto existente: ${colors.bright}${existing.name}${colors.reset} (${existing.id})`);
      return existing;
    }
  }

  // Create new project
  const project = atlas(`projects create "${projectName}" --orgId ${orgId}`);
  if (!project) {
    log.error(`No se pudo crear el proyecto "${projectName}".`);
    return null;
  }
  log.success(`Proyecto creado: ${colors.bright}${project.name}${colors.reset} (${project.id})`);
  return project;
}

/**
 * Create a cluster or return existing one.
 * Default: M10 / AWS / SA_EAST_1 / 10GB (matches TC, APP-PAGOS config).
 */
function getOrCreateCluster(clusterName, projectId, options = {}) {
  const {
    provider = INCBA_DEFAULTS.provider,
    region = INCBA_DEFAULTS.region,
    tier = INCBA_DEFAULTS.tier,
    diskSizeGB = INCBA_DEFAULTS.diskSizeGB,
  } = options;

  // Check existing clusters
  const clusters = atlas(`clusters list --projectId ${projectId}`);
  if (clusters?.results) {
    const existing = clusters.results.find(
      (c) => c.name.toLowerCase() === clusterName.toLowerCase()
    );
    if (existing) {
      log.info(`Cluster existente: ${colors.bright}${existing.name}${colors.reset} (${existing.stateName})`);
      return { cluster: existing, isNew: false };
    }
  }

  // Create cluster
  const tierLabel = tier === 'M0' ? 'M0 (free tier)' : `${tier} (${diskSizeGB}GB)`;
  log.info(`Creando cluster ${tierLabel}...`);
  let createCmd = `clusters create "${clusterName}" --projectId ${projectId} --provider ${provider} --region ${region} --tier ${tier}`;
  if (tier !== 'M0' && diskSizeGB) {
    createCmd += ` --diskSizeGB ${diskSizeGB}`;
  }
  const cluster = atlas(createCmd);
  if (!cluster) {
    log.error(`No se pudo crear el cluster "${clusterName}".`);
    return { cluster: null, isNew: false };
  }
  log.success(`Cluster creado: ${colors.bright}${cluster.name}${colors.reset} (${tierLabel})`);
  return { cluster, isNew: true };
}

/**
 * Wait for cluster to become IDLE (ready).
 */
function waitForCluster(clusterName, projectId, { timeoutMs = 300_000 } = {}) {
  const startTime = Date.now();
  const spinnerChars = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
  let spinIdx = 0;

  while (Date.now() - startTime < timeoutMs) {
    const cluster = atlas(`clusters describe "${clusterName}" --projectId ${projectId}`, { silent: true });
    if (cluster?.stateName === 'IDLE') {
      process.stdout.write('\r' + ' '.repeat(60) + '\r');
      log.success(`Cluster listo: ${colors.bright}${clusterName}${colors.reset}`);
      return cluster;
    }

    const elapsed = Math.round((Date.now() - startTime) / 1000);
    const state = cluster?.stateName || 'CREATING';
    process.stdout.write(
      `\r  ${spinnerChars[spinIdx % spinnerChars.length]} Esperando cluster... ${state} (${elapsed}s)`
    );
    spinIdx++;

    // Sleep 5 seconds
    execSync('ping -n 6 127.0.0.1 > nul', { stdio: 'ignore', shell: true });
  }

  process.stdout.write('\r' + ' '.repeat(60) + '\r');
  log.warn(`Timeout esperando cluster (${Math.round(timeoutMs / 1000)}s). Puede seguir creándose en background.`);
  return null;
}

/**
 * Create a database user for the project.
 */
function createDbUser(username, password, projectId) {
  // Check if user already exists
  const users = atlas(`dbusers list --projectId ${projectId}`, { silent: true });
  if (users?.results) {
    const existing = users.results.find(
      (u) => u.username.toLowerCase() === username.toLowerCase()
    );
    if (existing) {
      log.info(`DB user existente: ${colors.bright}${existing.username}${colors.reset}`);
      return { user: existing, isNew: false, password: null };
    }
  }

  const user = atlas(
    `dbusers create readWriteAnyDatabase --username "${username}" --password "${password}" --projectId ${projectId}`
  );
  if (!user) {
    log.error(`No se pudo crear el usuario "${username}".`);
    return { user: null, isNew: false, password };
  }
  log.success(`DB user creado: ${colors.bright}${user.username}${colors.reset}`);
  return { user, isNew: true, password };
}

/**
 * Set IP access list to allow connections from anywhere (for dev).
 */
function setAccessList(projectId) {
  // Check if 0.0.0.0/0 already exists
  const list = atlas(`accessLists list --projectId ${projectId}`, { silent: true });
  if (list?.results) {
    const hasOpenAccess = list.results.some((entry) => entry.cidrBlock === '0.0.0.0/0');
    if (hasOpenAccess) {
      log.info('Access list: 0.0.0.0/0 (ya configurado)');
      return true;
    }
  }

  const result = atlas(`accessLists create 0.0.0.0/0 --projectId ${projectId} --comment "Replicant dev access"`, { json: false, silent: false });
  if (result === null) {
    log.warn('No se pudo configurar el access list. Configurar manualmente en Atlas UI.');
    return false;
  }
  log.success('Access list: 0.0.0.0/0 (acceso abierto para dev)');
  return true;
}

/**
 * Assign team members to a project with their standard roles.
 * Uses project invitations (works for existing org members too).
 */
function assignTeamRoles(projectId, teamRoles = INCBA_DEFAULTS.teamRoles) {
  for (const { email, role } of teamRoles) {
    // Check if user already has access to this project
    const users = atlas(`projects users list --projectId ${projectId}`, { silent: true });
    const alreadyMember = users?.results?.some(
      (u) => u.emailAddress?.toLowerCase() === email.toLowerCase()
    );

    if (alreadyMember) {
      log.info(`${email} ya tiene acceso al proyecto`);
      continue;
    }

    // Invite user to project with role
    const result = atlas(
      `projects invitations invite "${email}" --projectId ${projectId} --role ${role}`,
      { json: false, silent: true }
    );
    if (result !== null) {
      log.success(`${email} → ${role}`);
    } else {
      log.warn(`No se pudo asignar ${email} al proyecto. Agregar manualmente en Atlas UI.`);
    }
  }
}

/**
 * Get the connection string for a cluster.
 */
function getConnectionString(clusterName, projectId) {
  const cluster = atlas(`clusters describe "${clusterName}" --projectId ${projectId}`);
  if (!cluster?.connectionStrings?.standardSrv) {
    log.warn('No se pudo obtener el connection string. El cluster puede no estar listo.');
    return null;
  }
  return cluster.connectionStrings.standardSrv;
}

// ─── Main Setup Orchestrator ───────────────────────────────────

/**
 * Full Atlas setup for a project.
 *
 * @param {object} config
 * @param {string} config.projectName - Atlas project name (e.g., "TC")
 * @param {string} config.dbName - Database name (e.g., "tc_db")
 * @param {string} [config.orgId] - Atlas org ID (default: INCBA org)
 * @param {string} [config.provider] - Cloud provider (default: AWS)
 * @param {string} [config.region] - Region (default: SA_EAST_1)
 * @param {string} [config.tier] - Cluster tier (default: M10)
 * @param {string} [config.clusterName] - Cluster name (default: projectName-cluster)
 * @param {string} [config.backendDir] - Path to backend dir (to write .env)
 * @returns {{ success: boolean, connectionString?: string, password?: string }}
 */
export async function setupAtlas(config) {
  const {
    projectName,
    dbName,
    orgId,
    provider = INCBA_DEFAULTS.provider,
    region = INCBA_DEFAULTS.region,
    tier = INCBA_DEFAULTS.tier,
    clusterName: customClusterName,
    backendDir,
  } = config;

  const TOTAL_STEPS = 7;
  const clusterName = customClusterName || `${projectName.toLowerCase().replace(/[^a-z0-9]/g, '')}-cluster`;
  const dbUsername = `${projectName.toLowerCase().replace(/[^a-z0-9]/g, '')}_app`;
  const dbPassword = generatePassword();

  log.title('🍃 MongoDB Atlas — Configuración automática');

  // Step 1: Organization
  log.step(1, TOTAL_STEPS, 'Detectando organización...');
  const org = getOrganization(orgId);
  if (!org) return { success: false };

  // Step 2: Project
  log.step(2, TOTAL_STEPS, 'Configurando proyecto...');
  const project = getOrCreateProject(projectName, org.id);
  if (!project) return { success: false };

  // Step 3: Cluster
  log.step(3, TOTAL_STEPS, 'Configurando cluster...');
  const { cluster, isNew: isNewCluster } = getOrCreateCluster(clusterName, project.id, { provider, region, tier });
  if (!cluster) return { success: false };

  // Step 4: Team Roles
  log.step(4, TOTAL_STEPS, 'Asignando equipo al proyecto...');
  assignTeamRoles(project.id);

  // Step 5: DB User
  log.step(5, TOTAL_STEPS, 'Configurando usuario de BD...');
  const { user, isNew: isNewUser, password } = createDbUser(dbUsername, dbPassword, project.id);
  if (!user) return { success: false };

  // Step 6: Access List
  log.step(6, TOTAL_STEPS, 'Configurando access list...');
  setAccessList(project.id);

  // Step 7: Connection String
  log.step(7, TOTAL_STEPS, 'Obteniendo connection string...');

  // If cluster is new, wait for it to be ready
  if (isNewCluster) {
    log.info(`El cluster ${tier} tarda ~1-5 minutos en estar listo...`);
    const readyCluster = waitForCluster(clusterName, project.id);
    if (!readyCluster) {
      // Cluster is still deploying — build connection string from convention
      const conventionalUri = `mongodb+srv://${dbUsername}:${isNewUser ? dbPassword : '<TU_PASSWORD>'}@${clusterName}.mongodb.net/${dbName}?retryWrites=true&w=majority`;
      log.warn('Connection string estimado (verificar cuando el cluster esté listo):');
      log.info(conventionalUri);

      if (backendDir) {
        updateEnvFile(backendDir, conventionalUri);
      }

      return {
        success: true,
        connectionString: conventionalUri,
        password: isNewUser ? dbPassword : null,
        estimated: true,
      };
    }
  }

  const srvBase = getConnectionString(clusterName, project.id);
  if (!srvBase) {
    return { success: false };
  }

  // Build full URI: mongodb+srv://user:pass@host/dbName?retryWrites=true&w=majority
  const srvHost = srvBase.replace('mongodb+srv://', '');
  const actualPassword = isNewUser ? dbPassword : '<TU_PASSWORD>';
  const connectionString = `mongodb+srv://${dbUsername}:${actualPassword}@${srvHost}/${dbName}?retryWrites=true&w=majority`;

  log.success(`Connection string obtenido.`);

  // Write to .env if backendDir provided
  if (backendDir) {
    updateEnvFile(backendDir, connectionString);
  }

  // Summary
  log.title('🍃 Atlas configurado correctamente');
  console.log(`  Organización: ${org.name}`);
  console.log(`  Proyecto:     ${project.name}`);
  console.log(`  Cluster:      ${clusterName} (${tier})`);
  console.log(`  Usuario BD:   ${dbUsername}`);
  console.log(`  Equipo:       apps@nor-pan.com (GROUP_OWNER), benjamin@incba.com.ar (GROUP_READ_ONLY)`);
  if (isNewUser) {
    console.log(`  Password:     ${dbPassword}`);
    console.log(`  ${colors.yellow}⚠ Guardar la password — no se puede recuperar después.${colors.reset}`);
  }
  console.log(`  MONGODB_URI:  ${connectionString.replace(actualPassword, '****')}`);
  console.log('');

  return {
    success: true,
    connectionString,
    password: isNewUser ? dbPassword : null,
    projectId: project.id,
    clusterName,
    dbUsername,
  };
}

/**
 * Update or create .env file with MONGODB_URI.
 */
function updateEnvFile(backendDir, connectionString) {
  const envPath = join(backendDir, '.env');
  const envExamplePath = join(backendDir, '.env.example');

  if (existsSync(envPath)) {
    // Update existing .env
    let content = readFileSync(envPath, 'utf8');
    if (content.includes('MONGODB_URI=')) {
      content = content.replace(
        /MONGODB_URI=.*/,
        `MONGODB_URI=${connectionString}`
      );
    } else {
      content += `\nMONGODB_URI=${connectionString}\n`;
    }
    writeFileSync(envPath, content, 'utf8');
    log.success(`Actualizado: ${envPath}`);
  } else if (existsSync(envExamplePath)) {
    // Create .env from .env.example with the real URI
    let content = readFileSync(envExamplePath, 'utf8');
    content = content.replace(
      /MONGODB_URI=.*/,
      `MONGODB_URI=${connectionString}`
    );
    writeFileSync(envPath, content, 'utf8');
    log.success(`Creado: ${envPath} (con MONGODB_URI de Atlas)`);
  } else {
    // Create minimal .env
    writeFileSync(envPath, `MONGODB_URI=${connectionString}\n`, 'utf8');
    log.success(`Creado: ${envPath}`);
  }
}
