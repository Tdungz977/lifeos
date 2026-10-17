import React, { useState, useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import {
  Scale,
  Sparkles,
  Flame,
  Target,
  CheckSquare,
  Trophy,
  ArrowRight,
  Send,
  HelpCircle,
  Users,
  Info,
  Calendar,
  BarChart3,
  ShieldAlert,
} from 'lucide-react'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts'
import { format, subDays, differenceInDays } from 'date-fns'
import { useAuth } from '@/context/AuthContext'
import { socialService } from '@/services/socialService'
import { growthHubService, UserGrowthMetrics } from '@/services/growthHubService'
import { Connection } from '@/types/database'
import { Card } from '@/components/common/Card'
import { Button } from '@/components/common/Button'
import { Modal } from '@/components/common/Modal'
import { JointGoalModal } from '@/components/modals/JointGoalModal'

export const ComparePage: React.FC = () => {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { user } = useAuth()

  const [connections, setConnections] = useState<Connection[]>([])
  const [selectedPartnerId, setSelectedPartnerId] = useState<string>(searchParams.get('partnerId') || '')
  
  // Timeframe modes: 7, 30, or custom
  const [timeframeMode, setTimeframeMode] = useState<'7' | '30' | 'custom'>('7')
  const [customStartDate, setCustomStartDate] = useState(format(subDays(new Date(), 14), 'yyyy-MM-dd'))
  const [customEndDate, setCustomEndDate] = useState(format(new Date(), 'yyyy-MM-dd'))

  const [loading, setLoading] = useState(false)

  const [compareData, setCompareData] = useState<{
    userA: UserGrowthMetrics | null
    userB: UserGrowthMetrics | null
    comparisonHighlights: string[]
    sharedChallengeSuggestions: string[]
  } | null>(null)

  const [showFormulaModal, setShowFormulaModal] = useState(false)
  const [jointGoalModalOpen, setJointGoalModalOpen] = useState(false)

  // Calculate effective days
  const effectiveDays = React.useMemo(() => {
    if (timeframeMode === '7') return 7
    if (timeframeMode === '30') return 30
    try {
      const diff = differenceInDays(new Date(customEndDate), new Date(customStartDate)) + 1
      return Math.max(1, Math.min(365, diff))
    } catch {
      return 14
    }
  }, [timeframeMode, customStartDate, customEndDate])

  // Load friends list
  useEffect(() => {
    const loadConnections = async () => {
      if (!user) return
      const list = await socialService.fetchConnections(user.id)
      setConnections(list)
      if (!selectedPartnerId && list.length > 0) {
        const firstPartnerId =
          list[0].requester_id === user.id ? list[0].addressee_id : list[0].requester_id
        setSelectedPartnerId(firstPartnerId)
      }
    }
    loadConnections()
  }, [user])

  // Run comparison when partner or timeframe changes
  useEffect(() => {
    const runCompare = async () => {
      if (!user || !selectedPartnerId) return
      setLoading(true)
      const res = await growthHubService.compareUsers(user.id, selectedPartnerId, effectiveDays)
      setCompareData(res)
      setLoading(false)
    }
    runCompare()
  }, [user, selectedPartnerId, effectiveDays])

  const userA = compareData?.userA
  const userB = compareData?.userB

  // Chart data preparation
  const chartData = React.useMemo(() => {
    if (!userA || !userB) return []
    const nameA = userA.profile.display_name?.split(' ')[0] || 'Bạn'
    const nameB = userB.profile.display_name?.split(' ')[0] || 'Đồng hành'

    return [
      {
        metric: 'Xong việc (%)',
        [nameA]: userA.taskCompletionRate,
        [nameB]: userB.permissionStatus === 'granted' ? userB.taskCompletionRate : 0,
      },
      {
        metric: 'Mục tiêu (%)',
        [nameA]: userA.goalsAvgProgress,
        [nameB]: userB.permissionStatus === 'granted' ? userB.goalsAvgProgress : 0,
      },
      {
        metric: 'Nhất quán (%)',
        [nameA]: (userA.scoreBreakdown.consistencyScore || 0) * 10,
        [nameB]: userB.permissionStatus === 'granted' ? (userB.scoreBreakdown.consistencyScore || 0) * 10 : 0,
      },
      {
        metric: 'Thói quen (ngày)',
        [nameA]: userA.activeHabitStreak,
        [nameB]: userB.permissionStatus === 'granted' ? userB.activeHabitStreak : 0,
      },
      {
        metric: 'Điểm tăng trưởng',
        [nameA]: userA.growthScore,
        [nameB]: userB.permissionStatus === 'granted' ? userB.growthScore : 0,
      },
    ]
  }, [userA, userB])

  const nameA = userA?.profile.display_name?.split(' ')[0] || 'Bạn'
  const nameB = userB?.profile.display_name?.split(' ')[0] || 'Đồng hành'

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-[#F3F4F6] tracking-tight flex items-center gap-2">
            <Scale className="w-6 h-6 text-[#7255F7]" />
            Bảng So Sánh Kỷ Luật (Compare Mode)
          </h1>
          <p className="text-xs text-[#9CA3AF] mt-1">
            So sánh sự tiến bộ lành mạnh giữa 2 người, học hỏi thế mạnh của nhau và đồng hành cùng bứt phá.
          </p>
        </div>

        {/* Controls: Partner Selector & Timeframe */}
        <div className="flex items-center gap-2 flex-wrap">
          {connections.length > 0 && (
            <select
              value={selectedPartnerId}
              onChange={(e) => setSelectedPartnerId(e.target.value)}
              className="px-3 py-1.5 rounded-xl bg-[#191725] border border-[#282538] text-xs text-[#F3F4F6] font-semibold cursor-pointer"
            >
              {connections.map((conn) => {
                const partner = conn.partner_profile
                const pId = conn.requester_id === user?.id ? conn.addressee_id : conn.requester_id
                return (
                  <option key={conn.id} value={pId}>
                    {partner?.display_name || 'Chiến binh'}
                  </option>
                )
              })}
            </select>
          )}

          {/* Timeframe Switcher (7 ngày, 30 ngày, Tùy chỉnh) */}
          <div className="flex items-center p-0.5 rounded-xl bg-[#12101D] border border-[#282538] text-xs font-semibold">
            <button
              onClick={() => setTimeframeMode('7')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                timeframeMode === '7' ? 'bg-[#7255F7] text-white shadow-sm font-bold' : 'text-[#9CA3AF] hover:text-[#F3F4F6]'
              }`}
            >
              7 ngày
            </button>
            <button
              onClick={() => setTimeframeMode('30')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                timeframeMode === '30' ? 'bg-[#7255F7] text-white shadow-sm font-bold' : 'text-[#9CA3AF] hover:text-[#F3F4F6]'
              }`}
            >
              30 ngày
            </button>
            <button
              onClick={() => setTimeframeMode('custom')}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1 cursor-pointer ${
                timeframeMode === 'custom' ? 'bg-[#7255F7] text-white shadow-sm font-bold' : 'text-[#9CA3AF] hover:text-[#F3F4F6]'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Tùy chỉnh</span>
            </button>
          </div>

          <button
            onClick={() => setShowFormulaModal(true)}
            className="p-2 rounded-xl bg-[#191725] border border-[#282538] text-[#9CA3AF] hover:text-[#F3F4F6] transition-colors cursor-pointer"
            title="Công thức tính điểm minh bạch"
          >
            <HelpCircle className="w-4 h-4 text-[#7255F7]" />
          </button>
        </div>
      </div>

      {/* Custom Date Range Picker Bar (if custom selected) */}
      {timeframeMode === 'custom' && (
        <div className="p-3.5 rounded-xl bg-[#191725] border border-[#7255F7]/30 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-[#EDEAF8] font-medium">
            <Calendar className="w-4 h-4 text-[#7255F7]" />
            <span>Khoảng thời gian so sánh tùy chọn:</span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <label className="text-[#9CA3AF]">Từ:</label>
            <input
              type="date"
              value={customStartDate}
              onChange={(e) => setCustomStartDate(e.target.value)}
              className="px-2.5 py-1 rounded-lg bg-[#12101D] border border-[#282538] text-xs text-[#F3F4F6]"
            />
            <label className="text-[#9CA3AF]">Đến:</label>
            <input
              type="date"
              value={customEndDate}
              onChange={(e) => setCustomEndDate(e.target.value)}
              className="px-2.5 py-1 rounded-lg bg-[#12101D] border border-[#282538] text-xs text-[#F3F4F6]"
            />
            <span className="text-xs text-[#B2A2FA] font-semibold">
              ({effectiveDays} ngày)
            </span>
          </div>
        </div>
      )}

      {/* Main Content */}
      {loading ? (
        <div className="p-16 text-center text-xs text-[#9CA3AF] animate-pulse">
          Đang tính toán các chỉ số so sánh trong khoảng thời gian {effectiveDays} ngày...
        </div>
      ) : !userB || connections.length === 0 ? (
        <Card className="p-10 text-center space-y-4">
          <Users className="w-12 h-12 text-[#9CA3AF]/40 mx-auto" />
          <h3 className="text-base font-bold text-[#F3F4F6]">Chưa chọn người bạn để so sánh</h3>
          <p className="text-xs text-[#9CA3AF] max-w-sm mx-auto">
            Bạn cần kết nối với ít nhất một người bạn hoặc người đồng hành để kích hoạt chế độ so sánh tiến bộ.
          </p>
          <Button variant="primary" size="sm" onClick={() => navigate('/social')}>
            Kết nối bạn bè ngay
          </Button>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Side-by-side Profile & Score Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* User A (You) */}
            <Card className="p-6 space-y-4 border-indigo-500/30 bg-gradient-to-b from-[#13111C] to-indigo-950/10">
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  Bạn (Bản thân)
                </span>
                <span className="text-2xl font-black text-indigo-400">
                  {userA?.growthScore || 0} pts
                </span>
              </div>

              <div className="flex items-center gap-3">
                {userA?.profile.avatar_url ? (
                  <img
                    src={userA.profile.avatar_url || ''}
                    alt={userA.profile.display_name || 'Chiến binh'}
                    className="w-14 h-14 rounded-2xl object-cover border border-indigo-500/40 shadow-lg"
                  />
                ) : (
                  <div className="w-14 h-14 rounded-2xl bg-indigo-600 flex items-center justify-center font-bold text-white text-xl shadow-lg shadow-indigo-600/20">
                    {userA?.profile.display_name?.slice(0, 2).toUpperCase() || 'YOU'}
                  </div>
                )}
                <div>
                  <h3 className="text-base font-bold text-[#F3F4F6]">{userA?.profile.display_name}</h3>
                  <p className="text-xs text-[#7255F7]">@{userA?.profile.username || 'lifeos_user'}</p>
                </div>
              </div>

              {userA?.profile.growth_goal && (
                <p className="text-xs text-[#9CA3AF] italic bg-[#191725] p-3 rounded-xl border border-[#282538]">
                  "{userA.profile.growth_goal}"
                </p>
              )}

              {/* Strengths */}
              <div className="space-y-1">
                <span className="text-[11px] font-semibold text-[#9CA3AF] block">Lĩnh vực làm tốt nhất:</span>
                <div className="flex flex-wrap gap-1.5">
                  {userA?.topStrengths.map((s, idx) => (
                    <span key={idx} className="px-2 py-0.5 rounded-lg bg-emerald-950/40 border border-emerald-800/40 text-[11px] text-emerald-300 font-medium">
                      ✓ {s}
                    </span>
                  ))}
                </div>
              </div>
            </Card>

            {/* User B (Partner) */}
            <Card className="p-6 space-y-4 border-purple-500/30 bg-gradient-to-b from-[#13111C] to-purple-950/10">
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                  Đồng hành
                </span>
                <span className="text-2xl font-black text-purple-400">
                  {userB.permissionStatus === 'granted' ? `${userB.growthScore} pts` : '—'}
                </span>
              </div>

              <div className="flex items-center gap-3">
                {userB.profile.avatar_url ? (
                  <img
                    src={userB.profile.avatar_url || ''}
                    alt={userB.profile.display_name || 'Đồng hành'}
                    className="w-14 h-14 rounded-2xl object-cover border border-purple-500/40 shadow-lg"
                  />
                ) : (
                  <div className="w-14 h-14 rounded-2xl bg-purple-600 flex items-center justify-center font-bold text-white text-xl shadow-lg shadow-purple-600/20">
                    {userB.profile.display_name?.slice(0, 2).toUpperCase() || 'P'}
                  </div>
                )}
                <div>
                  <h3 className="text-base font-bold text-[#F3F4F6]">{userB.profile.display_name}</h3>
                  <p className="text-xs text-purple-400">@{userB.profile.username || 'partner'}</p>
                </div>
              </div>

              {userB.profile.growth_goal && (
                <p className="text-xs text-[#9CA3AF] italic bg-[#191725] p-3 rounded-xl border border-[#282538]">
                  "{userB.profile.growth_goal}"
                </p>
              )}

              {/* Strengths */}
              <div className="space-y-1">
                <span className="text-[11px] font-semibold text-[#9CA3AF] block">Lĩnh vực làm tốt nhất:</span>
                <div className="flex flex-wrap gap-1.5">
                  {userB.permissionStatus === 'granted' ? (
                    userB.topStrengths.map((s, idx) => (
                      <span key={idx} className="px-2 py-0.5 rounded-lg bg-emerald-950/40 border border-emerald-800/40 text-[11px] text-emerald-300 font-medium">
                        ✓ {s}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-[#9CA3AF] italic">Chưa cấp quyền chia sẻ chi tiết</span>
                  )}
                </div>
              </div>
            </Card>
          </div>

          {/* Recharts Visual Comparison Bar Chart */}
          <Card className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-[#F3F4F6] flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-[#7255F7]" />
                Biểu đồ so sánh trực quan ({effectiveDays} ngày)
              </h3>
              <span className="text-xs text-[#9CA3AF]">
                {nameA} (Xanh tím) vs {nameB} (Hồng cánh sen)
              </span>
            </div>

            <div className="h-64 w-full pt-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#282538" vertical={false} />
                  <XAxis dataKey="metric" stroke="#6B7280" fontSize={11} tickLine={false} />
                  <YAxis stroke="#6B7280" fontSize={11} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#191725',
                      borderColor: '#3A364F',
                      borderRadius: '12px',
                      color: '#F3F4F6',
                      fontSize: '12px',
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '8px' }} />
                  <Bar dataKey={nameA} fill="#7255F7" radius={[6, 6, 0, 0]} maxBarSize={36} />
                  <Bar dataKey={nameB} fill="#EC4899" radius={[6, 6, 0, 0]} maxBarSize={36} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* Detailed Metric Comparisons Breakdown */}
          <Card className="p-6 space-y-6">
            <h3 className="text-sm font-bold text-[#F3F4F6] flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#7255F7]" />
              Chi tiết các chỉ số tiến bộ ({effectiveDays} ngày)
            </h3>

            <div className="space-y-4">
              {/* Metric 1: Task Completion Rate */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-indigo-400">
                    {userA?.tasksCompleted}/{userA?.tasksTotal} ({userA?.taskCompletionRate || 0}%)
                  </span>
                  <span className="text-[#EDEAF8]">Tỷ lệ hoàn thành nhiệm vụ</span>
                  <span className="text-purple-400">
                    {userB.tasksCompleted}/{userB.tasksTotal} ({userB.taskCompletionRate}%)
                  </span>
                </div>
                <div className="flex gap-2 items-center">
                  <div className="flex-1 bg-slate-800 h-2 rounded-full overflow-hidden flex justify-end">
                    <div
                      className="bg-indigo-500 h-full rounded-full transition-all duration-500"
                      style={{ width: `${userA?.taskCompletionRate || 0}%` }}
                    />
                  </div>
                  <div className="flex-1 bg-slate-800 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-purple-500 h-full rounded-full transition-all duration-500"
                      style={{ width: `${userB.taskCompletionRate}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Metric 2: Habit Consistency */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-indigo-400">{userA?.activeHabitStreak || 0} ngày</span>
                  <span className="text-[#EDEAF8]">Chuỗi thói quen kiên định</span>
                  <span className="text-purple-400">{userB.activeHabitStreak} ngày</span>
                </div>
                <div className="flex gap-2 items-center">
                  <div className="flex-1 bg-slate-800 h-2 rounded-full overflow-hidden flex justify-end">
                    <div
                      className="bg-amber-500 h-full rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(100, ((userA?.activeHabitStreak || 0) / 14) * 100)}%` }}
                    />
                  </div>
                  <div className="flex-1 bg-slate-800 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-rose-500 h-full rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(100, (userB.activeHabitStreak / 14) * 100)}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Metric 3: Goals Progress */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-indigo-400">{userA?.goalsAvgProgress || 0}% ({userA?.goalsCount} mục tiêu)</span>
                  <span className="text-[#EDEAF8]">Tiến độ mục tiêu dài hạn</span>
                  <span className="text-purple-400">{userB.goalsAvgProgress}% ({userB.goalsCount} mục tiêu)</span>
                </div>
                <div className="flex gap-2 items-center">
                  <div className="flex-1 bg-slate-800 h-2 rounded-full overflow-hidden flex justify-end">
                    <div
                      className="bg-indigo-500 h-full rounded-full transition-all duration-500"
                      style={{ width: `${userA?.goalsAvgProgress || 0}%` }}
                    />
                  </div>
                  <div className="flex-1 bg-slate-800 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-purple-500 h-full rounded-full transition-all duration-500"
                      style={{ width: `${userB.goalsAvgProgress}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Metric 4: Consistency score */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-cyan-400">{userA?.scoreBreakdown.consistencyScore || 0}/10 điểm</span>
                  <span className="text-[#EDEAF8]">Tính nhất quán hoạt động</span>
                  <span className="text-cyan-400">{userB.scoreBreakdown.consistencyScore || 0}/10 điểm</span>
                </div>
                <div className="flex gap-2 items-center">
                  <div className="flex-1 bg-slate-800 h-2 rounded-full overflow-hidden flex justify-end">
                    <div
                      className="bg-cyan-500 h-full rounded-full transition-all duration-500"
                      style={{ width: `${((userA?.scoreBreakdown.consistencyScore || 0) / 10) * 100}%` }}
                    />
                  </div>
                  <div className="flex-1 bg-slate-800 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-teal-500 h-full rounded-full transition-all duration-500"
                      style={{ width: `${((userB.scoreBreakdown.consistencyScore || 0) / 10) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {/* Action Box: Start a joint challenge together / group challenge */}
          <div className="p-6 rounded-2xl bg-gradient-to-r from-purple-900/20 via-indigo-900/20 to-transparent border border-[#7255F7]/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-[#F3F4F6] flex items-center gap-2">
                <Trophy className="w-4 h-4 text-amber-400" />
                Cùng nhau bứt phá: Thi đua 1-1 hoặc trong nhóm
              </h4>
              <p className="text-xs text-[#9CA3AF]">
                Biến sự so sánh thành động lực phát triển. Bắt đầu thử thách 7 ngày hoặc 14 ngày để hai bên cùng thi đua kỷ luật.
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/social?tab=groups')}
                leftIcon={<Users className="w-4 h-4 text-[#7255F7]" />}
              >
                Thi đua nhóm
              </Button>

              <Button
                variant="primary"
                size="sm"
                onClick={() => setJointGoalModalOpen(true)}
                leftIcon={<Flame className="w-4 h-4 text-rose-400" />}
              >
                Thi đua riêng 1-1
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* JOINT GOAL / 1V1 CHALLENGE MODAL */}
      <JointGoalModal
        isOpen={jointGoalModalOpen}
        onClose={() => setJointGoalModalOpen(false)}
        targetPartner={userB?.profile}
      />

      {/* FORMULA MODAL */}
      <Modal isOpen={showFormulaModal} onClose={() => setShowFormulaModal(false)} title="Quy tắc so sánh & Tính điểm minh bạch">
        <div className="space-y-3 text-xs text-[#9CA3AF] leading-relaxed">
          <p>
            Chế độ so sánh (Compare Mode) của LIFEOS hoạt động trên tinh thần:
          </p>
          <ul className="list-disc list-inside space-y-1 text-[#EDEAF8]">
            <li><strong>Tôn trọng:</strong> Không phán xét hay xếp hạng hạ thấp đối phương.</li>
            <li><strong>Minh bạch:</strong> Công thức điểm dựa trên tỷ lệ hoàn thành (35%), thói quen (35%), mục tiêu (20%) và ngày hoạt động (10%).</li>
            <li><strong>Tự nguyện:</strong> Chỉ những người bật chia sẻ và chấp nhận kết nối mới có thể so sánh.</li>
            <li><strong>Tùy chỉnh:</strong> Linh hoạt chọn xem theo 7 ngày, 30 ngày hoặc bất kỳ khoảng ngày tùy chỉnh nào.</li>
          </ul>
          <div className="flex justify-end pt-2">
            <Button variant="primary" size="sm" onClick={() => setShowFormulaModal(false)}>
              Đã hiểu
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
