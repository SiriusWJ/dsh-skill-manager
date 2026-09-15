import assert from 'node:assert/strict'
import { mkdtemp, mkdir, readFile, rm, symlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import { __test } from '../lib/index.js'

test('parses block descriptions and invocation booleans', () => {
  const parsed = __test.parseFrontmatter(`---\nname: sample-skill\ndescription: >\n  First line.\n  Second line.\ndisable-model-invocation: yes\nuser-invocable: off\n---\n# Body\n`)
  assert.equal(parsed.name, 'sample-skill')
  assert.equal(parsed.description, 'First line. Second line.')
  assert.equal(parsed.disableModelInvocation, true)
  assert.equal(parsed.userInvocable, false)
  assert.equal(__test.parseFrontmatter('---\nname: bad\ndescription: Bad\ndisable-model-invocation: maybe\n---\n').invalidInvocationPolicy, true)
})

test('rewrites the model invocation flag without changing the body', async () => {
  const root = await mkdtemp(join(tmpdir(), 'dsh-skill-manager-'))
  const file = join(root, 'SKILL.md')
  try {
    await writeFile(file, '---\r\nname: demo\r\ndescription: Demo\r\n---\r\n# Keep me\r\n', 'utf8')
    assert.equal(await __test.setModelInvocation(file, false), false)
    let content = await readFile(file, 'utf8')
    assert.match(content, /disable-model-invocation: true/)
    assert.match(content, /# Keep me\r\n$/)
    assert.equal(await __test.setModelInvocation(file, true), true)
    content = await readFile(file, 'utf8')
    assert.equal((content.match(/disable-model-invocation:/g) || []).length, 1)
    assert.match(content, /disable-model-invocation: false/)
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})

test('scans directory and flat-file skill bundles', async () => {
  const root = await mkdtemp(join(tmpdir(), 'dsh-skill-manager-'))
  try {
    await mkdir(join(root, 'alpha'))
    await writeFile(join(root, 'alpha', 'SKILL.md'), '---\nname: alpha\ndescription: Alpha skill\n---\n', 'utf8')
    await writeFile(join(root, 'beta.md'), '---\nname: beta\ndescription: Beta skill\ndisable-model-invocation: true\n---\n', 'utf8')
    await writeFile(join(root, 'invalid.md'), '# no frontmatter\n', 'utf8')
    await writeFile(join(root, 'bad-policy.md'), '---\nname: bad-policy\ndescription: Bad policy\ndisable-model-invocation: maybe\n---\n', 'utf8')
    const skills = await __test.scanSkillRoot({ source: 'user-dsh', root })
    assert.deepEqual(skills.map((skill) => [skill.name, skill.enabled]).sort(), [['alpha', true], ['beta', false]])
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})

test('keeps only the effective same-name skill by DSH precedence', () => {
  const winner = __test.selectEffectiveSkills([
    { name: 'same', source: 'user-dsh', activeWorkspace: false, path: '/user' },
    { name: 'same', source: 'project-dsh', activeWorkspace: false, path: '/other-project' },
    { name: 'same', source: 'project-dsh', activeWorkspace: true, path: '/active-project' },
    { name: 'other', source: 'user-agents', activeWorkspace: false, path: '/other' },
  ])
  assert.equal(winner.find((skill) => skill.name === 'same').path, '/active-project')
  assert.equal(winner.length, 2)
})

test('follows a linked skill directory and rewrites its real target', async (t) => {
  const root = await mkdtemp(join(tmpdir(), 'dsh-skill-manager-root-'))
  const target = await mkdtemp(join(tmpdir(), 'dsh-skill-manager-target-'))
  try {
    await writeFile(join(target, 'SKILL.md'), '---\nname: linked-skill\ndescription: Linked skill\n---\n', 'utf8')
    try {
      await symlink(target, join(root, 'linked-skill'), process.platform === 'win32' ? 'junction' : 'dir')
    } catch (error) {
      if (error && (error.code === 'EPERM' || error.code === 'EACCES')) {
        t.skip('symbolic links are unavailable in this environment')
        return
      }
      throw error
    }
    const skills = await __test.scanSkillRoot({ source: 'user-dsh', root })
    assert.equal(skills.length, 1)
    assert.equal(skills[0].linked, true)
    await __test.setModelInvocation(skills[0].path, false)
    assert.match(await readFile(join(target, 'SKILL.md'), 'utf8'), /disable-model-invocation: true/)
  } finally {
    await rm(root, { recursive: true, force: true })
    await rm(target, { recursive: true, force: true })
  }
})

test('client and package target the plugin configuration card slot', async () => {
  const client = await readFile(new URL('../client/client.js', import.meta.url), 'utf8')
  const pkg = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'))
  assert.match(client, /slots\.inject\("settings\.plugin\.item"/)
  assert.match(client, /key: "skill-manager"/)
  assert.deepEqual(pkg.dsh.client.inject, ['@deepseek-ai/dsh-client-ui-settings-plugins'])
})

test('accepts only loopback peer addresses', () => {
  assert.equal(__test.isLoopbackAddress('127.0.0.1'), true)
  assert.equal(__test.isLoopbackAddress('::1'), true)
  assert.equal(__test.isLoopbackAddress('::ffff:127.0.0.1'), true)
  assert.equal(__test.isLoopbackAddress('192.168.1.10'), false)
})

test('mounts one settings namespace and two disposable routes', async () => {
  const plugin = await import('../lib/index.js')
  const namespaces = []
  const routes = []
  const disposed = []
  const ctx = {
    settings: { register(namespace) { namespaces.push(namespace) } },
    webServer: {
      register(route) {
        routes.push(route)
        return () => disposed.push(route.path)
      },
    },
    effect(factory) { this.dispose = factory() },
    get() { return undefined },
    logger: { warn() {} },
  }
  plugin.apply(ctx)
  assert.deepEqual(namespaces, ['skill-manager'])
  assert.deepEqual(routes.map((route) => route.path), ['/api/dsh-skill-manager/list', '/api/dsh-skill-manager/set-enabled'])
  ctx.dispose()
  assert.deepEqual(disposed, ['/api/dsh-skill-manager/set-enabled', '/api/dsh-skill-manager/list'])
})
