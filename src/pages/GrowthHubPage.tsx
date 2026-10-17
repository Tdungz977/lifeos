import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Share2,
  TrendingUp,
  Flame,
  CheckSquare,
  Target,
  Sparkles,
  Scale,
  Send,
  Lock,
  Info,
  Heart,
  Shield,
  HelpCircle,
  Calendar,
} from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { socialService } from '@/services/socialService'
import { growthHubService, UserGrowthMetrics } from '@/services/growthHubService'
import { Connection, Profile } from '@/types/database'
import { Card } from '@/components/common/Card'
import { Button } from '@/components/common/Button'
import { Modal } from '@/components/common/Modal'
import { ProgressBar } from '@/components/common/ProgressBar'
import { JointGoalModal } from '@/components/modals/JointGoalModal'

export const GrowthHubPage: React.FC = () => {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [connections, setConnections] = useState<Connection[]>([])
  const [metricsList, setMetricsList] = useState<UserGrowthMetrics[]>([])
  const [loading, setLoading] = useState(true)
  const [showFormulaModal, setShowFormulaModal] = useState(false)
  const [timeframeDays, setTimeframeDays] = useState<7 | 30>(7)

  // Cheer state
  const [cheerModalOpen, setCheerModalOpen] = useState(false)
  const [cheerTargetUser, setCheerTargetUser] = useState<Profile | null>(null)
  const [cheerEmoji, setCheerEmoji] = useState('🔥')
  const [cheerMessage, setCheerMessage] = useState('')
  const [cheerSending, setCheerSending] = useState(false)
  const [cheerSuccess, setCheerSuccess] = useState('')

  // Joint goal state
  const [jointGoalPartner, setJointGoalPartner] = useState<Profile | null>(null)
  const [jointGoalModalOpen, setJointGoalModalOpen] = useState(false)

  useEffect(() => {
    const loadHubData = async () => {
      if (!user) return
      setLoading(true)

      const conns = await socialService.fetchConnections(user.id)
      setConnections(conns)

      const metricsPromises = conns.map(async (c) => {
        const partnerId = c.requester_id === user.id ? c.addressee_id : c.requester_id
        return await growthHubService.fetchUserGrowthMetrics(user.id, partnerId, timeframeDays)
      })

      const resolved = await Promise.all(metricsPromises)
      setMetricsList(resolved.filter((m): m is UserGrowthMetrics => m !== null))
      setLoading(false)
    }

    loadHubData()
  }, [user, timeframeDays])

  const handleSendCheer = async () => {
    if (!user || !cheerTargetUser) return
    setCheerSending(true)
    const { error } = await socialService.sendSocialCheer(
      user.id,
      cheerTargetUser.id,
      cheerEmoji,
      cheerMessage
    )
    setCheerSending(false)
    if (!error) {
      setCheerSuccess('Đã gửi tiếp lửa thành công!')
      setTimeout(() => {
        setCheerSuccess('')
        setCheerModalOpen(false)
        setCheerMessage('')
      }, 1500)
    }
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-[#F3F4F6] tracking-tight flex items-center gap-2">
            <Share2 className="w-6 h-6 text-[#7255F7]" />
            Cùng Phát Triển (Growth Hub)
          </h1>
          <p className="text-xs text-[#9CA3AF] mt-1">
            Không gian chia sẻ sự tiến bộ, cổ vũ lẫn nhau và duy trì kỷ luật cùng bạn bè & người đồng hành.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Timeframe Switcher (Tuần / Tháng) */}
          <div className="p-0.5 rounded-xl bg-[#12101D] border border-[#282538] flex items-center text-xs font-semibold">
            <button
              type="button"
              onClick={() => setTimeframeDays(7)}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                timeframeDays === 7
                  ? 'bg-[#7255F7] text-white shadow-sm font-bold'
                  : 'text-[#9CA3AF] hover:text-[#F3F4F6]'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>7 ngày (Tuần)</span>
            </button>
            <button
              type="button"
              onClick={() => setTimeframeDays(30)}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                timeframeDays === 30
                  ? 'bg-[#7255F7] text-white shadow-sm font-bold'
                  : 'text-[#9CA3AF] hover:text-[#F3F4F6]'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>30 ngày (Tháng)</span>
            </button>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFormulaModal(true)}
            leftIcon={<HelpCircle className="w-4 h-4 text-[#7255F7]" />}
          >
            Công thức điểm
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={() => navigate('/compare')}
            leftIcon={<Scale className="w-4 h-4" />}
          >
            So sánh 2 người
          </Button>
        </div>
      </div>

      {/* Privacy Notice Banner */}
      <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-[#191725]/80 border border-[#282538] text-xs text-[#9CA3AF]">
        <Shield className="w-4 h-4 text-[#10B981] shrink-0" />
        <span>
          <strong>Bảo vệ quyền riêng tư:</strong> Chỉ hiển thị các chỉ số mục tiêu, nhiệm vụ và thói quen mà bạn bè đã chủ động phân quyền chia sẻ cho bạn.
        </span>
      </div>

      {/* Main Growth Stream */}
      {loading ? (
        <div className="p-16 text-center text-xs text-[#9CA3AF] animate-pulse">
          Đang tổng hợp dữ liệu tiến độ ({timeframeDays === 7 ? '7 ngày gần nhất' : '30 ngày qua'}) từ bạn bè và người đồng hành...
        </div>
      ) : metricsList.length === 0 ? (
        <Card className="p-10 text-center space-y-4">
          <Share2 className="w-12 h-12 text-[#9CA3AF]/40 mx-auto" />
          <h3 className="text-base font-bold text-[#F3F4F6]">Chưa có dữ liệu tiến độ từ bạn bè</h3>
          <p className="text-xs text-[#9CA3AF] max-w-md mx-auto">
            Khi bạn kết nối với bạn bè hoặc người đồng hành và họ cho phép chia sẻ tiến độ, số liệu kỷ luật của họ sẽ xuất hiện tại đây để hai bên cùng cổ vũ.
          </p>
          <div className="flex justify-center gap-3">
            <Button variant="primary" size="sm" onClick={() => navigate('/social')}>
              Tìm kiếm bạn bè ngay
            </Button>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {metricsList.map((metric) => {
            const profile = metric.profile
            const name = profile.display_name || 'Chiến binh'
            const handle = profile.username ? `@${profile.username}` : ''

            return (
              <Card key={metric.userId} className="p-5 flex flex-col justify-between gap-4 hover:border-[#7255F7]/40 transition-all">
                {/* Profile row */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    {profile.avatar_url ? (
                      <img
                        src={profile.avatar_url || ''}
                        alt={name}
                        className="w-12 h-12 rounded-2xl object-cover border border-[#3A364F]"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-500 flex items-center justify-center font-bold text-white text-lg shadow-md">
                        {name.slice(0, 2).toUpperCase()}
                      </div>
                    )}
                    <div>
                      <h3 className="text-sm font-bold text-[#F3F4F6]">{name}</h3>
                      {handle && <p className="text-xs text-[#7255F7] font-medium">{handle}</p>}
                      {profile.growth_goal && (
                        <p className="text-[11px] text-[#9CA3AF] line-clamp-1 italic mt-0.5">
                          "{profile.growth_goal}"
                        </p>
                      )}
                    </div>
                  </div>

                  {metric.permissionStatus === 'granted' && (
                    <div className="text-center px-2.5 py-1 rounded-xl bg-[#7255F7]/15 border border-[#7255F7]/30">
                      <span className="text-lg font-black text-[#EDEAF8]">{metric.growthScore}</span>
                      <span className="block text-[9px] uppercase font-bold text-[#B2A2FA]">Điểm tăng trưởng</span>
                    </div>
                  )}
                </div>

                {/* Content based on permission status */}
                {metric.permissionStatus === 'not_shared' ? (
                  <div className="p-4 rounded-xl bg-[#191725] border border-[#282538] text-center space-y-1.5">
                    <Lock className="w-5 h-5 text-slate-500 mx-auto" />
                    <p className="text-xs font-semibold text-slate-300">Chưa cấp quyền chia sẻ</p>
                    <p className="text-[11px] text-slate-500">
                      Người dùng này chọn giữ bí mật tiến độ hoặc chưa bật chia sẻ cho bạn.
                    </p>
                  </div>
                ) : metric.permissionStatus === 'insufficient_data' ? (
                  <div className="p-4 rounded-xl bg-[#191725] border border-[#282538] text-center space-y-1.5">
                    <Info className="w-5 h-5 text-amber-500/70 mx-auto" />
                    <p className="text-xs font-semibold text-slate-300">Chưa đủ dữ liệu trong kỳ này</p>
                    <p className="text-[11px] text-slate-500">
                      Chiến binh đang trong quá trình ghi nhận hoạt động đầu tiên.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {/* Metrics 4-box Grid */}
                    <div className="grid grid-cols-2 gap-2 text-center">
                      <div className="p-2.5 rounded-xl bg-[#191725] border border-[#282538]">
                        <span className="text-[10px] text-[#9CA3AF] block font-medium">Việc hoàn thành</span>
                        <span className="text-sm font-bold text-emerald-400">
                          {metric.tasksCompleted}/{metric.tasksTotal} ({metric.taskCompletionRate}%)
                        </span>
                      </div>
                      <div className="p-2.5 rounded-xl bg-[#191725] border border-[#282538]">
                        <span className="text-[10px] text-[#9CA3AF] block font-medium">Chuỗi thói quen</span>
                        <span className="text-sm font-bold text-amber-400">
                          {metric.activeHabitStreak} ngày
                        </span>
                      </div>
                      <div className="p-2.5 rounded-xl bg-[#191725] border border-[#282538]">
                        <span className="text-[10px] text-[#9CA3AF] block font-medium">Tiến độ mục tiêu</span>
                        <span className="text-sm font-bold text-purple-400">
                          {metric.goalsAvgProgress}% ({metric.goalsCount} MT)
                        </span>
                      </div>
                      <div className="p-2.5 rounded-xl bg-[#191725] border border-[#282538]">
                        <span className="text-[10px] text-[#9CA3AF] block font-medium">Mức độ nhất quán</span>
                        <span className="text-sm font-bold text-cyan-400">
                          {metric.scoreBreakdown.consistencyScore}/10 đ
                        </span>
                      </div>
                    </div>

                    {/* Strengths Badge */}
                    {metric.topStrengths.length > 0 && (
                      <div className="flex items-center gap-1.5 text-[11px] text-emerald-300 bg-emerald-950/30 border border-emerald-800/40 px-2.5 py-1.5 rounded-xl">
                        <Sparkles className="w-3.5 h-3.5 shrink-0 text-emerald-400" />
                        <span className="truncate">{metric.topStrengths[0]}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Card Footer Actions */}
                <div className="pt-3 border-t border-[#282538] flex items-center justify-between gap-1.5 flex-wrap">
                  <button
                    onClick={() => {
                      setCheerTargetUser(profile)
                      setCheerModalOpen(true)
                    }}
                    className="flex-1 py-1.5 px-2.5 rounded-xl bg-[#7255F7]/15 border border-[#7255F7]/30 text-[#EDEAF8] hover:bg-[#7255F7]/25 text-xs font-semibold flex items-center justify-center gap-1 transition-all cursor-pointer"
                    title="Gửi lời động viên, phản hồi"
                  >
                    <Flame className="w-3.5 h-3.5 text-rose-400" />
                    Động viên
                  </button>

                  <button
                    onClick={() => {
                      setJointGoalPartner(profile)
                      setJointGoalModalOpen(true)
                    }}
                    className="flex-1 py-1.5 px-2.5 rounded-xl bg-emerald-950/40 border border-emerald-800/50 text-emerald-300 hover:bg-emerald-900/40 text-xs font-semibold flex items-center justify-center gap-1 transition-all cursor-pointer"
                    title="Cùng đặt mục tiêu hoặc thi đua chung"
                  >
                    <Target className="w-3.5 h-3.5 text-emerald-400" />
                    Đặt mục tiêu
                  </button>

                  <button
                    onClick={() => navigate(`/compare?partnerId=${metric.userId}`)}
                    className="py-1.5 px-2.5 rounded-xl bg-[#191725] border border-[#282538] text-[#9CA3AF] hover:text-[#F3F4F6] text-xs font-medium flex items-center gap-1 transition-all cursor-pointer"
                    title="So sánh chi tiết 2 người"
                  >
                    <Scale className="w-3.5 h-3.5 text-[#7255F7]" />
                    So sánh
                  </button>
                </div>
              </Card>
            )
          })}
        </div>
      )}

      {/* FORMULA TRANSPARENCY MODAL */}
      <Modal isOpen={showFormulaModal} onClose={() => setShowFormulaModal(false)} title="Công thức tính Điểm Tăng Trưởng LIFEOS">
        <div className="space-y-4 text-xs text-[#9CA3AF] leading-relaxed">
          <p>
            LIFEOS xây dựng điểm số tăng trưởng hoàn toàn minh bạch, khách quan, dựa trên hành động thực tế nhằm khuyến khích sự tiến bộ bền vững của mỗi cá nhân, không mang tính phán xét giá trị con người.
          </p>

          <div className="p-3.5 rounded-xl bg-[#191725] border border-[#282538] space-y-2 text-[#EDEAF8]">
            <h4 className="font-bold text-sm text-[#7255F7]">Trọng số chuẩn hóa (Thang 100 điểm):</h4>
            <ul className="space-y-1.5 list-disc list-inside">
              <li>
                <strong>35% — Tỷ lệ hoàn thành nhiệm vụ đến hạn:</strong> (Số nhiệm vụ hoàn thành / Tổng nhiệm vụ đến hạn) × 35.
              </li>
              <li>
                <strong>35% — Tính bền bỉ của chuỗi thói quen:</strong> Chuỗi ngày check-in liên tục chuẩn hóa trên thang 14 ngày × 35.
              </li>
              <li>
                <strong>20% — Tiến độ theo đuổi mục tiêu:</strong> Trung bình % tiến độ các mục tiêu đang hoạt động × 20.
              </li>
              <li>
                <strong>10% — Mức độ nhất quán trong tuần:</strong> Số ngày trong tuần có hoạt động kỷ luật được ghi nhận × 10.
              </li>
            </ul>
          </div>

          <p className="italic">
            Lưu ý: Các nhiệm vụ chưa đến hạn hoặc đã hủy sẽ không bị tính là thất bại. Nếu người dùng chưa có đủ dữ liệu, hệ thống sẽ hiển thị "Chưa đủ dữ liệu" thay vì tự suy đoán.
          </p>

          <div className="flex justify-end pt-2">
            <Button variant="primary" size="sm" onClick={() => setShowFormulaModal(false)}>
              Đã hiểu
            </Button>
          </div>
        </div>
      </Modal>

      {/* CHEER MODAL */}
      <Modal isOpen={cheerModalOpen} onClose={() => setCheerModalOpen(false)} title={`Động viên ${cheerTargetUser?.display_name || ''}`}>
        <div className="space-y-4">
          <p className="text-xs text-[#9CA3AF]">
            Chọn biểu tượng và gửi lời nhắn khích lệ đồng đội tiếp tục kiên trì:
          </p>

          <div className="flex items-center gap-2">
            {['🔥', '👏', '🚀', '❤️', '🏆', '💪', '⭐'].map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => setCheerEmoji(emoji)}
                className={`w-10 h-10 rounded-xl text-lg flex items-center justify-center transition-all cursor-pointer ${
                  cheerEmoji === emoji
                    ? 'bg-[#7255F7]/30 border-2 border-[#7255F7] scale-110 shadow-lg'
                    : 'bg-[#191725] border border-[#282538] hover:bg-[#282538]'
                }`}
              >
                {emoji}
              </button>
            ))}
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#EDEAF8] mb-1.5">Lời nhắn gửi ngắn gọn</label>
            <input
              type="text"
              value={cheerMessage}
              onChange={(e) => setCheerMessage(e.target.value)}
              placeholder="Ví dụ: Phong độ tuần này đỉnh quá! Tiếp tục phát huy nhé!"
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#191725] border border-[#282538] text-sm text-[#F3F4F6]"
            />
          </div>

          {cheerSuccess && (
            <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-800/60 text-emerald-300 text-xs">
              {cheerSuccess}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setCheerModalOpen(false)}>
              Đóng
            </Button>
            <Button
              variant="primary"
              isLoading={cheerSending}
              onClick={handleSendCheer}
              leftIcon={<Send className="w-3.5 h-3.5" />}
            >
              Gửi tiếp lửa
            </Button>
          </div>
        </div>
      </Modal>

      {/* JOINT GOAL MODAL */}
      <JointGoalModal
        isOpen={jointGoalModalOpen}
        onClose={() => setJointGoalModalOpen(false)}
        targetPartner={jointGoalPartner}
      />
    </div>
  )
}
