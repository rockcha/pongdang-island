import { useCallback, useEffect, useMemo, useRef, useState, type SetStateAction } from 'react'
import { randomId } from '@/lib/random-id'
import {
  islandDocument,
  islandError,
  definitiveIslandError,
  type IslandDocument,
  type IslandSnapshot,
  type IslandSaveResult,
} from './api'
import { materializeIsland } from './island-document'
import type { IslandState } from './island-model'
export type IslandPersistence = {
  snapshot: IslandSnapshot
  save: (document: IslandDocument, revision: number, id: string) => Promise<IslandSaveResult>
  reload: () => Promise<IslandSnapshot | undefined>
}
export function useIslandDraft(account: IslandPersistence | undefined, initial: () => IslandState) {
  const snapshot = account?.snapshot,
    save = account?.save,
    enabled = Boolean(account)
  const [legacy, setLegacy] = useState(() => (account ? null : initial())),
    [draft, setDraft] = useState<IslandDocument | null>(null),
    [saving, setSaving] = useState(false),
    [error, setError] = useState('')
  const active = useRef(true),
    draftRef = useRef<IslandDocument | null>(null),
    revision = useRef(account?.snapshot.revision ?? 0),
    pending = useRef<{ document: IslandDocument; revision: number; id: string } | null>(null),
    running = useRef<Promise<void> | null>(null),
    failure = useRef(false)
  const local = useMemo(
    () => (snapshot ? materializeIsland(snapshot, draft) : legacy!),
    [snapshot, draft, legacy],
  )
  const localRef = useRef(local)
  useEffect(() => {
    localRef.current = local
  }, [local])
  useEffect(() => {
    active.current = true
    return () => {
      active.current = false
    }
  }, [])
  useEffect(() => {
    if (!snapshot || snapshot.revision === revision.current || running.current) return
    if (draftRef.current) {
      failure.current = true
      setError(islandError(new Error('ISLAND_REVISION_CHANGED')))
    } else revision.current = snapshot.revision
  }, [snapshot])
  const setLocal = useCallback(
    (action: SetStateAction<IslandState>) => {
      if (!enabled) {
        setLegacy((previous) => (typeof action === 'function' ? action(previous!) : action))
        return
      }
      const next = typeof action === 'function' ? action(localRef.current) : action
      const document = islandDocument(next)
      draftRef.current = document
      localRef.current = next
      setDraft(document)
    },
    [enabled],
  )
  const flush = useCallback(async () => {
    if (!save) return
    if (running.current) return running.current
    if (!draftRef.current || !active.current) return
    const work = async () => {
      failure.current = false
      setError('')
      setSaving(true)
      try {
        while (active.current && draftRef.current) {
          pending.current ??= {
            document: draftRef.current,
            revision: revision.current,
            id: randomId(),
          }
          const request = pending.current,
            result = await save(request.document, request.revision, request.id)
          if (!active.current) return
          if (result.receipt.revision !== result.island.revision)
            throw new Error('ISLAND_REVISION_CHANGED')
          revision.current = result.island.revision
          pending.current = null
          if (draftRef.current === request.document) {
            draftRef.current = null
            setDraft(null)
          }
        }
      } catch (cause) {
        if (active.current) {
          failure.current = true
          setError(islandError(cause))
        }
        if (definitiveIslandError(cause)) pending.current = null
        throw cause
      } finally {
        running.current = null
        if (active.current) setSaving(false)
      }
    }
    running.current = work()
    return running.current
  }, [save])
  useEffect(() => {
    if (!enabled || !draft || failure.current) return
    const timer = setTimeout(() => {
      if (!failure.current) void flush().catch(() => {})
    }, 650)
    return () => clearTimeout(timer)
  }, [draft, flush, enabled])
  useEffect(() => {
    if (!enabled) return
    const leave = (event: BeforeUnloadEvent) => {
      if (draftRef.current) {
        event.preventDefault()
        event.returnValue = ''
      }
    }
    window.addEventListener('beforeunload', leave)
    return () => window.removeEventListener('beforeunload', leave)
  }, [enabled])
  const reload = async () => {
    const result = await account?.reload()
    if (result && active.current) {
      revision.current = result.revision
      pending.current = null
      draftRef.current = null
      failure.current = false
      setDraft(null)
      setError('')
    }
  }
  return { local, setLocal, flush, reload, saving, error, dirty: !!draft }
}
