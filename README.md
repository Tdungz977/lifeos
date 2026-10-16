# LIFEOS — HỆ THỐNG QUẢN TRỊ CUỘC SỐNG & KỶ LUẬT CÁ NHÂN

> **Hệ điều hành cá nhân giúp trả lời 5 câu hỏi cốt lõi:**
> 1. Mình muốn đạt được điều gì? (*Goals*)
> 2. Hôm nay mình cần làm gì? (*Today Planner & Pomodoro*)
> 3. Mình có đang tiến bộ không? (*Progress Analytics*)
> 4. Mình có đang phát triển tri thức và kỹ năng không? (*Learning Hub*)
> 5. Mình có đang duy trì lối sống lành mạnh và cân bằng không? (*Health & Habits*)

---

## 1. CÔNG NGHỆ NỀN TẢNG (TECH STACK)

- **Frontend Core**: React 19, TypeScript, Vite 8
- **Styling**: Tailwind CSS v4, phong cách Dark Mode cao cấp (Linear / Notion / SaaS Dashboard)
- **Icons**: Lucide React
- **Đồ thị & Trực quan hóa**: Recharts
- **Quản lý Ngày tháng**: date-fns (hỗ trợ locale tiếng Việt và múi giờ `Asia/Ho_Chi_Minh`)
- **Backend & Database**: Supabase PostgreSQL
- **Xác thực**: Supabase Auth (Email/Password, Session Persistence, Password Reset, Onboarding Flow)
- **Bảo mật**: Row Level Security (RLS 100% trên mọi bảng dữ liệu)

---

## 2. CẤU TRÚC 10 PHÂN HỆ CHỨC NĂNG

| STT | Phân hệ | Đường dẫn | Chức năng chính |
|-----|---------|-----------|-----------------|
| 1 | **Tổng quan** (*Overview*) | `/` | Bảng chỉ huy trung tâm: 3 ưu tiên ngày, tỷ lệ hoàn thành, lịch trình, mục tiêu cốt lõi, cân bằng 4 trụ cột, check-in thói quen và sổ tay đúc rút |
| 2 | **Mục tiêu** (*Goals*) | `/goals` | Quản lý mục tiêu (ngày, tuần, tháng, quý, năm), cột mốc quan trọng (*Milestones*), nhiệm vụ liên kết, chiêm nghiệm và tính tiến độ tự động |
| 3 | **Kế hoạch hôm nay** (*Today*) | `/today` | Danh sách công việc theo giờ (*Timeline*) và trong ngày, xử lý việc quá hạn minh bạch, gắn đồng hồ Pomodoro (25p làm / 5p nghỉ) |
| 4 | **Lịch** (*Calendar*) | `/calendar` | Chuyển đổi 3 chế độ xem (Tháng, Tuần, Ngày), hạn định mục tiêu và tạo nhanh công việc trực tiếp từ ô ngày |
| 5 | **Tiến độ** (*Progress*) | `/progress` | Biểu đồ Recharts xu hướng hoàn thành theo ngày (7/14/30/90 ngày), phân bổ theo danh mục, thời lượng học tập |
| 6 | **Học tập** (*Learning Hub*) | `/learning` | Quản lý môn học/kỹ năng, kết quả đầu ra kỳ vọng, tài liệu tham khảo (*URL*), ghi nhận phiên học chuyên sâu (*Study Sessions*) |
| 7 | **Sức khỏe** (*Health Tracker*) | `/health` | Giờ ngủ/thức dậy, lượng nước uống (+250ml/+500ml), vận động thể chất, mức năng lượng (1-10), tâm trạng và biểu đồ xu hướng 7 ngày |
| 8 | **Thói quen** (*Habits*) | `/habits` | Lưới check-in 14 ngày, thuật toán tính chuỗi *Current Streak* và kỷ lục *Longest Streak* theo lịch cấu hình, nguyên tắc *Never Miss Twice* |
| 9 | **Tổng kết tuần** (*Weekly Review*) | `/weekly-review` | Bộ điều hướng xem lại báo cáo tuần cũ, tổng hợp chỉ số tự động và 6 câu hỏi tự vấn chiến lược |
| 10 | **Cài đặt** (*Settings*) | `/settings` | Tùy chỉnh hồ sơ, múi giờ, châm ngôn hành động (*Daily Intention*), quản lý kết nối Supabase và xuất sao lưu file JSON |

---

## 3. HƯỚNG DẪN CÀI ĐẶT & KHỞI CHẠY CỤC BỘ

### Bước 1: Khởi chạy máy chủ phát triển
```bash
npm install
npm run dev
```
Ứng dụng sẽ hoạt động tại địa chỉ: `http://localhost:5173`.

### Bước 2: Kiểm tra biên dịch Production
```bash
npm run build
```

---

## 4. HƯỚNG DẪN KẾT NỐI SUPABASE & KHỞI TẠO DATABASE SCHEMA

1. Đăng ký/đăng nhập tài khoản tại [Supabase Dashboard](https://supabase.com).
2. Tạo một Project mới (ví dụ: `lifeos-prod`).
3. Vào **Project Settings &rarr; API** để lấy:
   - **Project URL**
   - **anon public Key**
4. Mở ứng dụng tại `http://localhost:5173` &rarr; Nhấp vào nút **"Cấu hình DB"** (hoặc mở file [`.env`](.env)) &rarr; dán 2 giá trị trên &rarr; Bấm **Lưu & Kết nối**.
5. Vào **SQL Editor** trên Supabase Dashboard &rarr; Mở file [`supabase/migrations/20261016_initial_lifeos_schema.sql`](supabase/migrations/20261016_initial_lifeos_schema.sql), sao chép toàn bộ nội dung và bấm **Run** để khởi tạo 12 bảng và toàn bộ chính sách bảo mật RLS.

---

## 5. HƯỚNG DẪN TRIỂN KHAI LÊN PRODUCTION (DEPLOYMENT)

### Cách 1: Triển khai lên Vercel (Khuyên dùng)
1. Đẩy mã nguồn lên kho lưu trữ GitHub.
2. Đăng nhập [Vercel](https://vercel.com) &rarr; chọn **Add New Project** &rarr; Chọn kho GitHub của bạn.
3. Trong phần **Environment Variables**, thêm:
   - `VITE_SUPABASE_URL`: URL dự án Supabase của bạn.
   - `VITE_SUPABASE_ANON_KEY`: Khóa anon public.
4. Bấm **Deploy**. Vercel sẽ tự động build và cấp domain HTTPS miễn phí.

### Cách 2: Triển khai lên Netlify
1. Đăng nhập [Netlify](https://netlify.com) &rarr; chọn **Import from Git**.
2. Build command: `npm run build`.
3. Publish directory: `dist`.
4. Cấu hình biến môi trường tương tự như trên và nhấn **Deploy site**.

---

## 6. PHÍM TẮT & TÍNH NĂNG TIỆN ÍCH

- **`Ctrl + K` hoặc `Cmd + K`**: Mở hộp thoại **Thêm Nhanh Toàn Cục** (*Quick Add Modal*) từ bất kỳ đâu để tạo ngay Công việc, Mục tiêu, Thói quen hay Môn học mới.
- **Sao lưu dữ liệu**: Vào trang **Cài đặt &rarr; Sao Lưu & Xuất Dữ Liệu** để tải file `lifeos-backup-YYYY-MM-DD.json` lưu trữ ngoại tuyến bất kỳ lúc nào.
