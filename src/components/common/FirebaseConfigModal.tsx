import React, { useState } from 'react'
import { Flame, CheckCircle2, AlertCircle, Save, Trash2, Key, Code2, ShieldCheck, Sparkles } from 'lucide-react'
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
  const [measurementId, setMeasurementId] = useState(activeFirebaseConfig.measurementId || '')
  const [jsonInput, setJsonInput] = useState('')
  const [showJsonParser, setShowJsonParser] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  const handleParseJson = () => {
    try {
      setErrorMessage('')
      const cleanJson = jsonInput.trim()
      // Support javascript snippet `const firebaseConfig = { ... };` or plain JSON
      const match = cleanJson.match(/\{[\s\S]*\}/)
      if (match) {
        // Normalize unquoted keys if snippet is JS
        const jsonStr = match[0]
          .replace(/([a-zA-Z0-9_]+)\s*:/g, '"$1":')
          .replace(/,\s*\}/g, '}')
          .replace(/'/g, '"')

        const parsed = JSON.parse(jsonStr)
        if (parsed.apiKey) setApiKey(parsed.apiKey)
        if (parsed.authDomain) setAuthDomain(parsed.authDomain)
        if (parsed.projectId) setProjectId(parsed.projectId)
        if (parsed.storageBucket) setStorageBucket(parsed.storageBucket)
        if (parsed.messagingSenderId) setMessagingSenderId(parsed.messagingSenderId)
        if (parsed.appId) setAppId(parsed.appId)
        if (parsed.measurementId) setMeasurementId(parsed.measurementId)
        setShowJsonParser(false)
        setJsonInput('')
      } else {
        setErrorMessage('Không tìm thấy đối tượng cấu hình {...} trong đoạn văn bản bạn dán.')
      }
    } catch {
      setErrorMessage('Không thể đọc mã cấu hình. Vui lòng kiểm tra lại định dạng JSON từ Firebase Console.')
    }
  }

  const handleSave = () => {
    if (!apiKey.trim() || !projectId.trim() || !appId.trim()) {
      setErrorMessage('Vui lòng điền tối thiểu API Key, Project ID và App ID.')
      return
    }

    const config: FirebaseConfig = {
      apiKey: apiKey.trim(),
      authDomain: authDomain.trim(),
      projectId: projectId.trim(),
      storageBucket: storageBucket.trim() || undefined,
      messagingSenderId: messagingSenderId.trim() || undefined,
      appId: appId.trim(),
      measurementId: measurementId.trim() || undefined,
    }
    saveFirebaseConfig(config)
  }

  const handleClear = () => {
    if (confirm('Bạn có chắc chắn muốn xóa cấu hình Firebase đã lưu trên trình duyệt?')) {
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
              ? 'bg-[#0E281F] border-[#10B981]/30 text-[#34D399]'
              : 'bg-[#2A1515] border-[#F59E0B]/30 text-[#FBBF24]'
          }`}
        >
          <div className="flex items-center gap-3">
            {configured ? (
              <div className="w-8 h-8 rounded-lg bg-[#10B981]/20 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-5 h-5 text-[#34D399]" />
              </div>
            ) : (
              <div className="w-8 h-8 rounded-lg bg-[#F59E0B]/20 flex items-center justify-center shrink-0">
                <AlertCircle className="w-5 h-5 text-[#FBBF24]" />
              </div>
            )}
            <div>
              <p className="font-bold text-sm text-[#F3F4F6]">
                {configured ? 'Firebase Cloud Đã Kết Nối' : 'Chế độ Demo / Cục Bộ (Chưa kết nối Firebase)'}
              </p>
              <p className="text-[11px] opacity-80 mt-0.5 text-[#9CA3AF]">
                {configured
                  ? `Dự án "${projectId}" đang đồng bộ người dùng và dữ liệu đám mây qua Firebase Auth & Firestore.`
                  : 'Dữ liệu đang được lưu trữ an toàn trong bộ nhớ cục bộ trình duyệt. Bạn có thể kết nối Firebase Cloud để đồng bộ trực tuyến.'}
              </p>
            </div>
          </div>
        </div>

        {errorMessage && (
          <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-800/60 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Quick JSON paste toggle */}
        <div className="flex justify-between items-center pt-1 border-t border-[#282538]">
          <span className="font-semibold text-[#EDEAF8] flex items-center gap-1.5">
            <Flame className="w-3.5 h-3.5 text-[#F59E0B]" />
            Thông tin cấu hình dự án Firebase
          </span>
          <button
            type="button"
            onClick={() => setShowJsonParser(!showJsonParser)}
            className="text-[#7255F7] hover:underline cursor-pointer font-medium flex items-center gap-1"
          >
            <Code2 className="w-3.5 h-3.5" />
            {showJsonParser ? 'Nhập từng trường' : 'Dán mã config (JSON)'}
          </button>
        </div>

        {showJsonParser ? (
          <div className="space-y-2 p-3.5 bg-[#12101D] rounded-xl border border-[#282538]">
            <p className="text-[#9CA3AF] text-[11px]">
              Vào <strong>Firebase Console &gt; Project Settings &gt; General &gt; Your apps</strong>, sao chép đối tượng <code>const firebaseConfig = &#123; ... &#125;;</code> và dán vào đây:
            </p>
            <textarea
              rows={5}
              value={jsonInput}
              onChange={(e) => setJsonInput(e.target.value)}
              placeholder={`apiKey: "AIzaSy...",\nauthDomain: "my-app.firebaseapp.com",\nprojectId: "my-app",\nappId: "1:..."`}
              className="w-full p-2.5 rounded-lg bg-[#191725] border border-[#282538] font-mono text-xs text-[#F3F4F6] focus:border-[#7255F7] outline-none"
            />
            <Button size="sm" variant="primary" onClick={handleParseJson} leftIcon={<Sparkles className="w-3.5 h-3.5" />}>
              Trích xuất dữ liệu tự động
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 bg-[#12101D] rounded-xl border border-[#282538]">
            <Input
              label="API Key *"
              placeholder="AIzaSy..."
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
            />
            <Input
              label="Project ID *"
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
              label="App ID *"
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
              leftIcon={<Trash2 className="w-3.5 h-3.5 text-rose-400" />}
              className="text-rose-400 border-rose-500/30 hover:bg-rose-950/30"
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
              Lưu & Áp dụng
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  )
}
