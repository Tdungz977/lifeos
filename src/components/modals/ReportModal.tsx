import React, { useState } from 'react'
import { AlertTriangle, Send, CheckCircle2, ShieldAlert } from 'lucide-react'
import { Modal } from '@/components/common/Modal'
import { Button } from '@/components/common/Button'
import { socialService } from '@/services/socialService'
import { useAuth } from '@/context/AuthContext'

interface ReportModalProps {
  isOpen: boolean
  onClose: () => void
  targetType: 'user' | 'group' | 'content'
  targetId: string
  targetName?: string
}

const REPORT_REASONS = [
  'Nội dung quấy rối hoặc công kích cá nhân',
  'Spam hoặc quảng cáo không phù hợp',
  'Mạo danh hoặc thông tin giả mạo',
  'Ngôn từ thù địch hoặc thiếu văn hóa',
  'Vi phạm tiêu chuẩn kỷ luật & văn minh cộng đồng',
  'Lý do khác',
]

export const ReportModal: React.FC<ReportModalProps> = ({
  isOpen,
  onClose,
  targetType,
  targetId,
  targetName = 'đối tượng này',
}) => {
  const { user } = useAuth()
  const [selectedReason, setSelectedReason] = useState(REPORT_REASONS[0])
  const [details, setDetails] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    setSubmitting(true)
    await socialService.reportContent(
      user.id,
      targetType,
      targetId,
      selectedReason,
      details.trim() || undefined
    )
    setSubmitting(false)
    setIsSuccess(true)

    setTimeout(() => {
      setIsSuccess(false)
      setDetails('')
      onClose()
    }, 1800)
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Báo cáo vi phạm & Bảo vệ cộng đồng"
      description={`Báo cáo ${targetType === 'user' ? 'người dùng' : targetType === 'group' ? 'nhóm' : 'nội dung'}: ${targetName}`}
    >
      {isSuccess ? (
        <div className="py-6 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-emerald-950/60 border border-emerald-800/60 text-emerald-400 mx-auto flex items-center justify-center">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <h4 className="font-bold text-slate-100 text-sm">Đã ghi nhận báo cáo</h4>
          <p className="text-xs text-slate-400 max-w-xs mx-auto">
            Cảm ơn bạn đã đóng góp xây dựng môi trường kỷ luật tích cực và an toàn cho LIFEOS.
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="p-3 rounded-xl bg-amber-950/30 border border-amber-800/40 text-amber-300 text-xs flex items-start gap-2.5">
            <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
            <span>
              Báo cáo của bạn sẽ được giữ bí mật hoàn toàn. Đội ngũ quản trị sẽ xem xét nội dung và áp dụng biện pháp phù hợp.
            </span>
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
              Lý do báo cáo
            </label>
            <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
              {REPORT_REASONS.map((reason) => (
                <label
                  key={reason}
                  className={`flex items-center gap-2.5 p-2.5 rounded-xl border text-xs cursor-pointer transition-all ${
                    selectedReason === reason
                      ? 'bg-indigo-600/20 border-indigo-500 text-white font-medium'
                      : 'bg-[#12101D] border-[#282538] text-slate-300 hover:border-slate-700'
                  }`}
                >
                  <input
                    type="radio"
                    name="reportReason"
                    value={reason}
                    checked={selectedReason === reason}
                    onChange={() => setSelectedReason(reason)}
                    className="text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>{reason}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
              Chi tiết bổ sung (tùy chọn)
            </label>
            <textarea
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder="Cung cấp thêm thông tin hoặc bối cảnh nếu có..."
              rows={3}
              className="w-full bg-[#101726]/80 border border-slate-700/70 rounded-xl px-3.5 py-2 text-xs text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-[#282538]">
            <Button type="button" variant="ghost" size="sm" onClick={onClose}>
              Hủy
            </Button>
            <Button
              type="submit"
              variant="danger"
              size="sm"
              isLoading={submitting}
              leftIcon={<AlertTriangle className="w-3.5 h-3.5" />}
            >
              Gửi báo cáo
            </Button>
          </div>
        </form>
      )}
    </Modal>
  )
}
