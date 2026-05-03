// pages/reports.tsx
import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import DashboardLayout from '../components/layout/DashboardLayout'
import { withAuth } from '../lib/withAuth'
import { useAuth } from '../contexts/AuthContext'
import { EmptyState, Spinner } from '../components/ui'
import { getUserReports, deleteReport } from '../services/firestore'
import { FiFileText, FiTrash2, FiDownload, FiEye } from 'react-icons/fi'
import toast from 'react-hot-toast'
import { format } from 'date-fns'

function ReportsPage() {
  const { user } = useAuth()
  const [reports, setReports] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<any>(null)

  useEffect(() => {
    if (user) load()
  }, [user])

  const load = async () => {
    if (!user) return
    setLoading(true)
    try {
      const data = await getUserReports(user.uid)
      setReports(data)
    } finally { setLoading(false) }
  }

  const remove = async (id: string) => {
    if (!user) return
    await deleteReport(user.uid, id)
    setReports(prev => prev.filter(r => r.id !== id))
    if (selected?.id === id) setSelected(null)
    toast.success('Report deleted')
  }

  const downloadJSON = (report: any) => {
    const blob = new Blob([JSON.stringify(report.data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `${report.title}.json`; a.click()
  }

  const TYPE_ICONS: Record<string, string> = {
    seo: '🔬', keyword: '🔍', competitor: '👥', trends: '🔥', ai: '✦', analytics: '📊'
  }

  return (
    <DashboardLayout title="Reports">
      <div className="p-6">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold">📁 Saved Reports</h1>
            <p className="text-muted text-sm">All your saved analyses and AI results</p>
          </div>
          <div className="badge-cyan">{reports.length} reports</div>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <Spinner size={28} />
          </div>
        ) : reports.length === 0 ? (
          <EmptyState
            icon="📁"
            title="No reports saved yet"
            description="Run keyword analyses, competitor studies, or AI generations — they'll be saved here automatically."
            action={{ label: 'Research Keywords →', onClick: () => window.location.href = '/keywords' }}
          />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Report list */}
            <div className="space-y-2">
              {reports.map((r: any) => (
                <motion.div key={r.id}
                  initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                  onClick={() => setSelected(r)}
                  className={`card cursor-pointer transition-all duration-150
                             ${selected?.id === r.id ? 'border-cyan/40 bg-cyan/5' : 'hover:border-white/10'}`}>
                  <div className="flex items-start gap-3">
                    <div className="text-2xl flex-shrink-0">{TYPE_ICONS[r.type] || '📄'}</div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-white truncate">{r.title}</div>
                      <div className="text-xs text-muted capitalize">{r.type} · {r.platform}</div>
                      <div className="text-xs text-muted mt-1">
                        {r.createdAt?.toDate ? format(r.createdAt.toDate(), 'MMM d, yyyy') : 'Recent'}
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <button onClick={e => { e.stopPropagation(); downloadJSON(r) }}
                        className="w-7 h-7 rounded-lg hover:bg-white/10 flex items-center justify-center text-muted hover:text-cyan">
                        <FiDownload size={12} />
                      </button>
                      <button onClick={e => { e.stopPropagation(); remove(r.id) }}
                        className="w-7 h-7 rounded-lg hover:bg-white/10 flex items-center justify-center text-muted hover:text-red">
                        <FiTrash2 size={12} />
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Detail view */}
            <div className="lg:col-span-2">
              {selected ? (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="card">
                  <div className="flex items-center gap-3 mb-5">
                    <div className="text-3xl">{TYPE_ICONS[selected.type] || '📄'}</div>
                    <div>
                      <h2 className="font-bold text-white">{selected.title}</h2>
                      <div className="text-xs text-muted capitalize">{selected.type} report · {selected.platform}</div>
                    </div>
                    <button onClick={() => downloadJSON(selected)}
                      className="btn btn-ghost btn-sm gap-1.5 ml-auto">
                      <FiDownload size={13} /> Export JSON
                    </button>
                  </div>
                  <pre className="text-xs text-white/70 bg-surf2 rounded-xl p-4 overflow-x-auto
                                 max-h-96 overflow-y-auto font-mono leading-relaxed">
                    {JSON.stringify(selected.data, null, 2)}
                  </pre>
                </motion.div>
              ) : (
                <div className="card flex flex-col items-center justify-center py-20 text-center">
                  <FiEye size={36} className="text-muted mb-3" />
                  <p className="text-muted text-sm">Select a report to view its details</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}

export default withAuth(ReportsPage)
