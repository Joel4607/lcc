import { useCallback, useEffect, useMemo, useState } from "react"

import {
  demoData,
  emptyLccData,
  generateId,
  type LccData,
  type LccTable,
  type Profile,
} from "~/lib/domain"
import { isSupabaseConfigured, supabase } from "~/lib/supabase"

type DataState = {
  data: LccData
  loading: boolean
  error: string | null
  demoMode: boolean
}

const tableNames: LccTable[] = [
  "branches",
  "ekklesias",
  "buscells",
  "profiles",
  "members",
  "record_weeks",
  "buscell_records",
  "attendance_records",
  "finance_records",
]

const sortByTable: Partial<Record<LccTable, { column: string; ascending?: boolean }>> = {
  branches: { column: "name", ascending: true },
  ekklesias: { column: "name", ascending: true },
  buscells: { column: "name", ascending: true },
  profiles: { column: "name", ascending: true },
  members: { column: "full_name", ascending: true },
  record_weeks: { column: "start_date", ascending: false },
  buscell_records: { column: "created_at", ascending: false },
  attendance_records: { column: "date", ascending: false },
  finance_records: { column: "transaction_date", ascending: false },
}

export function useLccData(profile: Profile | null, forceDemo = false) {
  const [state, setState] = useState<DataState>({
    data: forceDemo ? demoData : emptyLccData,
    loading: false,
    error: null,
    demoMode: forceDemo,
  })

  const loadData = useCallback(async () => {
    if (!profile) return

    if (forceDemo || !isSupabaseConfigured) {
      setState({ data: demoData, loading: false, error: null, demoMode: true })
      return
    }

    setState((current) => ({ ...current, loading: true, error: null, demoMode: false }))

    try {
      const entries = await Promise.all(
        tableNames.map(async (table) => {
          const sort = sortByTable[table]
          let query = supabase.from(table).select("*")

          if (sort) {
            query = query.order(sort.column, { ascending: sort.ascending ?? true })
          }

          const { data, error } = await query

          if (error) {
            throw new Error(error.message)
          }

          return [table, data || []] as const
        })
      )

      setState({
        data: Object.fromEntries(entries) as LccData,
        loading: false,
        error: null,
        demoMode: false,
      })
    } catch (error) {
      setState({
        data: demoData,
        loading: false,
        error: error instanceof Error ? error.message : "Unable to load Supabase data.",
        demoMode: true,
      })
    }
  }, [forceDemo, profile])

  useEffect(() => {
    void loadData()
  }, [loadData])

  const createRecord = useCallback(
    async (table: LccTable, payload: Record<string, unknown>) => {
      if (state.demoMode) {
        setState((current) => ({
          ...current,
          data: {
            ...current.data,
            [table]: [{ id: generateId(table), ...payload }, ...current.data[table]],
          },
        }))
        return
      }

      const { error } = await supabase.from(table).insert(payload)
      if (error) throw new Error(error.message)
      await loadData()
    },
    [loadData, state.demoMode]
  )

  const updateRecord = useCallback(
    async (table: LccTable, id: string, payload: Record<string, unknown>) => {
      if (state.demoMode) {
        setState((current) => ({
          ...current,
          data: {
            ...current.data,
            [table]: current.data[table].map((record: { id: string }) =>
              record.id === id ? { ...record, ...payload } : record
            ),
          },
        }))
        return
      }

      const { error } = await supabase.from(table).update(payload).eq("id", id)
      if (error) throw new Error(error.message)
      await loadData()
    },
    [loadData, state.demoMode]
  )

  const deleteRecord = useCallback(
    async (table: LccTable, id: string) => {
      if (state.demoMode) {
        setState((current) => ({
          ...current,
          data: {
            ...current.data,
            [table]: current.data[table].filter((record: { id: string }) => record.id !== id),
          },
        }))
        return
      }

      const { error } = await supabase.from(table).delete().eq("id", id)
      if (error) throw new Error(error.message)
      await loadData()
    },
    [loadData, state.demoMode]
  )

  return useMemo(
    () => ({
      ...state,
      reload: loadData,
      createRecord,
      updateRecord,
      deleteRecord,
    }),
    [createRecord, deleteRecord, loadData, state, updateRecord]
  )
}
