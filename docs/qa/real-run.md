# G2 — Chạy thật đầu-cuối (11/10/2026, 22:02–22:05 giờ VN)

Kết quả **chạy thật** trên máy chủ dự án: worker + PostgreSQL (`f01-db`, cổng 5434) + Docker,
giao diện production (`next build` + `next start`), thao tác bằng Playwright qua giao diện.
Ảnh chụp ở `docs/qa/real-run/`. Không có giá trị bí mật nào được ghi ở đây.

## Cấu hình đã dùng (chỉ tên khoá)

- `.env` gốc: `DATABASE_URL` (cổng 5434), `DEV_API_TOKEN`, `EXECUTION_MODE=real`, `SIMULATION_RUNNER_ENABLED=false`,
  `NEXT_PUBLIC_APP_URL=http://localhost:3000`, `API_INTERNAL_URL=http://127.0.0.1:8000`.
- `apps/api/.env`: `OPENAI_API_KEY` (chủ dự án tự điền), `REAL_EXECUTION_ENABLED=true`, `SANDBOX_IMAGE_ID`,
  `SANDBOX_ACCEPTANCE_REPORT`, `FACTORY_ORIGIN=http://localhost:3000`, `PREVIEW_ORIGIN=http://127.0.0.1:3031`.
- Image `sha256:bf55945a…3363c0` (nhãn `next-web-v1`, recipe khớp `sandbox/`).
- Báo cáo nghiệm thu `.runtime/phase2b-acceptance-report.json`: **chạy lại cho chính repo này** bằng
  `scripts/run-phase2b-acceptance.py` với DB `f01_test_accept` dùng một lần → containment **passed**,
  journey **passed** (97 giây, model giả lập, không tốn phí).
- Bốn tiến trình theo README: API `:8000`, worker, preview gateway `:3031`, giao diện `:3000`.

## Luồng đã chạy

