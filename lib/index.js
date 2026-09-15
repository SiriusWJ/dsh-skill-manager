import { randomBytes } from 'node:crypto'
import { existsSync } from 'node:fs'
import { chmod, readFile, readdir, realpath, rename, stat, unlink, writeFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import { basename, dirname, join, resolve } from 'node:path'
import Schema from '@deepseek-ai/schemastery'

export const name = 'dsh-skill-manager'
export const inject = ['settings', 'webServer']
export const Config = Schema.object({})

const SETTINGS_NAMESPACE = 'skill-manager'
const ROUTES = {
  list: '/api/dsh-skill-manager/list',
  setEnabled: '/api/dsh-skill-manager/set-enabled',
}
const NAME_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const SOURCE_ORDER = new Map([
  ['project-dsh', 0],
  ['project-agents', 1],
  ['user-dsh', 2],
  ['user-agents', 3],
])

function dshHome() {
  return process.env.DSH_HOME || join(homedir(), '.dsh')
}

function agentsHome() {
  return process.env.DSH_AGENTS_HOME || join(homedir(), '.agents')
}

function parseYamlBoolean(value) {
  const text = String(value).trim().toLowerCase()
  if (['true', 'yes', 'on', '1'].includes(text)) return true
  if (['false', 'no', 'off', '0'].includes(text)) return false
  return undefined
}

function unquote(value) {
  if (value.length < 2) return value
  if (value.startsWith("'") && value.endsWith("'")) return value.slice(1, -1).replace(/''/g, "'")
  if (value.startsWith('"') && value.endsWith('"')) return value.slice(1, -1)
  return value
}

function parseFrontmatter(content) {
  const match = /^\uFEFF?---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/.exec(content)
  if (match === null) return {}
  const lines = match[1].split(/\r?\n/)
  const result = {}
  for (let index = 0; index < lines.length; index += 1) {
    const pair = /^([A-Za-z][\w-]*):\s*(.*)$/.exec(lines[index])
    if (pair === null) continue
    const key = pair[1]
    const raw = pair[2].trim()
    if (/^[|>][-+]?$/.test(raw)) {
      const parts = []
      for (let next = index + 1; next < lines.length; next += 1) {
        if (lines[next] !== '' && !/^\s/.test(lines[next])) break
        parts.push(lines[next].trim())
      }
      const value = parts.join(' ').trim()
      if (key === 'description') result.description = value
      if (key === 'whenToUse' || key === 'when-to-use') result.whenToUse = value
      continue
    }
    const value = unquote(raw)
    if (key === 'name') result.name = value
    if (key === 'description') result.description = value
    if (key === 'whenToUse' || key === 'when-to-use') result.whenToUse = value
    if (key === 'disable-model-invocation') {
      result.disableModelInvocation = parseYamlBoolean(value)
      if (result.disableModelInvocation === undefined) result.invalidInvocationPolicy = true
    }
    if (key === 'user-invocable') {
      result.userInvocable = parseYamlBoolean(value)
      if (result.userInvocable === undefined) result.invalidInvocationPolicy = true
    }
  }
  return result
}

function findProjectRoot(cwd) {
  const fallback = resolve(cwd)
  let current = fallback
  for (;;) {
    if (existsSync(join(current, '.git'))) return current
    const parent = dirname(current)
    if (parent === current) return fallback
    current = parent
  }
}

async function activeSessionCwds(ctx) {
  try {
    const sessions = ctx.get('sessions')
    if (sessions === undefined || typeof sessions.list !== 'function') return []
    const list = await Promise.resolve(sessions.list())
    if (!Array.isArray(list)) return []
    return list
      .map((session) => session && session.header && session.header.cwd)
      .filter((cwd) => typeof cwd === 'string' && cwd.trim() !== '')
  } catch {
    return []
  }
}

function rootKey(source, root) {
  const path = process.platform === 'win32' ? root.toLowerCase() : root
  return source + ':' + path
}

async function skillRoots(ctx) {
  const roots = []
  const seen = new Set()
  const add = (source, root, workspace, active = false) => {
    const key = rootKey(source, root)
    if (seen.has(key)) return
    seen.add(key)
    roots.push({ source, root, workspace, active })
  }
  const cwdList = await activeSessionCwds(ctx)
  if (cwdList.length === 0) cwdList.push(process.cwd())
  const activeProject = findProjectRoot(cwdList[0])
  for (const cwd of cwdList) {
    const project = findProjectRoot(cwd)
    const workspace = basename(project) || project
    const active = project === activeProject
    add('project-dsh', join(project, '.dsh', 'skills'), workspace, active)
    add('project-agents', join(project, '.agents', 'skills'), workspace, active)
  }
  add('user-dsh', join(dshHome(), 'skills'))
  add('user-agents', join(agentsHome(), 'skills'))
  return roots
}

async function scanSkillRoot(rootInfo) {
  let entries
  try {
    entries = await readdir(rootInfo.root, { withFileTypes: true })
  } catch {
    return []
  }
  entries.sort((left, right) => left.name.localeCompare(right.name))
  const skills = []
  for (const entry of entries) {
    if (entry.name.startsWith('.')) continue
    let file
    let linked = false
    try {
      if (entry.isDirectory()) {
        file = join(rootInfo.root, entry.name, 'SKILL.md')
      } else if (entry.isFile() && entry.name.endsWith('.md')) {
        file = join(rootInfo.root, entry.name)
      } else if (entry.isSymbolicLink()) {
        linked = true
        const target = await stat(join(rootInfo.root, entry.name))
        if (target.isDirectory()) file = join(rootInfo.root, entry.name, 'SKILL.md')
        else if (target.isFile() && entry.name.endsWith('.md')) file = join(rootInfo.root, entry.name)
        else continue
      } else {
        continue
      }
      const content = await readFile(file, 'utf8')
      const frontmatter = parseFrontmatter(content)
      const skillName = frontmatter.name || entry.name.replace(/\.md$/i, '')
      if (!NAME_PATTERN.test(skillName) || frontmatter.invalidInvocationPolicy === true || typeof frontmatter.description !== 'string' || frontmatter.description.trim() === '') continue
      skills.push({
        name: skillName,
        description: frontmatter.description.trim(),
        whenToUse: frontmatter.whenToUse,
        enabled: frontmatter.disableModelInvocation !== true,
        userInvocable: frontmatter.userInvocable !== false,
        source: rootInfo.source,
        workspace: rootInfo.workspace,
        activeWorkspace: rootInfo.active === true,
        path: file,
        linked,
      })
    } catch {
      // A broken or unreadable bundle is not a manageable local skill.
    }
  }
  return skills
}

function selectEffectiveSkills(skills) {
  const winners = new Map()
  for (const skill of skills) {
    const current = winners.get(skill.name)
    if (current === undefined) {
      winners.set(skill.name, skill)
      continue
    }
    const priority = SOURCE_ORDER.get(skill.source) ?? 99
    const currentPriority = SOURCE_ORDER.get(current.source) ?? 99
    if (priority < currentPriority || (priority === currentPriority && skill.activeWorkspace && !current.activeWorkspace)) {
      winners.set(skill.name, skill)
    }
  }
  return [...winners.values()].sort((left, right) => {
    const source = (SOURCE_ORDER.get(left.source) ?? 99) - (SOURCE_ORDER.get(right.source) ?? 99)
    return source || left.name.localeCompare(right.name) || left.path.localeCompare(right.path)
  })
}

async function collectLocalSkills(ctx) {
  const roots = await skillRoots(ctx)
  const batches = await Promise.all(roots.map(scanSkillRoot))
  return selectEffectiveSkills(batches.flat())
}

async function atomicWrite(file, content) {
  const target = await realpath(file)
  const info = await stat(target)
  const temp = target + '.' + Date.now().toString(36) + '.' + randomBytes(6).toString('hex') + '.tmp'
  try {
    await writeFile(temp, content, { encoding: 'utf8', flag: 'wx', mode: info.mode })
    await chmod(temp, info.mode)
    await rename(temp, target)
  } catch (error) {
    try { await unlink(temp) } catch {}
    throw error
  }
}

async function setModelInvocation(file, enabled) {
  const content = await readFile(file, 'utf8')
  const match = /^(\uFEFF?---\r?\n)([\s\S]*?)(\r?\n---)([\s\S]*)$/.exec(content)
  if (match === null) throw new Error('技能文件缺少 YAML frontmatter')
  const newline = content.includes('\r\n') ? '\r\n' : '\n'
  const lines = match[2].split(/\r?\n/)
  const next = []
  let replaced = false
  for (const line of lines) {
    if (/^disable-model-invocation\s*:/.test(line)) {
      if (!replaced) next.push('disable-model-invocation: ' + String(!enabled))
      replaced = true
    } else {
      next.push(line)
    }
  }
  if (!replaced) next.push('disable-model-invocation: ' + String(!enabled))
  const rewritten = match[1] + next.join(newline) + match[3] + match[4]
  await atomicWrite(file, rewritten)
  return parseFrontmatter(rewritten).disableModelInvocation !== true
}

function normalizedPath(path) {
  const value = resolve(path)
  return process.platform === 'win32' ? value.toLowerCase() : value
}

async function resolveMutationSkill(ctx, name, expectedPath) {
  const skills = await collectLocalSkills(ctx)
  const expected = normalizedPath(expectedPath)
  return skills.find((skill) => skill.name === name && normalizedPath(skill.path) === expected)
}

function isLoopbackAddress(address) {
  return address === '127.0.0.1' || address === '::1' || (typeof address === 'string' && address.startsWith('::ffff:127.'))
}

function sameOrigin(request) {
  const origin = request.headers.origin
  const host = request.headers.host
  if (typeof origin !== 'string' || typeof host !== 'string') return false
  try {
    return new URL(origin).host === host
  } catch {
    return false
  }
}

async function readJsonBody(request, maxBytes = 16 * 1024) {
  const chunks = []
  let size = 0
  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)
    size += buffer.length
    if (size > maxBytes) throw new Error('请求体过大')
    chunks.push(buffer)
  }
  if (chunks.length === 0) throw new Error('请求体为空')
  const value = JSON.parse(Buffer.concat(chunks).toString('utf8'))
  if (value === null || typeof value !== 'object' || Array.isArray(value)) throw new Error('请求体必须是 JSON 对象')
  return value
}

