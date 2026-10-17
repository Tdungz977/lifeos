import React, { useState, useEffect } from 'react'
import {
  Users,
  UserPlus,
  Search,
  Check,
  X,
  Shield,
  Heart,
  Sparkles,
  Flame,
  Plus,
  Send,
  AlertCircle,
  CheckCircle2,
  Lock,
  UserX,
  AlertTriangle,
  Info,
} from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { socialService } from '@/services/socialService'
import { Connection, Group, GroupMember, Profile, RelationshipType } from '@/types/database'
import { Card } from '@/components/common/Card'
import { Button } from '@/components/common/Button'
import { Input } from '@/components/common/Input'
import { Modal } from '@/components/common/Modal'
import { ReportModal } from '@/components/modals/ReportModal'
import { formatViDate } from '@/lib/utils'

export const SocialPage: React.FC = () => {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState<'connections' | 'requests' | 'search' | 'groups' | 'blocked'>('connections')

  // Connections state
  const [connections, setConnections] = useState<Connection[]>([])
  const [loadingConnections, setLoadingConnections] = useState(false)

  // Requests state
  const [incomingRequests, setIncomingRequests] = useState<Connection[]>([])
  const [outgoingRequests, setOutgoingRequests] = useState<Connection[]>([])
  const [loadingRequests, setLoadingRequests] = useState(false)

  // Search state
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<Profile[]>([])
  const [searching, setSearching] = useState(false)
  const [selectedRelation, setSelectedRelation] = useState<RelationshipType>('friend')
  const [isPrivateLover, setIsPrivateLover] = useState(false)
  const [inviteNotes, setInviteNotes] = useState('')
  const [inviteSuccess, setInviteSuccess] = useState('')
  const [inviteError, setInviteError] = useState('')

  // Groups state
  const [groups, setGroups] = useState<Group[]>([])
  const [loadingGroups, setLoadingGroups] = useState(false)
  const [showCreateGroup, setShowCreateGroup] = useState(false)
  const [newGroupName, setNewGroupName] = useState('')
  const [newGroupDesc, setNewGroupDesc] = useState('')
  const [newGroupCategory, setNewGroupCategory] = useState<Group['category']>('growth')

  // Group Details & Members state
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null)
  const [groupMembers, setGroupMembers] = useState<GroupMember[]>([])
  const [loadingMembers, setLoadingMembers] = useState(false)
  const [inviteMemberUsername, setInviteMemberUsername] = useState('')
  const [inviteMemberAlert, setInviteMemberAlert] = useState('')

  // Blocked Users state
  const [blockedUsers, setBlockedUsers] = useState<Profile[]>([])
  const [loadingBlocked, setLoadingBlocked] = useState(false)

  // Report Modal state
  const [reportModalOpen, setReportModalOpen] = useState(false)
  const [reportTarget, setReportTarget] = useState<{
    type: 'user' | 'group' | 'content'
    id: string
    name: string
  } | null>(null)

  // Cheer Modal state
  const [cheerModalOpen, setCheerModalOpen] = useState(false)
  const [cheerTargetUser, setCheerTargetUser] = useState<Profile | null>(null)
  const [cheerEmoji, setCheerEmoji] = useState('🔥')
  const [cheerMessage, setCheerMessage] = useState('')
  const [cheerSending, setCheerSending] = useState(false)
  const [cheerAlert, setCheerAlert] = useState('')

  // Load Connections
  const loadConnections = async () => {
    if (!user) return
    setLoadingConnections(true)
    const list = await socialService.fetchConnections(user.id)
    setConnections(list)
    setLoadingConnections(false)
  }

  // Load Requests
  const loadRequests = async () => {
    if (!user) return
    setLoadingRequests(true)
    const { incoming, outgoing } = await socialService.fetchPendingRequests(user.id)
    setIncomingRequests(incoming)
    setOutgoingRequests(outgoing)
    setLoadingRequests(false)
  }

  // Load Groups
  const loadGroups = async () => {
    if (!user) return
    setLoadingGroups(true)
    const list = await socialService.fetchUserGroups(user.id)
    setGroups(list)
    setLoadingGroups(false)
  }

  // Load Blocked Users
  const loadBlockedUsers = async () => {
    if (!user) return
    setLoadingBlocked(true)
    const list = await socialService.fetchBlockedUsers(user.id)
    setBlockedUsers(list)
    setLoadingBlocked(false)
  }

  useEffect(() => {
    if (activeTab === 'connections') loadConnections()
    if (activeTab === 'requests') loadRequests()
    if (activeTab === 'groups') loadGroups()
    if (activeTab === 'blocked') loadBlockedUsers()
  }, [user, activeTab])

  // Handle Search Users
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !searchQuery.trim()) return
    setSearching(true)
    setInviteError('')
    setInviteSuccess('')
    const results = await socialService.searchUsers(searchQuery, user.id)
    setSearchResults(results)
    setSearching(false)
  }

  // Send Connection Invite
  const handleSendInvite = async (targetUserId: string) => {
    if (!user) return
    setInviteError('')
    setInviteSuccess('')
    const { error } = await socialService.sendConnectionRequest(
      user.id,
      targetUserId,
      selectedRelation,
      inviteNotes,
      selectedRelation === 'companion' ? isPrivateLover : false
    )
    if (error) {
      setInviteError(error.message || 'Không thể gửi lời mời.')
    } else {
      setInviteSuccess('Đã gửi lời mời kết nối thành công!')
      setTimeout(() => setInviteSuccess(''), 3000)
      loadRequests()
    }
  }

  // Respond to request
  const handleRespond = async (connectionId: string, accept: boolean) => {
    if (!user) return
    await socialService.respondToConnectionRequest(connectionId, accept, user.id)
    loadRequests()
    loadConnections()
  }

  // Cancel outgoing request
  const handleCancelRequest = async (connectionId: string) => {
    if (!user) return
    await socialService.cancelConnectionRequest(connectionId, user.id)
    loadRequests()
  }

  // Remove connection
  const handleRemoveConnection = async (connectionId: string) => {
    if (!user || !confirm('Bạn có chắc chắn muốn hủy kết nối này?')) return
    await socialService.removeConnection(connectionId, user.id)
    loadConnections()
  }

  // Block user
  const handleBlockUser = async (targetUserId: string, targetName: string) => {
    if (!user) return
    if (!confirm(`Bạn có chắc muốn chặn người dùng "${targetName}"? Họ sẽ không thể gửi lời mời hoặc nhìn thấy bạn.`)) return
    await socialService.blockUser(user.id, targetUserId)
    loadConnections()
    loadBlockedUsers()
  }

  // Unblock user
  const handleUnblockUser = async (targetUserId: string) => {
    if (!user) return
    await socialService.unblockUser(user.id, targetUserId)
    loadBlockedUsers()
  }

  // Open Report Modal
  const openReport = (type: 'user' | 'group' | 'content', id: string, name: string) => {
    setReportTarget({ type, id, name })
    setReportModalOpen(true)
  }

  // Open Group Details
  const openGroupDetails = async (group: Group) => {
    setSelectedGroup(group)
    setInviteMemberAlert('')
    setInviteMemberUsername('')
    setLoadingMembers(true)
    const members = await socialService.fetchGroupMembers(group.id)
    setGroupMembers(members)
    setLoadingMembers(false)
  }

  // Invite member to group
  const handleInviteToGroup = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !selectedGroup || !inviteMemberUsername.trim()) return
    setInviteMemberAlert('Đang tìm kiếm người dùng...')
    const found = await socialService.searchUsers(inviteMemberUsername, user.id)
    if (found.length === 0) {
      setInviteMemberAlert('Không tìm thấy người dùng phù hợp với tên/username này.')
      return
    }
    const target = found[0]
    const { error } = await socialService.inviteToGroup(selectedGroup.id, target.id, user.id)
    if (error) {
      setInviteMemberAlert(error.message || 'Không thể mời người dùng vào nhóm.')
    } else {
      setInviteMemberAlert(`Đã gửi lời mời tham gia nhóm tới @${target.username || target.display_name}!`)
      setInviteMemberUsername('')
      const updated = await socialService.fetchGroupMembers(selectedGroup.id)
      setGroupMembers(updated)
    }
  }

  // Create Group
  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !newGroupName.trim()) return
    const { error } = await socialService.createGroup(
      user.id,
      newGroupName,
      newGroupDesc,
      newGroupCategory,
      true
    )
    if (!error) {
      setShowCreateGroup(false)
      setNewGroupName('')
      setNewGroupDesc('')
      loadGroups()
    }
  }

  // Send Social Cheer
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
      setCheerAlert('Đã gửi lời động viên thành công!')
      setTimeout(() => {
        setCheerAlert('')
        setCheerModalOpen(false)
        setCheerMessage('')
      }, 1500)
    }
  }

  const getRelationshipBadge = (type: RelationshipType, isPrivate?: boolean) => {
    switch (type) {
      case 'companion':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-rose-500/15 border border-rose-500/30 text-rose-300 flex items-center gap-1">
            <Heart className="w-3 h-3 text-rose-400 fill-rose-400/20" />
            {isPrivate ? 'Người yêu (Chế độ riêng tư)' : 'Đồng hành / Người yêu'}
          </span>
        )
      case 'teammate':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-500/15 border border-blue-500/30 text-blue-300 flex items-center gap-1">
            <Shield className="w-3 h-3 text-blue-400" />
            Đồng đội
          </span>
        )
      default:
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 flex items-center gap-1">
            <Users className="w-3 h-3 text-indigo-400" />
            Bạn bè
          </span>
        )
    }
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-[#F3F4F6] tracking-tight flex items-center gap-2">
            <Users className="w-6 h-6 text-[#7255F7]" />
            Kết nối & Đội ngũ Kỷ luật
          </h1>
          <p className="text-xs text-[#9CA3AF] mt-1">
            Xây dựng môi trường cùng tiến bộ, kết nối bạn bè, người yêu và nhóm mục tiêu.
          </p>
        </div>

        {/* Tab switchers */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-[#191725] border border-[#282538] overflow-x-auto scrollbar-none">
          <button
            onClick={() => setActiveTab('connections')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'connections'
                ? 'bg-[#7255F7] text-white shadow-sm'
                : 'text-[#9CA3AF] hover:text-[#F3F4F6]'
            }`}
          >
            Bạn bè ({connections.length})
          </button>
          <button
            onClick={() => setActiveTab('requests')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer relative ${
              activeTab === 'requests'
                ? 'bg-[#7255F7] text-white shadow-sm'
                : 'text-[#9CA3AF] hover:text-[#F3F4F6]'
            }`}
          >
            Lời mời
            {incomingRequests.length > 0 && (
              <span className="ml-1.5 px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-rose-500 text-white">
                {incomingRequests.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('search')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'search'
                ? 'bg-[#7255F7] text-white shadow-sm'
                : 'text-[#9CA3AF] hover:text-[#F3F4F6]'
            }`}
          >
            Tìm kiếm
          </button>
          <button
            onClick={() => setActiveTab('groups')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'groups'
                ? 'bg-[#7255F7] text-white shadow-sm'
                : 'text-[#9CA3AF] hover:text-[#F3F4F6]'
            }`}
          >
            Hội nhóm ({groups.length})
          </button>
          <button
            onClick={() => setActiveTab('blocked')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'blocked'
                ? 'bg-[#7255F7] text-white shadow-sm'
                : 'text-[#9CA3AF] hover:text-[#F3F4F6]'
            }`}
          >
            Đã chặn ({blockedUsers.length})
          </button>
        </div>
      </div>

      {/* TAB 1: CONNECTIONS LIST */}
      {activeTab === 'connections' && (
        <div className="space-y-4">
          {loadingConnections ? (
            <div className="p-12 text-center text-xs text-[#9CA3AF]">Đang tải danh sách kết nối...</div>
          ) : connections.length === 0 ? (
            <Card className="p-10 text-center space-y-3">
              <Users className="w-12 h-12 text-[#9CA3AF]/40 mx-auto" />
              <h3 className="text-base font-bold text-[#F3F4F6]">Chưa có kết nối nào</h3>
              <p className="text-xs text-[#9CA3AF] max-w-sm mx-auto">
                Đi một mình thì nhanh, đi cùng nhau thì xa. Hãy tìm kiếm bạn bè hoặc người đồng hành để cùng theo dõi tiến độ kỷ luật.
              </p>
              <Button
                variant="primary"
                size="sm"
                onClick={() => setActiveTab('search')}
                leftIcon={<UserPlus className="w-4 h-4" />}
              >
                Tìm kiếm bạn bè ngay
              </Button>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {connections.map((conn) => {
                const partner = conn.partner_profile
                const name = partner?.display_name || 'Chiến binh'
                const handle = partner?.username ? `@${partner.username}` : ''

                return (
                  <Card key={conn.id} className="p-5 flex flex-col justify-between gap-4 group hover:border-[#7255F7]/40 transition-all">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-500 overflow-hidden flex items-center justify-center font-bold text-white text-base shadow-md shrink-0">
                          {partner?.avatar_url ? (
                            <img src={partner.avatar_url} alt="" className="w-full h-full object-cover" />
                          ) : (
                            name.slice(0, 2).toUpperCase()
                          )}
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-[#F3F4F6]">{name}</h4>
                          {handle && <p className="text-xs text-[#7255F7] font-medium">{handle}</p>}
                          <div className="mt-1">
                            {getRelationshipBadge(conn.relationship_type, conn.is_private_relationship)}
                          </div>
                        </div>
                      </div>
                    </div>

                    {partner?.growth_goal && (
                      <p className="text-xs text-[#9CA3AF] italic bg-[#191725] p-2.5 rounded-xl border border-[#282538]">
                        "{partner.growth_goal}"
                      </p>
                    )}

                    <div className="flex items-center justify-between pt-2 border-t border-[#282538]/60 text-xs">
                      <button
                        onClick={() => {
                          setCheerTargetUser(partner || null)
                          setCheerModalOpen(true)
                        }}
                        className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500/15 to-rose-500/15 border border-amber-500/30 text-amber-300 hover:text-white flex items-center gap-1.5 font-semibold transition-all cursor-pointer"
                      >
                        <Flame className="w-3.5 h-3.5 text-rose-400" />
                        Động viên
                      </button>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => partner && openReport('user', partner.id, name)}
                          className="text-slate-500 hover:text-amber-400 text-[11px] transition-colors cursor-pointer"
                          title="Báo cáo người dùng vi phạm"
                        >
                          Báo cáo
                        </button>
                        <span className="text-slate-700">·</span>
                        <button
                          onClick={() => handleRemoveConnection(conn.id)}
                          className="text-[#9CA3AF] hover:text-rose-400 text-[11px] transition-colors cursor-pointer"
                          title="Hủy kết nối"
                        >
                          Hủy
                        </button>
                        <span className="text-slate-700">·</span>
                        <button
                          onClick={() => partner && handleBlockUser(partner.id, name)}
                          className="text-slate-500 hover:text-rose-400 text-[11px] transition-colors cursor-pointer"
                          title="Chặn người này"
                        >
                          Chặn
                        </button>
                      </div>
                    </div>
                  </Card>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: REQUESTS (INCOMING & OUTGOING) */}
      {activeTab === 'requests' && (
        <div className="space-y-6">
          {/* Incoming */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-[#F3F4F6] flex items-center gap-2">
              <UserPlus className="w-4 h-4 text-[#7255F7]" />
              Lời mời nhận được ({incomingRequests.length})
            </h3>

            {incomingRequests.length === 0 ? (
              <p className="text-xs text-[#9CA3AF] italic">Không có lời mời nào đang chờ xử lý.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {incomingRequests.map((req) => (
                  <Card key={req.id} className="p-4 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-purple-600/30 border border-purple-500/40 flex items-center justify-center font-bold text-purple-300">
                        {req.partner_profile?.display_name?.slice(0, 2).toUpperCase() || 'CB'}
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-[#F3F4F6]">
                          {req.partner_profile?.display_name || 'Chiến binh'}
                        </h4>
                        <div className="mt-0.5">{getRelationshipBadge(req.relationship_type)}</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleRespond(req.id, true)}
                        className="px-3 py-1.5 rounded-xl bg-emerald-600/20 border border-emerald-500/40 text-emerald-300 hover:bg-emerald-600/30 text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer"
                      >
                        <Check className="w-3.5 h-3.5" />
                        Đồng ý
                      </button>
                      <button
                        onClick={() => handleRespond(req.id, false)}
                        className="px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-400 hover:text-slate-200 text-xs font-medium flex items-center gap-1 transition-all cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                        Từ chối
                      </button>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Outgoing */}
          <div className="space-y-3 pt-4 border-t border-[#282538]">
            <h3 className="text-sm font-bold text-[#F3F4F6]">Lời mời đã gửi ({outgoingRequests.length})</h3>

            {outgoingRequests.length === 0 ? (
              <p className="text-xs text-[#9CA3AF] italic">Bạn chưa gửi lời mời nào đang chờ phản hồi.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {outgoingRequests.map((req) => (
                  <Card key={req.id} className="p-4 flex items-center justify-between gap-4">
                    <div>
                      <h4 className="text-sm font-semibold text-[#F3F4F6]">
                        {req.partner_profile?.display_name || 'Người dùng'}
                      </h4>
                      <p className="text-[11px] text-[#9CA3AF]">
                        Đã gửi vào {formatViDate(new Date(req.created_at), 'dd/MM/yyyy')}
                      </p>
                    </div>

                    <button
                      onClick={() => handleCancelRequest(req.id)}
                      className="px-3 py-1 rounded-xl bg-slate-800 text-slate-400 hover:text-rose-400 text-xs transition-colors cursor-pointer"
                    >
                      Hủy lời mời
                    </button>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: SEARCH USERS */}
      {activeTab === 'search' && (
        <div className="space-y-6 max-w-2xl mx-auto">
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-[#9CA3AF] absolute left-3.5 top-3.5" />
              <input
                type="text"
                placeholder="Tìm theo @username hoặc tên hiển thị..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#13111C] border border-[#282538] text-sm text-[#F3F4F6] placeholder-[#9CA3AF]/60 focus:outline-none focus:border-[#7255F7]"
              />
            </div>
            <Button type="submit" variant="primary" isLoading={searching}>
              Tìm kiếm
            </Button>
          </form>

          {inviteSuccess && (
            <div className="p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-800/60 text-emerald-300 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>{inviteSuccess}</span>
            </div>
          )}

          {inviteError && (
            <div className="p-3.5 rounded-xl bg-rose-950/40 border border-rose-800/60 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400" />
              <span>{inviteError}</span>
            </div>
          )}

          {/* Results */}
          <div className="space-y-3">
            {searchResults.length > 0 && (
              <div className="space-y-2 pb-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#F3F4F6]">Kết quả tìm kiếm ({searchResults.length})</span>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-[#9CA3AF]">Loại quan hệ:</span>
                    <select
                      value={selectedRelation}
                      onChange={(e) => setSelectedRelation(e.target.value as RelationshipType)}
                      className="bg-[#191725] border border-[#282538] rounded-lg px-2 py-1 text-xs text-[#F3F4F6]"
                    >
                      <option value="friend">Bạn bè</option>
                      <option value="companion">Đồng hành / Người yêu</option>
                      <option value="teammate">Đồng đội</option>
                    </select>
                  </div>
                </div>

                {selectedRelation === 'companion' && (
                  <label className="flex items-center gap-2 p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-300 cursor-pointer animate-fade-in">
                    <input
                      type="checkbox"
                      checked={isPrivateLover}
                      onChange={(e) => setIsPrivateLover(e.target.checked)}
                      className="rounded bg-slate-900 border-slate-700 text-rose-600 focus:ring-rose-500"
                    />
                    <span>Quan hệ người yêu riêng tư (chỉ 2 người thấy, không hiển thị công khai trên hồ sơ)</span>
                  </label>
                )}
              </div>
            )}

            {searchResults.map((resUser) => (
              <Card key={resUser.id} className="p-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#7255F7]/20 border border-[#7255F7]/30 overflow-hidden flex items-center justify-center font-bold text-[#B2A2FA] shrink-0">
                    {resUser.avatar_url ? (
                      <img src={resUser.avatar_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      resUser.display_name?.slice(0, 2).toUpperCase() || 'US'
                    )}
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-[#F3F4F6]">{resUser.display_name}</h4>
                    {resUser.username && (
                      <p className="text-xs text-[#7255F7]">@{resUser.username}</p>
                    )}
                    {resUser.bio && <p className="text-xs text-[#9CA3AF] mt-0.5 line-clamp-1">{resUser.bio}</p>}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => openReport('user', resUser.id, resUser.display_name || 'Người dùng')}
                    className="text-slate-500 hover:text-amber-400 p-1.5 transition-colors cursor-pointer"
                    title="Báo cáo người dùng"
                  >
                    <AlertTriangle className="w-4 h-4" />
                  </button>
                  <Button
                    size="sm"
                    variant="primary"
                    onClick={() => handleSendInvite(resUser.id)}
                    leftIcon={<UserPlus className="w-3.5 h-3.5" />}
                  >
                    Kết nối
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: GROUPS */}
      {activeTab === 'groups' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-[#9CA3AF]">
              Nhóm kỷ luật chung: học tập, rèn luyện thể lực và thử thách nhóm.
            </p>
            <Button
              variant="primary"
              size="sm"
              onClick={() => setShowCreateGroup(true)}
              leftIcon={<Plus className="w-4 h-4" />}
            >
              Tạo nhóm mới
            </Button>
          </div>

          {loadingGroups ? (
            <div className="p-12 text-center text-xs text-[#9CA3AF]">Đang tải danh sách nhóm...</div>
          ) : groups.length === 0 ? (
            <Card className="p-10 text-center space-y-3">
              <Shield className="w-12 h-12 text-[#9CA3AF]/40 mx-auto" />
              <h3 className="text-base font-bold text-[#F3F4F6]">Bạn chưa tham gia nhóm nào</h3>
              <p className="text-xs text-[#9CA3AF] max-w-sm mx-auto">
                Tạo nhóm để kết nối nhiều thành viên cùng chí hướng, cùng chia sẻ mục tiêu kỷ luật.
              </p>
              <Button
                variant="primary"
                size="sm"
                onClick={() => setShowCreateGroup(true)}
                leftIcon={<Plus className="w-4 h-4" />}
              >
                Tạo nhóm đầu tiên
              </Button>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {groups.map((group) => (
                <Card key={group.id} className="p-5 flex flex-col justify-between gap-3">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-purple-500/20 text-purple-300">
                        {group.category}
                      </span>
                      <span className="text-[11px] font-medium text-slate-400">
                        Vai trò: <strong className="text-slate-200">{group.current_user_role}</strong>
                      </span>
                    </div>
                    <h3 className="text-base font-bold text-[#F3F4F6] mt-2">{group.name}</h3>
                    {group.description && (
                      <p className="text-xs text-[#9CA3AF] mt-1 line-clamp-2">{group.description}</p>
                    )}
                  </div>

                  <div className="pt-3 border-t border-[#282538] flex items-center justify-between text-xs">
                    <button
                      onClick={() => openGroupDetails(group)}
                      className="px-2.5 py-1 rounded-lg bg-indigo-600/15 text-indigo-300 hover:bg-indigo-600/25 font-semibold text-[11px] transition-colors cursor-pointer"
                    >
                      Xem thành viên
                    </button>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => openReport('group', group.id, group.name)}
                        className="text-slate-500 hover:text-amber-400 text-[11px] transition-colors cursor-pointer"
                        title="Báo cáo nhóm"
                      >
                        Báo cáo
                      </button>
                      <button
                        onClick={() => socialService.leaveGroup(group.id, user!.id).then(loadGroups)}
                        className="text-[#9CA3AF] hover:text-rose-400 text-[11px] transition-colors cursor-pointer"
                      >
                        Rời nhóm
                      </button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 5: BLOCKED USERS */}
      {activeTab === 'blocked' && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 text-xs text-slate-400">
            <UserX className="w-4 h-4 text-rose-400 shrink-0" />
            <span>
              Danh sách những người dùng bạn đã chặn. Họ không thể tìm kiếm, gửi lời mời hay xem hồ sơ của bạn.
            </span>
          </div>

          {loadingBlocked ? (
            <div className="p-12 text-center text-xs text-slate-400">Đang tải danh sách chặn...</div>
          ) : blockedUsers.length === 0 ? (
            <Card className="p-10 text-center space-y-2">
              <UserX className="w-10 h-10 text-slate-600 mx-auto" />
              <p className="text-sm font-semibold text-slate-300">Không có người dùng nào bị chặn</p>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Khi bạn chặn một người dùng, họ sẽ được đưa vào danh sách này và bạn có thể bỏ chặn bất cứ lúc nào.
              </p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {blockedUsers.map((bUser) => (
                <Card key={bUser.id} className="p-4 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-rose-950/40 border border-rose-800/50 flex items-center justify-center font-bold text-rose-300 shrink-0">
                      {bUser.avatar_url ? (
                        <img src={bUser.avatar_url} alt="" className="w-full h-full rounded-xl object-cover" />
                      ) : (
                        bUser.display_name?.slice(0, 2).toUpperCase() || 'US'
                      )}
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-slate-200">{bUser.display_name}</h4>
                      {bUser.username && <p className="text-xs text-slate-500">@{bUser.username}</p>}
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleUnblockUser(bUser.id)}
                  >
                    Bỏ chặn
                  </Button>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* GROUP DETAILS & MEMBERS MODAL */}
      {selectedGroup && (
        <Modal
          isOpen={!!selectedGroup}
          onClose={() => setSelectedGroup(null)}
          title={`Thành viên: ${selectedGroup.name}`}
          description={`Danh sách các thành viên trong nhóm (${groupMembers.length} thành viên)`}
        >
          <div className="space-y-4">
            {/* Invite by username form */}
            <form onSubmit={handleInviteToGroup} className="space-y-2">
              <label className="block text-xs font-semibold text-slate-300">
                Mời thành viên mới vào nhóm
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Nhập @username hoặc tên bạn bè..."
                  value={inviteMemberUsername}
                  onChange={(e) => setInviteMemberUsername(e.target.value)}
                  className="flex-1 px-3 py-2 rounded-xl bg-[#13111C] border border-[#282538] text-xs text-[#F3F4F6] focus:outline-none focus:border-[#7255F7]"
                />
                <Button type="submit" size="sm" variant="primary">
                  Mời vào nhóm
                </Button>
              </div>
              {inviteMemberAlert && (
                <p className="text-[11px] text-indigo-400">{inviteMemberAlert}</p>
              )}
            </form>

            {/* Members list */}
            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {loadingMembers ? (
                <div className="py-4 text-center text-xs text-slate-400">Đang tải danh sách thành viên...</div>
              ) : groupMembers.length === 0 ? (
                <p className="text-xs text-slate-400 italic">Chưa có thành viên nào.</p>
              ) : (
                groupMembers.map((member) => (
                  <div
                    key={member.id}
                    className="p-2.5 rounded-xl bg-[#12101D] border border-[#282538] flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-purple-600/20 text-purple-300 font-bold flex items-center justify-center text-xs">
                        {member.profile?.display_name?.slice(0, 2).toUpperCase() || 'MB'}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-200">
                          {member.profile?.display_name || 'Thành viên'}
                        </p>
                        <span className="text-[10px] text-indigo-400 uppercase font-semibold">
                          {member.role === 'owner' ? 'Trưởng nhóm' : member.role}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="flex justify-end pt-2 border-t border-[#282538]">
              <Button variant="ghost" size="sm" onClick={() => setSelectedGroup(null)}>
                Đóng
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* CREATE GROUP MODAL */}
      <Modal isOpen={showCreateGroup} onClose={() => setShowCreateGroup(false)} title="Tạo nhóm kỷ luật mới">
        <form onSubmit={handleCreateGroup} className="space-y-4">
          <Input
            label="Tên nhóm"
            value={newGroupName}
            onChange={(e) => setNewGroupName(e.target.value)}
            placeholder="Ví dụ: Đội Kỷ Luật 5AM, Nhóm Ôn Thi IELTS"
            required
          />

          <div>
            <label className="block text-xs font-semibold text-[#EDEAF8] mb-1.5">Lĩnh vực hoạt động</label>
            <select
              value={newGroupCategory}
              onChange={(e) => setNewGroupCategory(e.target.value as any)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#191725] border border-[#282538] text-sm text-[#F3F4F6]"
            >
              <option value="growth">Phát triển bản thân</option>
              <option value="study">Học tập & Nghiên cứu</option>
              <option value="workout">Rèn luyện thể lực & Sức khỏe</option>
              <option value="challenge">Thử thách thi đua</option>
              <option value="work">Công việc & Dự án</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#EDEAF8] mb-1.5">Mô tả mục tiêu nhóm</label>
            <textarea
              value={newGroupDesc}
              onChange={(e) => setNewGroupDesc(e.target.value)}
              placeholder="Quy tắc, mục tiêu chung và cam kết kỷ luật của các thành viên..."
              rows={3}
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#191725] border border-[#282538] text-sm text-[#F3F4F6] resize-none"
            />
          </div>

          <div className="flex items-center gap-2 p-3 rounded-xl bg-[#191725] border border-[#282538] text-xs text-[#9CA3AF]">
            <Lock className="w-4 h-4 text-[#7255F7] shrink-0" />
            <span>Dữ liệu của các thành viên được bảo mật riêng tư, không tự ý công khai khi vào nhóm.</span>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setShowCreateGroup(false)}>
              Hủy
            </Button>
            <Button type="submit" variant="primary">
              Tạo nhóm
            </Button>
          </div>
        </form>
      </Modal>

      {/* SOCIAL CHEER MODAL */}
      <Modal isOpen={cheerModalOpen} onClose={() => setCheerModalOpen(false)} title={`Động viên ${cheerTargetUser?.display_name || ''}`}>
        <div className="space-y-4">
          <p className="text-xs text-[#9CA3AF]">
            Gửi năng lượng tích cực tiếp lửa cho đồng đội trên hành trình kỷ luật:
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
              placeholder="Ví dụ: Giữ vững phong độ nhé! Cố lên!"
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#191725] border border-[#282538] text-sm text-[#F3F4F6]"
            />
          </div>

          {cheerAlert && (
            <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-800/60 text-emerald-300 text-xs">
              {cheerAlert}
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

      {/* REPORT CONTENT MODAL */}
      {reportTarget && (
        <ReportModal
          isOpen={reportModalOpen}
          onClose={() => {
            setReportModalOpen(false)
            setReportTarget(null)
          }}
          targetType={reportTarget.type}
          targetId={reportTarget.id}
          targetName={reportTarget.name}
        />
      )}
    </div>
  )
}
