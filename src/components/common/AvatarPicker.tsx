import React, { useState } from 'react'
import { Check, Sparkles, Image as ImageIcon, RefreshCw } from 'lucide-react'
import { Input } from './Input'
import { Button } from './Button'

interface AvatarPickerProps {
  currentAvatar: string | null
  displayName?: string
  onSelect: (url: string) => void
}

// Curated high quality avatars using reliable styles
const PRESET_AVATARS = [
  { id: '1', style: 'adventurer', seed: 'Felix', label: 'Chiến binh Alex' },
  { id: '2', style: 'adventurer', seed: 'Luna', label: 'Tập trung Luna' },
  { id: '3', style: 'lorelei', seed: 'Oliver', label: 'Sáng tạo Oliver' },
  { id: '4', style: 'lorelei', seed: 'Aria', label: 'Điềm tĩnh Aria' },
  { id: '5', style: 'bottts', seed: 'Cyber1', label: 'AI Pilot' },
  { id: '6', style: 'bottts', seed: 'RoboZen', label: 'Robo Zen' },
  { id: '7', style: 'personas', seed: 'Discipline', label: 'Kỷ luật Marcus' },
  { id: '8', style: 'personas', seed: 'FocusPro', label: 'Pro Focus' },
  { id: '9', style: 'micah', seed: 'Leo', label: 'Bền bỉ Leo' },
  { id: '10', style: 'micah', seed: 'Mia', label: 'Quyết đoán Mia' },
]

export const getDicebearUrl = (style: string, seed: string) =>
  `https://api.dicebear.com/7.x/${style}/svg?seed=${encodeURIComponent(seed)}&backgroundColor=1e1b4b,31104b,0f172a`

export const AvatarPicker: React.FC<AvatarPickerProps> = ({
  currentAvatar,
  displayName = 'Chiến binh',
  onSelect,
}) => {
  const [customUrl, setCustomUrl] = useState('')
  const [selected, setSelected] = useState<string>(currentAvatar || '')
  const [activeTab, setActiveTab] = useState<'presets' | 'custom'>('presets')

  const handlePick = (url: string) => {
    setSelected(url)
    onSelect(url)
  }

  const handleApplyCustom = (e: React.FormEvent) => {
    e.preventDefault()
    if (customUrl.trim()) {
      handlePick(customUrl.trim())
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
          Ảnh đại diện hồ sơ
        </label>
        <div className="flex items-center gap-1 p-0.5 bg-[#191725] rounded-lg border border-[#282538] text-[11px]">
          <button
            type="button"
            onClick={() => setActiveTab('presets')}
            className={`px-2.5 py-1 rounded font-medium transition-all cursor-pointer ${
              activeTab === 'presets'
                ? 'bg-[#7255F7] text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Bộ sưu tập
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('custom')}
            className={`px-2.5 py-1 rounded font-medium transition-all cursor-pointer ${
              activeTab === 'custom'
                ? 'bg-[#7255F7] text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Link ảnh tùy chỉnh
          </button>
        </div>
      </div>

      {/* Current Preview */}
      <div className="flex items-center gap-4 p-3 rounded-2xl bg-[#12101D] border border-[#282538]">
        <div className="relative w-16 h-16 rounded-2xl overflow-hidden bg-gradient-to-tr from-purple-700 via-indigo-600 to-blue-500 p-0.5 shadow-lg shadow-indigo-950/50 shrink-0">
          <div className="w-full h-full rounded-[14px] overflow-hidden bg-[#161424] flex items-center justify-center">
            {selected ? (
              <img
                src={selected}
                alt="Avatar"
                className="w-full h-full object-cover"
                onError={(e) => {
                  // Fallback on invalid url
                  ;(e.target as HTMLElement).style.display = 'none'
                }}
              />
            ) : (
              <span className="font-extrabold text-xl text-indigo-300">
                {displayName.slice(0, 2).toUpperCase()}
              </span>
            )}
          </div>
        </div>

        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-white">{displayName}</span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 font-medium">
              LIFEOS Avatar
            </span>
          </div>
          <p className="text-xs text-slate-400">
            {selected
              ? 'Ảnh đại diện đã chọn sẽ hiển thị trong cộng đồng, nhóm và bảng so sánh.'
              : 'Chưa chọn ảnh, hệ thống sẽ sử dụng chữ cái đầu tiên.'}
          </p>
        </div>
      </div>

      {/* Preset Avatars Grid */}
      {activeTab === 'presets' ? (
        <div className="grid grid-cols-5 sm:grid-cols-10 gap-2.5">
          {PRESET_AVATARS.map((av) => {
            const url = getDicebearUrl(av.style, av.seed)
            const isSelected = selected === url

            return (
              <button
                key={av.id}
                type="button"
                onClick={() => handlePick(url)}
                className={`group relative aspect-square rounded-xl overflow-hidden border-2 transition-all p-0.5 cursor-pointer hover:scale-105 ${
                  isSelected
                    ? 'border-[#7255F7] shadow-md shadow-[#7255F7]/30 bg-[#7255F7]/20 scale-105'
                    : 'border-[#282538] hover:border-slate-600 bg-[#161424]'
                }`}
                title={av.label}
              >
                <img src={url} alt={av.label} className="w-full h-full rounded-lg object-cover" />
                {isSelected && (
                  <div className="absolute inset-0 bg-[#7255F7]/40 flex items-center justify-center">
                    <Check className="w-4 h-4 text-white drop-shadow-md" />
                  </div>
                )}
              </button>
            )
          })}
        </div>
      ) : (
        <form onSubmit={handleApplyCustom} className="flex gap-2">
          <Input
            placeholder="Nhập đường dẫn ảnh trực tiếp (https://...)"
            value={customUrl}
            onChange={(e) => setCustomUrl(e.target.value)}
            leftIcon={<ImageIcon className="w-4 h-4" />}
            className="flex-1"
          />
          <Button type="submit" variant="primary" size="md">
            Áp dụng
          </Button>
        </form>
      )}
    </div>
  )
}
