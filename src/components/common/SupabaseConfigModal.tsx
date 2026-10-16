import React, { useState } from 'react'
import { Database, CheckCircle2, AlertCircle, Copy, Check, ExternalLink, RefreshCw } from 'lucide-react'
import { Modal } from './Modal'
import { Button } from './Button'
import { Input } from './Input'
import { activeSupabaseUrl, activeSupabaseAnonKey, isSupabaseConfigured, saveSupabaseConfig, clearSupabaseConfig } from '@/lib/supabase'

interface SupabaseConfigModalProps {
  isOpen: boolean
  onClose: () => void
}

export const SupabaseConfigModal: React.FC<SupabaseConfigModalProps> = ({ isOpen, onClose }) => {
  const configured = isSupabaseConfigured()
  const [url, setUrl] = useState(activeSupabaseUrl)
  const [key, setKey] = useState(activeSupabaseAnonKey)
  const [copied, setCopied] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  const handleSave = () => {
    setIsSaving(true)
    saveSupabaseConfig(url, key)
  }

  const handleClear = () => {
    if (confirm('Bạn có chắc chắn muốn xóa cấu hình Supabase đã lưu?')) {
      clearSupabaseConfig()
    }
  }

  const copyMigrationPath = () => {
    navigator.clipboard.writeText('supabase/migrations/20261016_initial_lifeos_schema.sql')
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Cấu hình Kết Nối Supabase"
      description="Quản lý kết nối cơ sở dữ liệu và bảng xác thực Supabase của hệ thống LIFEOS"
      maxWidth="lg"
    >
      <div className="space-y-5 text-sm">
        {/* Status card */}
        <div
          className={`p-4 rounded-xl border flex items-center justify-between ${
            configured
              ? 'bg-emerald-950/20 border-emerald-800/50 text-emerald-300'
              : 'bg-amber-950/20 border-amber-800/50 text-amber-300'
          }`}
        >
          <div className="flex items-center gap-3">
            {configured ? (
              <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-6 h-6 text-amber-400 shrink-0" />
            )}
            <div>
              <p className="font-semibold text-sm">
                {configured ? 'Supabase Đã Được Kết Nối' : 'Chưa Kết Nối Supabase'}
              </p>
              <p className="text-xs opacity-80 mt-0.5">
                {configured
                  ? 'Ứng dụng đang đồng bộ dữ liệu người dùng thực tế với Supabase Auth & PostgreSQL.'
                  : 'Vui lòng cung cấp Project URL và Anon Key từ Supabase Dashboard của bạn.'}
              </p>
            </div>
          </div>
        </div>

        {/* Input form */}
        <div className="space-y-3.5 bg-slate-900/60 p-4 rounded-xl border border-slate-800">
          <Input
            label="Supabase Project URL"
            placeholder="https://xyzcompany.supabase.co"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            helperText="Tìm thấy tại Supabase Dashboard -> Project Settings -> API"
          />
          <Input
            label="Supabase Anon Public Key"
            placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6..."
            type="password"
            value={key}
            onChange={(e) => setKey(e.target.value)}
            helperText="Khóa công khai anon (an toàn để sử dụng ở frontend)"
          />

          <div className="flex items-center justify-between pt-2">
            {configured && (
              <Button variant="ghost" size="sm" onClick={handleClear} className="text-rose-400 hover:text-rose-300">
                Xóa cấu hình
              </Button>
            )}
            <div className="ml-auto flex items-center gap-2">
              <Button variant="secondary" size="sm" onClick={onClose}>
                Đóng
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleSave}
                isLoading={isSaving}
                leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
              >
                Lưu & Kết Nối Lại
              </Button>
            </div>
          </div>
        </div>

        {/* Migration Guide Notice */}
        <div className="bg-[#111827] p-4 rounded-xl border border-slate-800 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="font-medium text-slate-200 flex items-center gap-2 text-xs uppercase tracking-wider">
              <Database className="w-4 h-4 text-indigo-400" />
              File Khởi Tạo Database Schema (RLS)
            </span>
            <button
              onClick={copyMigrationPath}
              className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'Đã sao chép đường dẫn' : 'Sao chép đường dẫn'}
            </button>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            Dự án đã chuẩn bị sẵn file schema hoàn chỉnh với 12 bảng và toàn bộ chính sách Row Level Security (RLS) tại:
          </p>
          <code className="block p-2 rounded bg-slate-950 text-indigo-300 text-xs font-mono border border-slate-800 break-all select-all">
            supabase/migrations/20261016_initial_lifeos_schema.sql
          </code>
          <p className="text-xs text-slate-400">
            Chỉ cần mở Supabase Dashboard &rarr; <strong>SQL Editor</strong> &rarr; Dán toàn bộ nội dung file này và bấm <strong>Run</strong>.
          </p>
        </div>
      </div>
    </Modal>
  )
}
