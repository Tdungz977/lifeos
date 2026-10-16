import React, { useState, useEffect, useCallback } from 'react'
import {
  GraduationCap,
  Plus,
  BookOpen,
  Clock,
  ExternalLink,
  Trash2,
  Link as LinkIcon,
  Calendar,
} from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import { Subject, StudySession } from '@/types/database'
import { Card, CardHeader } from '@/components/common/Card'
import { Button } from '@/components/common/Button'
import { Input } from '@/components/common/Input'
import { Modal } from '@/components/common/Modal'
import { EmptyState } from '@/components/common/EmptyState'
import { formatViDate } from '@/lib/utils'

export const LearningPage: React.FC = () => {
  const { user } = useAuth()
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [sessions, setSessions] = useState<StudySession[]>([])
  const [loading, setLoading] = useState(true)

  // Subject Modal
  const [isSubjectModalOpen, setIsSubjectModalOpen] = useState(false)
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null)
  const [subjectName, setSubjectName] = useState('')
  const [subjectCategory, setSubjectCategory] = useState('programming')
  const [targetOutcome, setTargetOutcome] = useState('')
  const [targetDate, setTargetDate] = useState('')
  const [resourceTitle, setResourceTitle] = useState('')
  const [resourceUrl, setResourceUrl] = useState('')

  // Quick Session Modal
  const [isSessionModalOpen, setIsSessionModalOpen] = useState(false)
  const [selectedSubjectId, setSelectedSubjectId] = useState('')
  const [sessionDuration, setSessionDuration] = useState('45')
  const [sessionNotes, setSessionNotes] = useState('')

  const fetchLearningData = useCallback(async () => {
    if (!user || !isSupabaseConfigured()) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      const [subRes, sessRes] = await Promise.all([
        supabase
          .from('subjects')
          .select('*')
          .eq('user_id', user.id)
          .eq('is_archived', false)
          .order('created_at', { ascending: false }),
        supabase
          .from('study_sessions')
          .select('*, subject:subjects(name)')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(10),
      ])

      if (subRes.data) setSubjects(subRes.data)
      if (sessRes.data) setSessions(sessRes.data)
    } catch (err) {
      console.error('Error fetching learning hub:', err)
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    fetchLearningData()
  }, [fetchLearningData])

  const handleOpenCreateSubject = () => {
    setEditingSubject(null)
    setSubjectName('')
    setSubjectCategory('programming')
    setTargetOutcome('')
    setTargetDate('')
    setResourceTitle('')
    setResourceUrl('')
    setIsSubjectModalOpen(true)
  }

  const handleSaveSubject = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !isSupabaseConfigured()) return

    const resources = resourceUrl.trim()
      ? [{ title: resourceTitle.trim() || 'Tài liệu học tập', url: resourceUrl.trim() }]
      : []

    const payload = {
      user_id: user.id,
      name: subjectName.trim(),
      category: subjectCategory,
      target_outcome: targetOutcome.trim() || null,
      target_date: targetDate || null,
      resource_urls: resources,
    }

    if (editingSubject) {
      await supabase.from('subjects').update(payload).eq('id', editingSubject.id).eq('user_id', user.id)
    } else {
      await supabase.from('subjects').insert({ ...payload, progress: 0 })
    }

    setIsSubjectModalOpen(false)
    fetchLearningData()
  }

  const handleUpdateProgress = async (subjectId: string, newProgress: number) => {
    if (!user || !isSupabaseConfigured()) return
    const clamped = Math.min(100, Math.max(0, newProgress))
    setSubjects((prev) =>
      prev.map((s) => (s.id === subjectId ? { ...s, progress: clamped } : s))
    )
    await supabase.from('subjects').update({ progress: clamped }).eq('id', subjectId).eq('user_id', user.id)
  }

  const handleLogSession = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !isSupabaseConfigured() || !selectedSubjectId) return

    const { data } = await supabase
      .from('study_sessions')
      .insert({
        user_id: user.id,
        subject_id: selectedSubjectId,
        duration_minutes: parseInt(sessionDuration) || 45,
        session_date: new Date().toISOString().split('T')[0],
        notes: sessionNotes.trim() || null,
      })
      .select('*, subject:subjects(name)')
      .single()

    if (data) {
      setSessions((prev) => [data, ...prev])
      setIsSessionModalOpen(false)
      setSessionNotes('')
    }
  }

  const handleDeleteSubject = async (id: string) => {
    if (!confirm('Bạn có chắc chắn muốn xóa môn học này?')) return
    setSubjects((prev) => prev.filter((s) => s.id !== id))
    if (user && isSupabaseConfigured()) {
      await supabase.from('subjects').delete().eq('id', id).eq('user_id', user.id)
    }
  }

  const totalStudyMinutes = sessions.reduce((acc, s) => acc + (s.duration_minutes || 0), 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">Trung Tâm Học Tập & Kỹ Năng</h1>
          <p className="text-xs text-slate-400 mt-1">
            Quản trị các môn học, kỹ năng cần trau dồi và ghi nhận nhanh các phiên học tập chuyên sâu.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setIsSessionModalOpen(true)}
            leftIcon={<Clock className="w-4 h-4" />}
          >
            Ghi nhận phiên học
          </Button>
          <Button
            size="sm"
            onClick={handleOpenCreateSubject}
            leftIcon={<Plus className="w-4 h-4" />}
          >
            Thêm môn học mới
          </Button>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
            Môn học / Kỹ năng đang theo học
          </div>
          <div className="text-2xl font-bold text-white">{subjects.length} môn</div>
        </Card>

        <Card>
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
            Thời lượng đã học ghi nhận
          </div>
          <div className="text-2xl font-bold text-indigo-400 font-mono">
            {Math.floor(totalStudyMinutes / 60)}h {totalStudyMinutes % 60}p
          </div>
        </Card>

        <Card>
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
            Phiên học gần nhất
          </div>
          <div className="text-2xl font-bold text-emerald-400">
            {sessions.length > 0 ? formatViDate(sessions[0].session_date, 'dd/MM/yyyy') : 'Chưa có'}
          </div>
        </Card>
      </div>

      {/* Subjects Grid */}
      <div className="space-y-3">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-300">
          Danh Sách Môn Học & Kỹ Năng ({subjects.length})
        </h2>

        {loading ? (
          <div className="py-12 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
            <div className="w-4 h-4 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
            <span>Đang tải môn học & kỹ năng...</span>
          </div>
        ) : subjects.length === 0 ? (
          <EmptyState
            icon={<GraduationCap className="w-8 h-8 text-indigo-400" />}
            title="Chưa có môn học nào"
            description="Tạo môn học hoặc kỹ năng bạn đang muốn phát triển (lập trình, ngoại ngữ, quản lý...)"
            actionLabel="Tạo môn học đầu tiên"
            onAction={handleOpenCreateSubject}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {subjects.map((sub) => (
              <Card key={sub.id} className="flex flex-col justify-between hover:border-indigo-500/30">
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-[10px] px-2 py-0.5 rounded bg-indigo-950/60 text-indigo-300 border border-indigo-800/40 font-semibold uppercase">
                      {sub.category}
                    </span>
                    <button
                      onClick={() => handleDeleteSubject(sub.id)}
                      className="p-1 rounded text-slate-500 hover:text-rose-400"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <h3 className="font-bold text-base text-white mt-2">{sub.name}</h3>

                  {sub.target_outcome && (
                    <p className="text-xs text-slate-400 mt-1.5 italic">
                      🎯 Đầu ra: {sub.target_outcome}
                    </p>
                  )}

                  {sub.target_date && (
                    <p className="text-[11px] text-slate-400 flex items-center gap-1 mt-2">
                      <Calendar className="w-3 h-3 text-slate-500" />
                      Mục tiêu: {formatViDate(sub.target_date, 'dd/MM/yyyy')}
                    </p>
                  )}

                  {/* Resource URLs */}
                  {sub.resource_urls && sub.resource_urls.length > 0 && (
                    <div className="mt-3 pt-2 border-t border-slate-800/60 space-y-1">
                      {sub.resource_urls.map((r, idx) => (
                        <a
                          key={idx}
                          href={r.url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[11px] text-indigo-400 hover:text-indigo-300 flex items-center gap-1.5 truncate"
                        >
                          <ExternalLink className="w-3 h-3 shrink-0" />
                          <span className="truncate">{r.title || r.url}</span>
                        </a>
                      ))}
                    </div>
                  )}
                </div>

                <div className="mt-4 pt-3 border-t border-slate-800">
                  <div className="flex justify-between items-center text-xs mb-1.5">
                    <span className="text-slate-400">Độ thành thạo</span>
                    <span className="font-semibold text-indigo-400">{sub.progress}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={sub.progress}
                    onChange={(e) => handleUpdateProgress(sub.id, parseInt(e.target.value))}
                    className="w-full accent-indigo-500 cursor-pointer"
                  />
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Study Session Log Table */}
      <Card>
        <CardHeader
          title="Nhật Ký Các Phiên Học Gần Đây"
          subtitle="Thời lượng đã dành ra để thực hành và tiếp thu tri thức"
          icon={<BookOpen className="w-4 h-4" />}
          action={
            <Button
              size="sm"
              variant="outline"
              onClick={() => setIsSessionModalOpen(true)}
              leftIcon={<Plus className="w-3.5 h-3.5" />}
            >
              Ghi nhanh phiên học
            </Button>
          }
        />

        {sessions.length === 0 ? (
          <p className="text-xs text-slate-400 text-center py-6">Chưa có phiên học nào được ghi lại.</p>
        ) : (
          <div className="space-y-2">
            {sessions.map((sess) => (
              <div
                key={sess.id}
                className="flex items-center justify-between p-3 rounded-lg bg-slate-900/50 border border-slate-800 text-xs"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-indigo-600/20 text-indigo-300 flex items-center justify-center font-bold">
                    {sess.duration_minutes}m
                  </div>
                  <div>
                    <span className="font-bold text-slate-200">
                      {sess.subject?.name || 'Môn học'}
                    </span>
                    {sess.notes && <p className="text-slate-400 text-[11px] mt-0.5">{sess.notes}</p>}
                  </div>
                </div>
                <span className="text-slate-400 font-mono">
                  {formatViDate(sess.session_date, 'dd/MM/yyyy')}
                </span>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Add Subject Modal */}
      <Modal
        isOpen={isSubjectModalOpen}
        onClose={() => setIsSubjectModalOpen(false)}
        title={editingSubject ? 'Chỉnh Sửa Môn Học' : 'Thêm Môn Học / Kỹ Năng Mới'}
        maxWidth="md"
      >
        <form onSubmit={handleSaveSubject} className="space-y-3.5">
          <Input
            label="Tên môn học / Kỹ năng *"
            placeholder="Ví dụ: Golang Backend, IELTS 7.5, Kiến trúc Hệ thống..."
            value={subjectName}
            onChange={(e) => setSubjectName(e.target.value)}
            required
            autoFocus
          />

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5 text-left">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                Lĩnh vực
              </label>
              <select
                value={subjectCategory}
                onChange={(e) => setSubjectCategory(e.target.value)}
                className="w-full bg-[#101726]/80 border border-slate-700/70 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="programming">Lập trình & Kỹ thuật</option>
                <option value="language">Ngoại ngữ</option>
                <option value="business">Kinh doanh & Quản trị</option>
                <option value="creative">Thiết kế & Sáng tạo</option>
                <option value="general">Khác</option>
              </select>
            </div>

            <Input
              label="Hạn đích kỳ vọng"
              type="date"
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
            />
          </div>

          <Input
            label="Mục tiêu kết quả kỳ vọng"
            placeholder="Ví dụ: Tự xây dựng được API microservices hoàn chỉnh"
            value={targetOutcome}
            onChange={(e) => setTargetOutcome(e.target.value)}
          />

          <div className="space-y-2 pt-2 border-t border-slate-800">
            <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <LinkIcon className="w-3.5 h-3.5 text-indigo-400" /> Tài liệu / Khóa học tham khảo
            </span>
            <Input
              placeholder="Tên tài liệu (Ví dụ: Khóa học Udemy, Sách Clean Code)"
              value={resourceTitle}
              onChange={(e) => setResourceTitle(e.target.value)}
            />
            <Input
              placeholder="Đường dẫn URL (Ví dụ: https://...)"
              value={resourceUrl}
              onChange={(e) => setResourceUrl(e.target.value)}
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
            <Button type="button" variant="secondary" size="sm" onClick={() => setIsSubjectModalOpen(false)}>
              Hủy
            </Button>
            <Button type="submit" variant="primary" size="sm">
              Lưu môn học
            </Button>
          </div>
        </form>
      </Modal>

      {/* Log Session Modal */}
      <Modal
        isOpen={isSessionModalOpen}
        onClose={() => setIsSessionModalOpen(false)}
        title="Ghi Nhận Phiên Học Mới"
        maxWidth="md"
      >
        <form onSubmit={handleLogSession} className="space-y-3.5">
          <div className="space-y-1.5 text-left">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
              Chọn môn học *
            </label>
            <select
              value={selectedSubjectId}
              onChange={(e) => setSelectedSubjectId(e.target.value)}
              className="w-full bg-[#101726]/80 border border-slate-700/70 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              required
            >
              <option value="">-- Chọn môn học --</option>
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5 text-left">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
              Thời lượng (phút)
            </label>
            <select
              value={sessionDuration}
              onChange={(e) => setSessionDuration(e.target.value)}
              className="w-full bg-[#101726]/80 border border-slate-700/70 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="25">25 phút</option>
              <option value="45">45 phút</option>
              <option value="60">1 giờ (60 phút)</option>
              <option value="90">1.5 giờ (90 phút)</option>
              <option value="120">2 giờ (120 phút)</option>
            </select>
          </div>

          <div className="space-y-1.5 text-left">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
              Ghi chú thu hoạch
            </label>
            <textarea
              value={sessionNotes}
              onChange={(e) => setSessionNotes(e.target.value)}
              placeholder="Bạn đã học được khái niệm gì mới?..."
              rows={2}
              className="w-full bg-[#101726]/80 border border-slate-700/70 rounded-lg p-3 text-xs text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
            <Button type="button" variant="secondary" size="sm" onClick={() => setIsSessionModalOpen(false)}>
              Hủy
            </Button>
            <Button type="submit" variant="primary" size="sm">
              Lưu phiên học
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
