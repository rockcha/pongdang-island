import ts from 'typescript'
import { createHash } from 'node:crypto'
import { readFileSync, readdirSync } from 'node:fs'
import { pathToFileURL } from 'node:url'

// This ratchet covers RPC placement, not the semantic correctness of query keys
// or responses. Existing exceptions are fingerprinted: editing one requires migration.
export function inspectSource(file, text) {
  const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true)
  const violations = new Map()
  function visit(node) {
    if (
      ts.isCallExpression(node) &&
      ts.isPropertyAccessExpression(node.expression) &&
      node.expression.name.text === 'rpc'
    ) {
      let parent = node.parent,
        container = node,
        managed = false,
        command = false,
        reader = false,
        cancelled = false
      while (parent && !ts.isSourceFile(parent)) {
        if (ts.isCallExpression(parent)) {
          const call = parent.expression.getText(source)
          if (['readAccountResource', 'accountOptions'].includes(call)) managed = true
          if (call === 'accountCommand') command = true
          if (
            ts.isPropertyAccessExpression(parent.expression) &&
            parent.expression.name.text === 'abortSignal'
          )
            cancelled = true
        }
        if (
          ts.isFunctionDeclaration(parent) ||
          ts.isArrowFunction(parent) ||
          ts.isFunctionExpression(parent)
        ) {
          container = parent
          if (parent.parameters.some((p) => p.type?.getText(source) === 'AbortSignal'))
            reader = true
        }
        parent = parent.parent
      }
      if (
        !file.endsWith('.tsx') &&
        (command || ((managed || reader) && cancelled))
      )
        return
      const name =
        container.name?.getText(source) ??
        (ts.isVariableDeclaration(container.parent)
          ? container.parent.name.getText(source)
          : `line-${source.getLineAndCharacterOfPosition(container.getStart(source)).line + 1}`)
      const printed = ts
        .createPrinter({ removeComments: true })
        .printNode(ts.EmitHint.Unspecified, container, source)
      const scanner = ts.createScanner(
          ts.ScriptTarget.Latest,
          true,
          ts.LanguageVariant.Standard,
          printed,
        ),
        tokens = []
      while (scanner.scan() !== ts.SyntaxKind.EndOfFileToken) tokens.push(scanner.getTokenText())
      const fingerprint = createHash('sha256').update(tokens.join('\0')).digest('hex')
      const id = `${file}#${name}`
      violations.set(id, { id, fingerprint })
    }
    ts.forEachChild(node, visit)
  }
  visit(source)
  return [...violations.values()]
}
export function inspectTree(root = 'src') {
  const result = []
  function walk(dir) {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const file = `${dir}/${entry.name}`
      if (entry.isDirectory()) walk(file)
      else if (/\.tsx?$/.test(file) && !file.endsWith('.d.ts'))
        result.push(...inspectSource(file, readFileSync(file, 'utf8')))
    }
  }
  walk(root)
  return result.sort((a, b) => a.id.localeCompare(b.id))
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const baseline = JSON.parse(
    readFileSync(new URL('./client-data-legacy.json', import.meta.url), 'utf8'),
  )
  const allowed = new Map(baseline.map((v) => [v.id, v.fingerprint]))
  const failures = inspectTree().filter((v) => allowed.get(v.id) !== v.fingerprint)
  if (failures.length) {
    console.error(
      'Unmanaged or changed legacy RPC access. Use a shared account resource / guarded command; see docs/systems/client-data.md.',
    )
    failures.forEach((v) => console.error(`  ${v.id}`))
    process.exitCode = 1
  } else console.log('Client data boundaries checked; no new or changed unmanaged RPC access.')
}
