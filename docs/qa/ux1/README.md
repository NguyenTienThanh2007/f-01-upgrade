# UX1 — ảnh chụp giao diện tiếng Việt (G1)

Chụp bằng Playwright (Chromium headless) trên **bản build production** (`next build` + `next start`),
ngày 11/10/2026, ở hai độ rộng 1280px và 390px. Dữ liệu là DB PostgreSQL dùng một lần, không phải dữ liệu thật.

| Ảnh | Nội dung | Chế độ API |
|---|---|---|
| `home-*` | Trang chủ cho tiểu thương | demo |
| `projects-empty-*` | Danh sách dự án khi chưa có dự án (một câu + một nút, ẩn bộ lọc) | demo, DB trống |
| `project-new-*` | Tạo dự án một màn hình, đã chọn mẫu "Quản lý đơn hàng" | demo |
| `projects-list-*` | Danh sách khi đã có dự án | demo |
| `project-app-*` | Tab Ứng dụng: Bước tiếp theo + xem thử trong khung điện thoại + "Bạn muốn sửa gì?" | demo (bản demo đã sẵn sàng) |
| `project-history-*` | Tab Lịch sử: phiên bản + yêu cầu | demo |
| `project-settings-*` | Tab Cài đặt | demo |
| `project-technical-brain-*` | Chi tiết kỹ thuật → Hồ sơ dự án | demo |
| `project-app-real-noplan-*` | Chế độ chạy thật, dự án mới: "Chưa có kế hoạch" → nút "Lập kế hoạch" | thật (không có worker) |

Kiểm tra tự động khi chụp (script ngoài repo):
- Không trang nào tràn ngang ở 390px và 1280px.
- Ở 390px mọi link/nút/ô nhập/summary cao ≥ 44px, trừ ô checkbox nằm trong `<label>` (nhãn mới là vùng chạm).
  Ở 1280px các nút giữ cỡ desktop 40px theo DESIGN_SYSTEM.md (44px là cỡ cho cảm ứng).
- Không còn chữ giao diện tiếng Anh. Chữ tiếng Anh còn thấy trong ảnh Lịch sử/Hồ sơ là **dữ liệu do máy chủ sinh**
  (tóm tắt phiên bản và hồ sơ của bộ mô phỏng demo), ngoài phạm vi `apps/web`.

Chưa kiểm tra trong đợt này: trình đọc màn hình, zoom 200%, giảm chuyển động, các trang phát triển `/development/*`.
Dải "Đang kết nối để nhận cập nhật…" kéo dài tới 15 giây là lỗi có sẵn của gateway SSE (header chỉ được gửi cùng heartbeat
đầu tiên); ghi nhận để sửa ở G3.