function sendJson(response, status, body) {
  response.writeHead(status, {
    'cache-control': 'no-store',
    'content-type': 'application/json; charset=utf-8',
    'referrer-policy': 'no-referrer',
  })
  response.end(JSON.stringify(body))
}

function guard(request, response, method) {
  if (!isLoopbackAddress(request.socket && request.socket.remoteAddress)) {
    sendJson(response, 403, { error: '仅允许本机访问' })
    return false
  }
  if (request.method !== method) {
    response.writeHead(405, { allow: method })
    response.end()
    return false
  }
  if (method === 'POST' && !sameOrigin(request)) {
    sendJson(response, 403, { error: '跨来源请求已拒绝' })
    return false
  }
  return true
}

export function apply(ctx) {
  ctx.settings.register(SETTINGS_NAMESPACE, Config)

  ctx.effect(() => {
    const disposeList = ctx.webServer.register({
      kind: 'exact',
      path: ROUTES.list,
      handler: async (request, response) => {
        if (!guard(request, response, 'GET')) return
        try {
          const skills = await collectLocalSkills(ctx)
          sendJson(response, 200, {
            skills,
            enabled: skills.filter((skill) => skill.enabled).length,
            total: skills.length,
          })
        } catch (error) {
          ctx.logger.warn(error)
          sendJson(response, 500, { error: error instanceof Error ? error.message : String(error) })
        }
      },
    })
    const disposeSetEnabled = ctx.webServer.register({
      kind: 'exact',
      path: ROUTES.setEnabled,
      handler: async (request, response) => {
        if (!guard(request, response, 'POST')) return
        let body
        try {
          body = await readJsonBody(request)
        } catch (error) {
          sendJson(response, 400, { error: error instanceof Error ? error.message : String(error) })
          return
        }
        if (typeof body.name !== 'string' || !NAME_PATTERN.test(body.name) || typeof body.path !== 'string' || typeof body.enabled !== 'boolean') {
          sendJson(response, 400, { error: '需要 { name, path, enabled }' })
          return
        }
        try {
          const skill = await resolveMutationSkill(ctx, body.name, body.path)
          if (skill === undefined) {
            sendJson(response, 409, { error: '技能已变化，请刷新后重试' })
            return
          }
          const enabled = await setModelInvocation(skill.path, body.enabled)
          sendJson(response, 200, { ok: true, name: skill.name, path: skill.path, enabled })
        } catch (error) {
          ctx.logger.warn(error)
          sendJson(response, 500, { error: error instanceof Error ? error.message : String(error) })
        }
      },
    })
    return () => {
      disposeSetEnabled()
      disposeList()
    }
  }, 'dsh-skill-manager: routes')
}

export const __test = {
  collectLocalSkills,
  findProjectRoot,
  isLoopbackAddress,
  parseFrontmatter,
  parseYamlBoolean,
  scanSkillRoot,
  selectEffectiveSkills,
  setModelInvocation,
}
