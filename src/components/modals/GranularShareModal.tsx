import React, { useState, useEffect } from 'react'
import {
  Share2,
  Calendar,
  CheckSquare,
  Target,
  Flame,
  Users,
  Heart,
  Shield,
  User,
  Lock,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Plus,
} from 'lucide-react'
import { Modal } from '@/components/common/Modal'
import { Button } from '@/components/common/Button'
import { useAuth } from '@/context/AuthContext'
import { sharingService } from '@/services/sharingService'
import { socialService } from '@/services/socialService'
import {
  ShareEntityType,
  ShareTargetType,
  SharePermission,
  Connection,
  Group,
} from '@/types/database'
import { formatViDate } from '@/lib/utils'

interface GranularShareModalProps {
  isOpen: boolean
  onClose: () => void
  initialEntityType?: ShareEntityType
  onPermissionChanged?: () => void
}

export const GranularShareModal: React.FC<GranularShareModalProps> = ({
  isOpen,
  onClose,
  initialEntityType = 'schedule',
  onPermissionChanged,
}) => {
  const { user, profile, updateProfile } = useAuth()
  const [activeTab, setActiveTab] = useState<'create' | 'active'>('create')

  // Create form state
  const [entityType, setEntityType] = useState<ShareEntityType>(initialEntityType)
  const [targetType, setTargetType] = useState<ShareTargetType>('all_friends')
  const [selectedFriendId, setSelectedFriendId] = useState('')
  const [selectedGroupId, setSelectedGroupId] = useState('')

  // Data lists
  const [connections, setConnections] = useState<Connection[]>([])
  const [groups, setGroups] = useState<Group[]>([])
  const [activePermissions, setActivePermissions] = useState<SharePermission[]>([])
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [successMsg, setSuccessMsg] = useState('')
  const [errorMsg, setErrorMsg] = useState('')

  // Load friends, groups, and active permissions
  const loadData = async () => {
    if (!user) return
    setLoading(true)
    const [conns, grps, perms] = await Promise.all([
      socialService.fetchConnections(user.id),
      socialService.fetchUserGroups(user.id),
      sharingService.listMyPermissions(user.id),
    ])

    setConnections(conns)
    setGroups(grps)
    setActivePermissions(perms)

    if (conns.length > 0 && !selectedFriendId) {
      const firstPartnerId =
        conns[0].requester_id === user.id ? conns[0].addressee_id : conns[0].requester_id
      setSelectedFriendId(firstPartnerId)
    }

    if (grps.length > 0 && !selectedGroupId) {
      setSelectedGroupId(grps[0].id)
    }

    setLoading(false)
  }

  useEffect(() => {
    if (isOpen) {
      loadData()
      setEntityType(initialEntityType)
      setErrorMsg('')
      setSuccessMsg('')
    }
  }, [isOpen, initialEntityType, user])

  // Handle granting permission
  const handleGrant = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    setSubmitting(true)
    setErrorMsg('')
    setSuccessMsg('')

    let targetId: string | null = null
    if (targetType === 'specific_user') {
      targetId = selectedFriendId
      if (!targetId) {
        setErrorMsg('Vui lòng chọn bạn bè nhận quyền chia sẻ.')
        setSubmitting(false)
        return
      }
    } else if (targetType === 'group') {
      targetId = selectedGroupId
      if (!targetId) {
        setErrorMsg('Vui lòng chọn nhóm nhận quyền chia sẻ.')
        setSubmitting(false)
        return
      }
    }

    // Ensure general privacy setting for this entity is enabled so recipients can view
    if (profile?.privacy_settings) {
      const psUpdates: any = {}
      if (entityType === 'schedule') psUpdates.share_schedule = true
      if (entityType === 'tasks') psUpdates.share_tasks = true
      if (entityType === 'goals') psUpdates.share_goals = true
      if (entityType === 'habits') psUpdates.share_habits = true
      await updateProfile({
        privacy_settings: {
          ...profile.privacy_settings,
          ...psUpdates,
        },
      })
    }

    const { error } = await sharingService.grantPermission(
      user.id,
      entityType,
      targetType,
      targetId
    )

    setSubmitting(false)

    if (error) {
      setErrorMsg(error.message || 'Không thể cấp quyền chia sẻ.')
    } else {
      setSuccessMsg('Đã thiết lập quyền chia sẻ thành công!')
      loadData()
      onPermissionChanged?.()
      setTimeout(() => {
        setSuccessMsg('')
        setActiveTab('active')
      }, 1200)
    }
  }

  // Handle revoking permission
  const handleRevoke = async (permissionId: string) => {
    if (!user) return
    const { error } = await sharingService.revokePermission(permissionId, user.id)
    if (!error) {
      loadData()
      onPermissionChanged?.()
    }
  }

  const getEntityIcon = (type: ShareEntityType) => {
    switch (type) {
      case 'schedule':
        return <Calendar className="w-4 h-4 text-indigo-400" />
      case 'tasks':
        return <CheckSquare className="w-4 h-4 text-emerald-400" />
      case 'goals':
        return <Target className="w-4 h-4 text-amber-400" />
      case 'habits':
        return <Flame className="w-4 h-4 text-rose-400" />
      default:
        return <Share2 className="w-4 h-4 text-[#7255F7]" />
    }
  }

  const getEntityLabel = (type: ShareEntityType) => {
    switch (type) {
      case 'schedule':
        return 'Lịch trình tuần & tháng'
      case 'tasks':
        return 'Nhiệm vụ hàng ngày'
      case 'goals':
        return 'Mục tiêu phát triển'
      case 'habits':
        return 'Thói quen kỷ luật'
      default:
        return type
    }
  }

  const getTargetLabel = (perm: SharePermission) => {
    switch (perm.target_type) {
      case 'all_friends':
        return 'Tất cả bạn bè kết nối'
      case 'specific_user':
        return perm.target_profile?.display_name
          ? `Bạn bè: ${perm.target_profile.display_name}`
          : 'Bạn bè cụ thể'
      case 'group':
        return perm.target_group?.name ? `Nhóm: ${perm.target_group.name}` : 'Nhóm kỷ luật'
      case 'public':
        return 'Công khai cộng đồng'
      default:
        return 'Chỉ định'
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Chia Sẻ & Phân Quyền Kế Hoạch"
      description="Chủ động kiểm soát đối tượng được xem lịch trình, nhiệm vụ, mục tiêu và thói quen."
    >
      <div className="space-y-4">
        {/* Tab switcher */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-[#12101D] border border-[#282538]">
          <button
            type="button"
            onClick={() => setActiveTab('create')}
            className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'create'
                ? 'bg-[#7255F7] text-white shadow-sm'
                : 'text-[#9CA3AF] hover:text-[#F3F4F6]'
            }`}
          >
            <Plus className="w-3.5 h-3.5" />
            Thiết lập quyền mới
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('active')}
            className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'active'
                ? 'bg-[#7255F7] text-white shadow-sm'
                : 'text-[#9CA3AF] hover:text-[#F3F4F6]'
            }`}
          >
            <Share2 className="w-3.5 h-3.5" />
            Đang chia sẻ ({activePermissions.length})
          </button>
        </div>

        {errorMsg && (
          <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-800/60 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-800/60 text-emerald-300 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* TAB 1: CREATE PERMISSION */}
        {activeTab === 'create' && (
          <form onSubmit={handleGrant} className="space-y-4 pt-1">
            {/* Step 1: Select Entity */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                1. Chọn nội dung muốn chia sẻ
              </label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'schedule', label: 'Lịch trình (Calendar)', icon: Calendar, color: 'text-indigo-400' },
                  { id: 'tasks', label: 'Nhiệm vụ (Tasks)', icon: CheckSquare, color: 'text-emerald-400' },
                  { id: 'goals', label: 'Mục tiêu (Goals)', icon: Target, color: 'text-amber-400' },
                  { id: 'habits', label: 'Thói quen (Habits)', icon: Flame, color: 'text-rose-400' },
                ].map((item) => {
                  const Icon = item.icon
                  const isSelected = entityType === item.id
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setEntityType(item.id as ShareEntityType)}
                      className={`p-2.5 rounded-xl border text-left flex items-center gap-2.5 transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-[#7255F7]/20 border-[#7255F7] text-white shadow-sm'
                          : 'bg-[#12101D] border-[#282538] text-[#9CA3AF] hover:border-slate-700 hover:text-white'
                      }`}
                    >
                      <Icon className={`w-4 h-4 ${item.color}`} />
                      <span className="text-xs font-medium">{item.label}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Step 2: Select Audience */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                2. Chọn quyền xem (Ai được phép xem?)
              </label>
              <div className="space-y-1.5">
                {[
                  {
                    id: 'all_friends',
                    label: 'Tất cả bạn bè kết nối',
                    desc: 'Những người đã là bạn bè trên LIFEOS',
                    icon: Users,
                  },
                  {
                    id: 'specific_user',
                    label: 'Bạn bè cụ thể hoặc Người yêu',
                    desc: 'Chỉ định chính xác một người bạn đồng hành',
                    icon: User,
                  },
                  {
                    id: 'group',
                    label: 'Thành viên trong một nhóm',
                    desc: 'Chỉ các thành viên trong nhóm học tập / rèn luyện',
                    icon: Shield,
                  },
                ].map((t) => {
                  const Icon = t.icon
                  const isSelected = targetType === t.id
                  return (
                    <label
                      key={t.id}
                      className={`flex items-start gap-3 p-2.5 rounded-xl border text-xs cursor-pointer transition-all ${
                        isSelected
                          ? 'bg-indigo-600/15 border-indigo-500 text-white'
                          : 'bg-[#12101D] border-[#282538] text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <input
                        type="radio"
                        name="targetType"
                        value={t.id}
                        checked={isSelected}
                        onChange={() => setTargetType(t.id as ShareTargetType)}
                        className="mt-0.5 text-indigo-600 focus:ring-indigo-500"
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-1.5 font-bold text-slate-200">
                          <Icon className="w-3.5 h-3.5 text-indigo-400" />
                          <span>{t.label}</span>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-0.5">{t.desc}</p>
                      </div>
                    </label>
                  )
                })}
              </div>
            </div>

            {/* Step 2b: Target Selection Details */}
            {targetType === 'specific_user' && (
              <div className="space-y-1.5 animate-fade-in">
                <label className="block text-xs font-semibold text-slate-300">
                  Chọn bạn bè hoặc người yêu
                </label>
                {connections.length === 0 ? (
                  <p className="text-xs text-amber-400 italic">
                    Bạn chưa có kết nối bạn bè nào. Vui lòng kết nối bạn bè trước.
                  </p>
                ) : (
                  <select
                    value={selectedFriendId}
                    onChange={(e) => setSelectedFriendId(e.target.value)}
                    className="w-full bg-[#12101D] border border-[#282538] rounded-xl px-3 py-2 text-xs text-[#F3F4F6] focus:outline-none focus:border-[#7255F7]"
                  >
                    {connections.map((c) => {
                      const partner = c.partner_profile
                      const pId = c.requester_id === user?.id ? c.addressee_id : c.requester_id
                      const isCompanion = c.relationship_type === 'companion'
                      return (
                        <option key={c.id} value={pId}>
                          {partner?.display_name || 'Chiến binh'} {isCompanion ? '💖 (Người yêu / Đồng hành)' : ''}
                        </option>
                      )
                    })}
                  </select>
                )}
              </div>
            )}

            {targetType === 'group' && (
              <div className="space-y-1.5 animate-fade-in">
                <label className="block text-xs font-semibold text-slate-300">
                  Chọn nhóm kỷ luật
                </label>
                {groups.length === 0 ? (
                  <p className="text-xs text-amber-400 italic">
                    Bạn chưa tham gia nhóm nào. Hãy tạo nhóm tại mục Kết nối & Nhóm.
                  </p>
                ) : (
                  <select
                    value={selectedGroupId}
                    onChange={(e) => setSelectedGroupId(e.target.value)}
                    className="w-full bg-[#12101D] border border-[#282538] rounded-xl px-3 py-2 text-xs text-[#F3F4F6] focus:outline-none focus:border-[#7255F7]"
                  >
                    {groups.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.name} ({g.category})
                      </option>
                    ))}
                  </select>
                )}
              </div>
            )}

            {/* Note & Submit */}
            <div className="pt-2 border-t border-[#282538] flex items-center justify-between">
              <span className="text-[11px] text-slate-400 flex items-center gap-1">
                <Lock className="w-3 h-3 text-emerald-400" />
                Có thể thu hồi quyền bất cứ lúc nào
              </span>
              <Button
                type="submit"
                variant="primary"
                size="sm"
                isLoading={submitting}
                leftIcon={<Share2 className="w-3.5 h-3.5" />}
              >
                Kích hoạt chia sẻ
              </Button>
            </div>
          </form>
        )}

        {/* TAB 2: ACTIVE PERMISSIONS LIST */}
        {activeTab === 'active' && (
          <div className="space-y-3">
            {loading ? (
              <div className="py-8 text-center text-xs text-slate-400">Đang tải danh sách phân quyền...</div>
            ) : activePermissions.length === 0 ? (
              <div className="py-8 text-center space-y-2">
                <Lock className="w-8 h-8 text-slate-600 mx-auto" />
                <p className="text-xs font-semibold text-slate-300">Chưa có quyền chia sẻ nào đang kích hoạt</p>
                <p className="text-[11px] text-slate-500 max-w-xs mx-auto">
                  Dữ liệu của bạn hiện ở trạng thái riêng tư hoàn toàn (Chỉ mình tôi).
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setActiveTab('create')}
                  leftIcon={<Plus className="w-3.5 h-3.5" />}
                  className="mt-2"
                >
                  Tạo quyền chia sẻ đầu tiên
                </Button>
              </div>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto pr-1 scrollbar-thin">
                {activePermissions.map((perm) => (
                  <div
                    key={perm.id}
                    className="p-3 rounded-xl bg-[#12101D] border border-[#282538] flex items-center justify-between gap-3 group hover:border-slate-700 transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-indigo-600/15 border border-indigo-500/30 flex items-center justify-center shrink-0">
                        {getEntityIcon(perm.entity_type)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-200">
                            {getEntityLabel(perm.entity_type)}
                          </span>
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300 font-semibold">
                            Chỉ xem
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          Chia sẻ với: <strong className="text-slate-300">{getTargetLabel(perm)}</strong>
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRevoke(perm.id)}
                      className="px-2.5 py-1.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-300 hover:bg-rose-500/20 hover:text-rose-200 text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer shrink-0"
                      title="Thu hồi quyền chia sẻ này ngay lập tức"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Thu hồi
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  )
}
