# CLAUDE.md — hướng dẫn cho các phiên làm việc

Dự án: định hướng lại F01 (nền tảng AI tạo web app: Next.js + FastAPI + PostgreSQL + Docker sandbox)
cho tiểu thương Việt Nam — app quản lý bán hàng nhỏ, giao diện tiếng Việt, tiền VND, thanh toán VietQR.
Đây là dự án sinh viên chạy một người: ưu tiên thay đổi nhỏ, an toàn, có test.

- Repo làm việc: https://github.com/NguyenTienThanh2007/f-01-upgrade
- Lịch sử gốc (Phase 2B hoàn thành): https://github.com/NguyenTienThanh2007/F01-local
- Nhánh làm việc: `vn-shop`. Mọi thay đổi chỉ vào `vn-shop`, không commit thẳng vào `main`.

## Ràng buộc bắt buộc (không được vi phạm)

- Giữ nguyên chính sách trong `apps/api/src/f01/domain/source.py`:
  - chỉ sửa file dưới `app/`, `components/`, `lib/`, `styles/`, `public/`, `tests/`;
  - đuôi `ts`/`tsx`/`css`/`json`/`svg`/`md`; test chỉ `*.test.mjs`;
  - mỗi file ≤ 64KB, tối đa 128 file, tổng ≤ 512KB.
  - Không cho AI đổi `package.json` hay thêm dependency.
- Không đổi scaffold/Dockerfile/image đã nghiệm thu (`sandbox/next-web-v1/`). Nếu một mốc thật sự
  cần đổi, DỪNG và hỏi chủ dự án, nêu rõ ảnh hưởng đến bằng chứng nghiệm thu Phase 2B.
- Không làm yếu sandbox, validation, hay cơ chế secret. Không commit `.env`, khóa API hay token.
  Trước mỗi lần push, kiểm tra `git diff` không chứa bí mật.
- Mọi thay đổi phải qua test: backend, frontend typecheck và build. Không báo "đã kiểm chứng" nếu
  chưa chạy thật; ghi rõ cái gì chưa chạy được và vì sao.
- Chuỗi giao diện tiếng Việt phải có dấu đầy đủ.

## Cách làm việc

- Mỗi mốc một commit riêng (hoặc vài commit nhỏ), message rõ ràng, rồi push nhánh `vn-shop` sau khi
  test qua. Không push `main`, không force push, không viết lại lịch sử đã có trên remote.
- Sau mỗi mốc, dừng lại, tóm tắt: file đã đổi, lệnh test đã chạy và kết quả, giới hạn còn lại.
  Không tự chuyển sang mốc tiếp theo.
- Nếu gặp mâu thuẫn giữa yêu cầu của chủ dự án và kiến trúc hiện có, nêu ra và hỏi, đừng tự chọn lặng lẽ.
- Nếu push bị từ chối vì quyền, dừng và báo, không thử cách khác.

## Các mốc

- M1 — Nền tảng tiếng Việt: chỉ dẫn planning/source generation (UI tiếng Việt, VND dạng `1.250.000 ₫`,
  ngày `dd/mm/yyyy`, lưu localStorage, mobile-first); `lib/vn.ts` (formatVND, formatDate, xuất CSV) kèm test.
- M2 — Thư viện mẫu app (đơn hàng, tồn kho, sổ thu chi). Trình bày 2–3 phương án tích hợp và chờ duyệt
  trước khi viết code.
- M3 — VietQR: `lib/vietqr.ts` thuần TypeScript (EMVCo TLV, 704, VN, số tiền, nội dung, CRC16), vẽ QR bằng
  code thuần, test với vector đã biết. Mã QR phải được quét thử bằng app ngân hàng thật.

Mỗi mốc chỉ bắt đầu sau khi chủ dự án duyệt.
