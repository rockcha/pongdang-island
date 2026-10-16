import { canonical } from './local.mjs'

export function parseExport(value) {
  let remote = value
  if (Array.isArray(remote)) {
    if (remote.length !== 1) throw new Error('Expected exactly one exported snapshot row')
    remote = remote[0]?.snapshot
  } else if (remote?.snapshot) remote = remote.snapshot
  if (typeof remote === 'string') remote = JSON.parse(remote)
  if (!remote?.capturedAt || Number.isNaN(Date.parse(remote.capturedAt)) || !remote?.database || remote.structure?.formatVersion !== 1) throw new Error('Expected JSON export from supabase/inspection/schema.sql')
  return remote
}

export function differences(expected, actual, path = '') {
  if (canonical(expected) === canonical(actual)) return []
  if (Array.isArray(expected) || Array.isArray(actual) || !expected || !actual || typeof expected !== 'object' || typeof actual !== 'object') return [path || '(root)']
  return [...new Set([...Object.keys(expected), ...Object.keys(actual)])].flatMap(key => differences(expected[key], actual[key], path ? `${path}.${key}` : key))
}