| Bước | Thời điểm (UTC) | Kết quả |
|---|---|---|
| Tạo dự án "Trà sữa Mây — chạy thật" từ mẫu Quản lý đơn hàng (giao diện) | 15:02:40 | ⚠️ Dự án **được tạo** trên máy chủ, nhưng giao diện báo "Dịch vụ dự án đang không phản hồi" (lỗi #1). |
| Lập kế hoạch (nút "Lập kế hoạch", OpenAI thật) | 15:03:02 → 15:03:12 | ✅ Kế hoạch sẵn sàng sau ~10 giây (2.380 token vào / 919 ra). |
| "Duyệt và dựng từ mẫu Quản lý đơn hàng" | 15:03:22 → 15:03:43 | ✅ Phiên bản 1 sau ~21 giây, không gọi AI sinh mã. |
| Xem thử phiên bản 1 | 15:03:47 | ✅ Khung xem thử tải xong; gateway trả HTTP 200, `<html lang="vi">`, có "Quản lý đơn hàng". |
| Gửi yêu cầu tiếng Việt: *"Đổi tiêu đề trang thành “Đơn hàng Trà sữa Mây” và thêm một dòng ngay dưới tiêu đề: “Chúc một ngày bán đắt hàng!”. Giữ nguyên mọi chức năng hiện có."* | 15:04:21 | ✅ Bước tiếp theo đổi sang "Có yêu cầu chỉnh sửa mới". |
| Lập kế hoạch cho yêu cầu (OpenAI thật) | 15:04:23 → 15:04:33 | ✅ 3.938 / 1.079 token. |
| Duyệt và xây dựng (AI sinh bản vá thật) | 15:04:33 → 15:04:53 | ✅ Phiên bản 2; lần gọi sinh mã: 17.036 token vào / 332 ra; không cần tự sửa (repairs = 0). |
| Xem thử phiên bản 2 | 15:04:57 | ✅ HTTP 200, `lang="vi"`, có "Đơn hàng Trà sữa Mây" và "Chúc một ngày bán đắt hàng!". |

### Các pha của worker (mã thoát, thời gian, đúng image đã nghiệm thu)

| Pha | Phiên bản 1 (mẫu) | Phiên bản 2 (AI vá) |
|---|---|---|
| materialization | 0 | 0 |
| install (dependency-check) | 0 · 204 ms | 0 · 27 ms |
| typecheck (`tsc --noEmit`) | 0 · 6.234 ms | 0 · 1.475 ms |
| build (`next build --webpack`) | 0 · 10.398 ms | 0 · 10.775 ms |
| test (`node --test -- tests/orders.test.mjs tests/vn.test.mjs`) | 0 · 347 ms | 0 · 229 ms |
| verification + health | 0 | 0 |

### Nguồn gốc (Brain) và sự kiện

- Sự kiện `execution.queued` và `execution.template_applied` ghi `template_id = "orders"`, `template_version = 1`.
- Phiên bản 1: Brain có quyết định `source = "template"`, `fixture_ref = "orders-template@1"`, cùng `generated`,
  `verified`, `published`; **không** có `model_proposed` (mẫu không qua AI). Ứng viên: attempt 0 (mẫu) và attempt 1.
- Phiên bản 2: có `model_proposed`, `generated`, `verified`, `published`.
- AI chỉ sửa đúng 1 file (`app/layout.tsx`), không thêm file, không đổi `package.json`.

## Điều chưa ổn, phát hiện khi chạy thật

1. **Tạo dự án ở chế độ thật báo lỗi giả** (giao diện): `project-creation.tsx` coi `execution_mode !== 'simulated'` là lỗi,
   nên hiện "không phản hồi" dù dự án đã được tạo, và không kịp lưu lựa chọn mẫu. Để đi tiếp, mình đã ghi lựa chọn
   `orders` vào localStorage đúng như giao diện lẽ ra làm. → sửa ở G3.
2. **Dải "Đang kết nối để nhận cập nhật…" kéo dài tới 15 giây** mỗi lần mở dự án: gateway SSE của giao diện chỉ gửi header
   cùng chunk đầu tiên (heartbeat 15 giây). Backend trả header ngay (0,014 s), qua gateway mất 15,3 s. → sửa ở G3.
3. Trong lúc gửi lệnh duyệt, thanh "Bước tiếp theo" hiện nhầm "AI đang lập kế hoạch…" khoảng 1 giây. → sửa ở G3.
4. Sau khi phiên bản mới xong, ô "Bạn muốn sửa gì?" vẫn hiện thông báo cũ "Bước tiếp theo: lập kế hoạch cho yêu cầu này". → sửa ở G3.
5. **Ứng dụng trong bản xem thử không lưu được dữ liệu**: iframe xem thử (`sandbox="allow-scripts"`) và CSP của preview
   gateway (`sandbox allow-scripts`) không cho `allow-same-origin`, nên localStorage luôn bị chặn. Mẫu đơn hàng xử lý êm
   (vẫn dùng được trong bộ nhớ) nhưng hiện "Không lưu được dữ liệu…". Muốn lưu được phải nới sandbox — **bị cấm theo ràng buộc**,
   nên cần chủ dự án quyết định. G3 chỉ làm rõ thông báo trong mẫu.
6. **Chất lượng bản vá AI**: AI thêm một `<header><h1>` mới phía trên thay vì đổi tiêu đề có sẵn, nên trang có hai `<h1>`
   ("Đơn hàng Trà sữa Mây" và "Quản lý đơn hàng") và header mới không có kiểu dáng. Test vẫn qua vì test không kiểm tra giao diện.
   Chưa sửa (là hành vi model; cải thiện prompt là việc riêng).
7. Chữ do máy chủ sinh (tóm tắt phiên bản "Verified Next.js preview…", nội dung hồ sơ) vẫn tiếng Anh.

## Container

- Lần chạy này tạo 2 container xem thử (phiên bản 1 và 2), `F01_LIFETIME_SECONDS=4200`, tự dừng khoảng 23:13 giờ VN. Chưa xoá.
- 12 container `f01-*` cũ (không có trong `f01-db`), chỉ liệt kê, **không xoá**:

| Container | Trạng thái | Tạo lúc (VN) | Image | Thời hạn | Vì sao còn |
|---|---|---|---|---|---|
| f01-13ac9b1f…-1-2, f01-b00f2fdb…-1-1 | Đã dừng 3 ngày | 07/10 21:45 | `c20b9d0f` (next-static-v1 của F01-local) | 4200 s | `idle.mjs` đã thoát đúng hạn; container tạo với `AutoRemove=false` nên không tự bị xoá |
| f01-62623768…-1-1 | Đã dừng 3 ngày | 08/10 11:14 | `c20b9d0f` | 4200 s | như trên |
| f01-cc77e3a9…-1-1 | Đã dừng 3 ngày | 08/10 21:07 | `c20b9d0f` | 4200 s | như trên |
| 8 container f01-180b6bea…, 5e6cf45e…, dfeabff6…, dca6bff7…, c2a62f31…, d5b81f37…, 8d0da097…, 3aa3a10c… | Đang chạy ~10 giờ | 11/10 11:39–12:37 | `bf55945a` | 87.000 s | tạo với thời hạn tối đa (~24 giờ), tự dừng khoảng 11:49–12:47 ngày 12/10; project của chúng không có trong `f01-db` nên không worker nào dọn |

## Chưa kiểm chứng

- Mã QR / VietQR (chưa làm, thuộc G5).
- Trình duyệt thật của chủ dự án (đã dùng Chromium headless của Playwright), điện thoại thật.
- Lỗi build rồi AI tự sửa (lần chạy này không cần sửa); trường hợp này mới chỉ có test giả lập.
- Đăng web công khai (không có trong phạm vi).
