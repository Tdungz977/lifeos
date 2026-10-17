import React, { useState } from 'react'
import { Trophy, Target, Sparkles, Flame, Users, Calendar, ArrowRight, CheckCircle2 } from 'lucide-react'
import { Modal } from '@/components/common/Modal'
import { Button } from '@/components/common/Button'
import { Input } from '@/components/common/Input'
import { useAuth } from '@/context/AuthContext'
import { challengeService } from '@/services/challengeService'
import { Profile, Challenge } from '@/types/database'
import { format, addDays } from 'date-fns'

interface JointGoalModalProps {
  isOpen: boolean
  onClose: () => void
  targetPartner?: Profile | null
  onSuccess?: () => void
}

export const JointGoalModal: React.FC<JointGoalModalProps> = ({
  isOpen,
  onClose,
  targetPartner,
  onSuccess,
}) => {
  const { user } = useAuth()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState<Challenge['category']>('habit')
  const [targetMetric, setTargetMetric] = useState('Số ngày duy trì chuỗi kỷ luật')
  const [targetValue, setTargetValue] = useState('7')
  const [unit, setUnit] = useState('ngày')
  const [durationDays, setDurationDays] = useState('7')
  const [rulesNote, setRulesNote] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return
    if (!title.trim()) {
      setErrorMsg('Vui lòng nhập tên mục tiêu / thử thách.')
      return
    }

    setSubmitting(true)
    setErrorMsg('')

    const startDate = format(new Date(), 'yyyy-MM-dd')
    const endDate = format(addDays(new Date(), parseInt(durationDays) || 7), 'yyyy-MM-dd')

    const invitedUserIds = targetPartner ? [targetPartner.id] : []

    const { error } = await challengeService.createChallenge(user.id, {
      title: title.trim(),
      description: description.trim() || undefined,
      category,
      targetMetric,
      targetValue: parseFloat(targetValue) || 7,
      unit,
      startDate,
      endDate,
      challengeType: targetPartner ? 'pair' : 'personal',
      invitedUserIds,
      rulesNote: rulesNote.trim() || undefined,
    })

    setSubmitting(false)

    if (error) {
      setErrorMsg(error.message || 'Không thể tạo mục tiêu chung.')
    } else {
      setIsSuccess(true)
      setTimeout(() => {
        setIsSuccess(false)
        setTitle('')
        setDescription('')
        onSuccess?.()
        onClose()
      }, 1500)
    }
  }

  const partnerName = targetPartner?.display_name || 'Người bạn đồng hành'

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Cùng Đặt Mục Tiêu & Thi Đua Đôi"
      description={`Cùng ${partnerName} cam kết mục tiêu kỷ luật và theo dõi tiến độ thi đua lành mạnh.`}
    >
      {isSuccess ? (
        <div className="py-6 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-emerald-950/60 border border-emerald-800/60 text-emerald-400 mx-auto flex items-center justify-center">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <h4 className="font-bold text-slate-100 text-sm">Đã khởi tạo mục tiêu chung!</h4>
          <p className="text-xs text-slate-400 max-w-xs mx-auto">
            Lời mời cùng thi đua đã được gửi tới {partnerName}. Cả hai sẽ bắt đầu theo dõi tiến độ cùng nhau!
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-800/60 text-rose-300 text-xs">
              {errorMsg}
            </div>
          )}

          <Input
            label="Tên mục tiêu / Thử thách chung"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ví dụ: 7 Ngày Dậy Sớm 6h00 & Đọc Sách 30 Phút"
            required
            autoFocus
          />

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5 text-left">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                Lĩnh vực rèn luyện
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as any)}
                className="w-full bg-[#12101D] border border-[#282538] rounded-xl px-3 py-2 text-xs text-[#F3F4F6] focus:outline-none focus:border-[#7255F7]"
              >
                <option value="habit">Thói quen (Habit)</option>
                <option value="reading">Đọc sách (Reading)</option>
                <option value="study">Học tập & Kỹ năng (Study)</option>
                <option value="workout">Thể chất & Tập luyện (Workout)</option>
                <option value="task">Hoàn thành nhiệm vụ (Tasks)</option>
              </select>
            </div>

            <div className="space-y-1.5 text-left">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                Thời gian thi đua
              </label>
              <select
                value={durationDays}
                onChange={(e) => {
                  setDurationDays(e.target.value)
                  setTargetValue(e.target.value)
                }}
                className="w-full bg-[#12101D] border border-[#282538] rounded-xl px-3 py-2 text-xs text-[#F3F4F6] focus:outline-none focus:border-[#7255F7]"
              >
                <option value="7">7 ngày (1 tuần thử thách)</option>
                <option value="14">14 ngày (2 tuần tăng tốc)</option>
                <option value="30">30 ngày (1 tháng bứt phá)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Chỉ số mục tiêu"
              value={targetValue}
              onChange={(e) => setTargetValue(e.target.value)}
              placeholder="7"
              type="number"
              required
            />

            <Input
              label="Đơn vị tính"
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              placeholder="ngày / giờ / nhiệm vụ"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
              Quy tắc thi đua hoặc cam kết thưởng / phạt (tùy chọn)
            </label>
            <textarea
              value={rulesNote}
              onChange={(e) => setRulesNote(e.target.value)}
              placeholder="Ví dụ: Ai bỏ cuộc mời một bữa ăn hoặc góp quỹ học bổng..."
              rows={2}
              className="w-full bg-[#101726]/80 border border-slate-700/70 rounded-xl px-3.5 py-2 text-xs text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-[#282538]">
            <Button type="button" variant="ghost" size="sm" onClick={onClose}>
              Hủy
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              isLoading={submitting}
              leftIcon={<Trophy className="w-4 h-4 text-amber-300" />}
            >
              Kích hoạt mục tiêu đôi
            </Button>
          </div>
        </form>
      )}
    </Modal>
  )
}
