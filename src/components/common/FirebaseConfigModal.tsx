import React, { useState } from 'react'
import { Flame, CheckCircle2, AlertCircle, Save, Trash2, Key } from 'lucide-react'
import { Modal } from './Modal'
import { Button } from './Button'
import { Input } from './Input'
import {
  activeFirebaseConfig,
  isFirebaseConfigured,
  saveFirebaseConfig,
  clearFirebaseConfig,
  FirebaseConfig,
} from '@/lib/firebase'

interface FirebaseConfigModalProps {
  isOpen: boolean
  onClose: () => void
}

export const FirebaseConfigModal: React.FC<FirebaseConfigModalProps> = ({ isOpen, onClose }) => {
  const configured = isFirebaseConfigured()
  const [apiKey, setApiKey] = useState(activeFirebaseConfig.apiKey)
  const [authDomain, setAuthDomain] = useState(activeFirebaseConfig.authDomain)
  const [projectId, setProjectId] = useState(activeFirebaseConfig.projectId)
  const [storageBucket, setStorageBucket] = useState(activeFirebaseConfig.storageBucket || '')
  const [messagingSenderId, setMessagingSenderId] = useState(activeFirebaseConfig.messagingSenderId || '')
  const [appId, setAppId] = useState(activeFirebaseConfig.appId)
  const [jsonInput, setJsonInput] = useState('')
  const [showJsonParser, setShowJsonParser] = useState(false)

  const handleParseJson = () => {
    try {
      // Find object inside json or javascript config snippet
      const cleanJson = jsonInput.trim()
      const match = cleanJson.match(/\{[\s\S]*\}/)
      if (match) {
        // Replace unquoted keys
        const jsonStr = match[0].replace(/([a-zA-Z0-9_]+)\s*:/g, '"$1":')
        const parsed = JSON.parse(jsonStr)
        if (parsed.apiKey) setApiKey(parsed.apiKey)
        if (parsed.authDomain) setAuthDomain(parsed.authDomain)
        if (parsed.projectId) setProjectId(parsed.projectId)
        if (parsed.storageBucket) setStorageBucket(parsed.storageBucket)
        if (parsed.messagingSenderId) setMessagingSenderId(parsed.messagingSenderId)
        if (parsed.appId) setAppId(parsed.appId)
        setShowJsonParser(false)
        setJsonInput('')
      }
    } catch {
      alert('Không thể đọc mã cấu hình. Vui lòng kiểm tra lại định dạng JSON.')
    }
  }

  const handleSave = () => {
    const config: FirebaseConfig = {
      apiKey: apiKey.trim(),
      authDomain: authDomain.trim(),
      projectId: projectId.trim(),
      storageBucket: storageBucket.trim(),
      messagingSenderId: messagingSenderId.trim(),
      appId: appId.trim(),
    }
    saveFirebaseConfig(config)
  }

  const handleClear = () => {
    if (confirm('Bạn có chắc chắn muốn xóa cấu hình Firebase đã lưu?')) {
      clearFirebaseConfig()
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Cấu hình Kết Nối Firebase"
      description="Quản lý kết nối cơ sở dữ liệu và xác thực Firebase của hệ thống LIFEOS"
      maxWidth="lg"
    >
      <div className="space-y-4 text-xs">
        {/* Status card */}
        <div
          className={`p-3.5 rounded-xl border flex items-center justify-between ${
            configured
              ? 'bg-emerald-950/20 border-emerald-800/50 text-emerald-300'
              : 'bg-amber-950/20 border-amber-800/50 text-amber-300'
          }`}
        >
          <div className="flex items-center gap-3">
            {configured ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-amber-400 shrink-0" />
            )}
            <div>
              <p className="font-semibold text-sm">
                {configured ? 'Firebase Đã Sẵn Sàng' : 'Chế độ Cục Bộ (Chưa kết nối Firebase Cloud)'}
              </p>
              <p className="text-[11px] opacity-80 mt-0.5">
                {configured
                  ? 'Ứng dụng đang đồng bộ dữ liệu thời gian thực với Firebase Auth & Cloud Firestore.'
                  : 'Ứng dụng vẫn hoạt động lưu trữ dữ liệu hoàn toàn bình thường trên trình duyệt của bạn.'}
              </p>
            </div>
          </div>
        </div>

        {/* Quick JSON paste toggle */}
        <div className="flex justify-between items-center pt-1">
          <span className="font-semibold text-on-surface">Thông tin dự án Firebase</span>
          <button
            type="button"
            onClick={() => setShowJsonParser(!showJsonParser)}
            className="text-secondary hover:underline cursor-pointer font-medium"
          >
            {showJsonParser ? 'Nhập từng ô' : 'Dán mã config (JSON)'}
          </button>
        </div>

        {showJsonParser ? (
          <div className="space-y-2 p-3 bg-surface-container-low rounded-xl border border-slate-200/80">
            <p className="text-on-surface-variant">
              Dán đoạn mã <code>const firebaseConfig = &#123; ... &#125;;</code> từ Firebase Console vào đây:
            </p>
            <textarea
              rows={5}
              value={jsonInput}
              onChange={(e) => setJsonInput(e.target.value)}
              placeholder="apiKey: '...', projectId: '...', appId: '...'"
              className="w-full p-2.5 rounded-lg bg-surface-container-lowest border border-slate-300 font-mono text-xs text-on-surface"
            />
            <Button size="sm" variant="primary" onClick={handleParseJson}>
              Trích xuất dữ liệu
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-surface-container-low rounded-xl border border-slate-200/80">
            <Input
              label="API Key"
              placeholder="AIzaSy..."
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
            />
            <Input
              label="Project ID"
              placeholder="your-project-id"
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
            />
            <Input
              label="Auth Domain"
              placeholder="your-project-id.firebaseapp.com"
              value={authDomain}
              onChange={(e) => setAuthDomain(e.target.value)}
            />
            <Input
              label="App ID"
              placeholder="1:123456789:web:abcdef..."
              value={appId}
              onChange={(e) => setAppId(e.target.value)}
            />
            <Input
              label="Storage Bucket (Tùy chọn)"
              placeholder="your-project.appspot.com"
              value={storageBucket}
              onChange={(e) => setStorageBucket(e.target.value)}
            />
            <Input
              label="Messaging Sender ID (Tùy chọn)"
              placeholder="1234567890"
              value={messagingSenderId}
              onChange={(e) => setMessagingSenderId(e.target.value)}
            />
          </div>
        )}

        <div className="flex items-center justify-between pt-2">
          {configured ? (
            <Button
              variant="outline"
              size="sm"
              onClick={handleClear}
              leftIcon={<Trash2 className="w-3.5 h-3.5 text-rose-500" />}
              className="text-rose-500 border-rose-200 hover:bg-rose-50"
            >
              Xóa cấu hình
            </Button>
          ) : <div />}

          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={onClose}>
              Đóng
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleSave}
              leftIcon={<Save className="w-3.5 h-3.5" />}
            >
              Lưu cấu hình
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  )
}
