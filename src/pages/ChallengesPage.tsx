import React, { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  Trophy,
  Flame,
  Plus,
  Users,
  Target,
  CheckCircle2,
  Calendar,
  Sparkles,
  Heart,
  Shield,
  Clock,
  ArrowRight,
} from 'lucide-react'
import confetti from 'canvas-confetti'
import { useAuth } from '@/context/AuthContext'
import { challengeService } from '@/services/challengeService'
import { socialService } from '@/services/socialService'
import { Challenge, ChallengeType, Connection, Group } from '@/types/database'
import { Card } from '@/components/common/Card'
import { Button } from '@/components/common/Button'
import { Input } from '@/components/common/Input'
import { Modal } from '@/components/common/Modal'
import { ProgressBar } from '@/components/common/ProgressBar'
import { formatViDate } from '@/lib/utils'

export const ChallengesPage: React.FC = () => {
  const [searchParams] = useSearchParams()
  const { user } = useAuth()

  const [activeTab, setActiveTab] = useState<'all' | 'pair' | 'group' | 'completed'>('all')
  const [challenges, setChallenges] = useState<Challenge[]>([])
  const [connections, setConnections] = useState<Connection[]>([])
  const [groups, setGroups] = useState<Group[]>([])
  const [loading, setLoading] = useState(true)

  // Create Modal state
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState<Challenge['category']>('habit')
  const [targetMetric, setTargetMetric] = useState('Số ngày hoàn thành liên tục')
  const [targetValue, setTargetValue] = useState(7)
  const [unit, setUnit] = useState('ngày')
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0])
  const [endDate, setEndDate] = useState(
    new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0]
  )
  const [challengeType, setChallengeType] = useState<ChallengeType>('pair')
  const [selectedFriendId, setSelectedFriendId] = useState(searchParams.get('inviteUserId') || '')
  const [selectedGroupId, setSelectedGroupId] = useState('')
  const [rulesNote, setRulesNote] = useState(
    'Thi đua lành mạnh, bảo vệ sức khỏe, tôn trọng nhịp độ phát triển của nhau.'
  )
  const [creating, setCreating] = useState(false)

  const loadData = async () => {
    if (!user) return
    setLoading(true)
    const [challList, connList, groupList] = await Promise.all([
      challengeService.fetchUserChallenges(user.id),
      socialService.fetchConnections(user.id),
      socialService.fetchUserGroups(user.id),
    ])
    setChallenges(challList)
    setConnections(connList)
    setGroups(groupList)
    if (searchParams.get('inviteUserId')) {
      setShowCreateModal(true)
      setChallengeType('pair')
    }
    setLoading(false)
  }

  useEffect(() => {
    loadData()
  }, [user])

  const handleCreateChallenge = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !title.trim()) return

    setCreating(true)
    const invitedUserIds =
      challengeType === 'pair' && selectedFriendId ? [selectedFriendId] : []

    const { error } = await challengeService.createChallenge(user.id, {
      title,
      description,
      category,
      targetMetric,
      targetValue: Number(targetValue),
      unit,
      startDate,
      endDate,
      challengeType,
      invitedUserIds,
      groupId: challengeType === 'group' ? selectedGroupId : undefined,
      rulesNote,
    })

    setCreating(false)
    if (!error) {
      setShowCreateModal(false)
      setTitle('')
      setDescription('')
      loadData()
      confetti({ particleCount: 60, spread: 50, origin: { y: 0.7 } })
    }
  }

  // Record Check-in (+1 progress)
  const handleRecordProgress = async (challengeId: string) => {
    if (!user) return
    const { error, isCompleted } = await challengeService.recordProgress(challengeId, user.id, 1)
    if (!error) {
      if (isCompleted) {
        confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } })
      }
      loadData()
    }
  }

  // Filter challenges
  const filteredChallenges = challenges.filter((c) => {
    if (activeTab === 'completed') return c.status === 'completed'
    if (c.status === 'completed') return false
    if (activeTab === 'pair') return c.challenge_type === 'pair'
    if (activeTab === 'group') return c.challenge_type === 'group'
    return true
  })

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-[#F3F4F6] tracking-tight flex items-center gap-2">
            <Trophy className="w-6 h-6 text-amber-400" />
            Thử Thách & Thi Đua Kỷ Luật
          </h1>
          <p className="text-xs text-[#9CA3AF] mt-1">
            Thiết lập thử thách 1-1 hoặc thi đua theo nhóm để biến áp lực thành động lực tiến bộ.
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          onClick={() => setShowCreateModal(true)}
          leftIcon={<Plus className="w-4 h-4" />}
          className="shadow-md shadow-[#7255F7]/20"
        >
          Tạo thử thách mới
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1.5 p-1 rounded-xl bg-[#191725] border border-[#282538] w-fit">
        <button
          onClick={() => setActiveTab('all')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
            activeTab === 'all' ? 'bg-[#7255F7] text-white shadow-sm' : 'text-[#9CA3AF]'
          }`}
        >
          Tất cả đang chạy
        </button>
        <button
          onClick={() => setActiveTab('pair')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
            activeTab === 'pair' ? 'bg-[#7255F7] text-white shadow-sm' : 'text-[#9CA3AF]'
          }`}
        >
          Thử thách 1-1
        </button>
        <button
          onClick={() => setActiveTab('group')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
            activeTab === 'group' ? 'bg-[#7255F7] text-white shadow-sm' : 'text-[#9CA3AF]'
          }`}
        >
          Thử thách nhóm
        </button>
        <button
          onClick={() => setActiveTab('completed')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
            activeTab === 'completed' ? 'bg-[#7255F7] text-white shadow-sm' : 'text-[#9CA3AF]'
          }`}
        >
          Đã hoàn thành
        </button>
      </div>

      {/* Main List */}
      {loading ? (
        <div className="p-16 text-center text-xs text-[#9CA3AF]">Đang tải danh sách thử thách...</div>
      ) : filteredChallenges.length === 0 ? (
        <Card className="p-10 text-center space-y-4">
          <Trophy className="w-12 h-12 text-[#9CA3AF]/40 mx-auto" />
          <h3 className="text-base font-bold text-[#F3F4F6]">Chưa có thử thách nào</h3>
          <p className="text-xs text-[#9CA3AF] max-w-sm mx-auto">
            Hãy bắt đầu thử thách 7 ngày hoặc 14 ngày rèn luyện thói quen cùng một người bạn đồng hành.
          </p>
          <Button
            variant="primary"
            size="sm"
            onClick={() => setShowCreateModal(true)}
            leftIcon={<Plus className="w-4 h-4" />}
          >
            Tạo thử thách ngay
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {filteredChallenges.map((chall) => {
            const myPart = chall.participants?.find((p) => p.user_id === user?.id)
            const myProgress = myPart?.current_progress || 0
            const pct = Math.min(100, Math.round((myProgress / (chall.target_value || 1)) * 100))

            return (
              <Card key={chall.id} className="p-5 flex flex-col justify-between gap-4 border-[#282538] hover:border-[#7255F7]/40 transition-all">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-500/15 border border-amber-500/30 text-amber-300">
                      {chall.category} • {chall.challenge_type === 'pair' ? '1-1 Đối đầu' : 'Đồng đội'}
                    </span>
                    <span className="text-[11px] font-medium text-[#9CA3AF] flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      Hạn: {formatViDate(new Date(chall.end_date), 'dd/MM/yyyy')}
                    </span>
                  </div>

                  <div>
                    <h3 className="text-base font-bold text-[#F3F4F6]">{chall.title}</h3>
                    {chall.description && (
                      <p className="text-xs text-[#9CA3AF] mt-1 leading-relaxed">{chall.description}</p>
                    )}
                  </div>

                  {/* Target Goal Pill */}
                  <div className="p-2.5 rounded-xl bg-[#191725] border border-[#282538] flex items-center justify-between text-xs">
                    <span className="text-[#9CA3AF]">Mục tiêu:</span>
                    <span className="font-bold text-[#EDEAF8]">
                      {chall.target_value} {chall.unit}
                    </span>
                  </div>

                  {/* Participants Progress Bar */}
                  <div className="space-y-2 pt-1">
                    <span className="text-[11px] font-semibold text-[#9CA3AF] block">
                      Tiến độ người tham gia ({chall.participants?.length || 0}):
                    </span>

                    {chall.participants?.map((part) => {
                      const pName =
                        part.user_id === user?.id
                          ? 'Bạn'
                          : part.profile?.display_name || 'Đồng đội'
                      const pProg = part.current_progress || 0
                      const pPct = Math.min(100, Math.round((pProg / chall.target_value) * 100))

                      return (
                        <div key={part.id} className="space-y-1">
                          <div className="flex justify-between text-[11px]">
                            <span className={part.user_id === user?.id ? 'font-bold text-indigo-400' : 'text-[#EDEAF8]'}>
                              {pName} {part.is_completed && '🏆'}
                            </span>
                            <span className="text-[#9CA3AF]">
                              {pProg} / {chall.target_value} {chall.unit} ({pPct}%)
                            </span>
                          </div>
                          <ProgressBar value={pPct} color={part.user_id === user?.id ? 'indigo' : 'emerald'} />
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Footer Action */}
                <div className="pt-3 border-t border-[#282538] flex items-center justify-between gap-3">
                  <span className="text-[11px] text-[#9CA3AF] italic">
                    {chall.rules_note ? `Quy tắc: ${chall.rules_note}` : 'Kỷ luật bền vững'}
                  </span>

                  {myPart && !myPart.is_completed && chall.status !== 'completed' && (
                    <Button
                      size="sm"
                      variant="primary"
                      onClick={() => handleRecordProgress(chall.id)}
                      leftIcon={<CheckCircle2 className="w-3.5 h-3.5" />}
                    >
                      Điểm danh (+1 {chall.unit})
                    </Button>
                  )}

                  {myPart?.is_completed && (
                    <span className="px-3 py-1 rounded-xl bg-emerald-500/20 text-emerald-300 font-bold text-xs border border-emerald-500/30 flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5" />
                      Đã hoàn thành!
                    </span>
                  )}
                </div>
              </Card>
            )
          })}
        </div>
      )}

      {/* CREATE CHALLENGE MODAL */}
      <Modal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} title="Khởi tạo thử thách kỷ luật mới">
        <form onSubmit={handleCreateChallenge} className="space-y-4">
          <Input
            label="Tên thử thách"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ví dụ: 7 ngày dậy sớm lúc 5h30, Đọc 20 phút sách mỗi ngày"
            required
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#EDEAF8] mb-1.5">Loại thử thách</label>
              <select
                value={challengeType}
                onChange={(e) => setChallengeType(e.target.value as ChallengeType)}
                className="w-full px-3 py-2 rounded-xl bg-[#191725] border border-[#282538] text-xs text-[#F3F4F6]"
              >
                <option value="pair">Thử thách 1-1 (Với bạn bè / người yêu)</option>
                <option value="group">Thử thách nhóm</option>
                <option value="personal">Thử thách cá nhân</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#EDEAF8] mb-1.5">Chủ đề</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as any)}
                className="w-full px-3 py-2 rounded-xl bg-[#191725] border border-[#282538] text-xs text-[#F3F4F6]"
              >
                <option value="habit">Thói quen kỷ luật</option>
                <option value="reading">Đọc sách & Tri thức</option>
                <option value="workout">Rèn luyện thể lực</option>
                <option value="study">Học tập & Ngoại ngữ</option>
                <option value="task">Nhiệm vụ năng suất</option>
              </select>
            </div>
          </div>

          {/* Partner selector if pair */}
          {challengeType === 'pair' && (
            <div>
              <label className="block text-xs font-semibold text-[#EDEAF8] mb-1.5">Chọn người cùng thách đấu</label>
              {connections.length === 0 ? (
                <p className="text-xs text-amber-400">Bạn chưa có kết nối nào. Hãy kết nối bạn bè trước.</p>
              ) : (
                <select
                  value={selectedFriendId}
                  onChange={(e) => setSelectedFriendId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#191725] border border-[#282538] text-xs text-[#F3F4F6]"
                  required
                >
                  <option value="">-- Chọn bạn bè --</option>
                  {connections.map((conn) => {
                    const p = conn.partner_profile
                    const pId = conn.requester_id === user?.id ? conn.addressee_id : conn.requester_id
                    return (
                      <option key={conn.id} value={pId}>
                        {p?.display_name || 'Chiến binh'} ({conn.relationship_type})
                      </option>
                    )
                  })}
                </select>
              )}
            </div>
          )}

          {/* Group selector if group */}
          {challengeType === 'group' && (
            <div>
              <label className="block text-xs font-semibold text-[#EDEAF8] mb-1.5">Chọn nhóm tham gia</label>
              <select
                value={selectedGroupId}
                onChange={(e) => setSelectedGroupId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-[#191725] border border-[#282538] text-xs text-[#F3F4F6]"
                required
              >
                <option value="">-- Chọn nhóm --</option>
                {groups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#EDEAF8] mb-1.5">Chỉ tiêu hoàn thành</label>
              <input
                type="number"
                min={1}
                value={targetValue}
                onChange={(e) => setTargetValue(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl bg-[#191725] border border-[#282538] text-xs text-[#F3F4F6]"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#EDEAF8] mb-1.5">Đơn vị đo lường</label>
              <input
                type="text"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                placeholder="ngày, giờ, trang sách..."
                className="w-full px-3 py-2 rounded-xl bg-[#191725] border border-[#282538] text-xs text-[#F3F4F6]"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#EDEAF8] mb-1.5">Ngày bắt đầu</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-[#191725] border border-[#282538] text-xs text-[#F3F4F6]"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#EDEAF8] mb-1.5">Ngày kết thúc</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-[#191725] border border-[#282538] text-xs text-[#F3F4F6]"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#EDEAF8] mb-1.5">Mô tả hoặc ghi chú</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Quy chuẩn chấm điểm, hình thức thưởng/phạt tượng trưng vui vẻ..."
              rows={2}
              className="w-full px-3 py-2 rounded-xl bg-[#191725] border border-[#282538] text-xs text-[#F3F4F6] resize-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setShowCreateModal(false)}>
              Hủy
            </Button>
            <Button type="submit" variant="primary" isLoading={creating}>
              Bắt đầu thử thách
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
