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

## Lệnh test (đã xác nhận trên máy này, 2026-10-11)

Baseline trước M1: backend 289 passed / 2 skipped (2 test Docker acceptance cần `F01_DOCKER_ACCEPTANCE=1`),
mypy sạch, `pnpm typecheck`/`test:web` (52)/`api:check`/`test:client` (2)/`build` đều qua.

- Backend (trong `apps/api`): `uv sync --locked --python 3.12`, rồi
  `TEST_DATABASE_URL=postgresql+psycopg://…/f01_test_<tên> uv run --locked pytest` và
  `uv run --locked mypy src/f01 tests migrations scripts`. DB test phải là DB dùng một lần tên `f01_test_*`,
  và **mỗi lần chạy pytest cần một DB mới**: chạy lại trên DB cũ sẽ ra ~97 lỗi `DependentObjectsStillExist`
  ở bước downgrade của fixture (lỗi có sẵn từ trước, không phải do code).
  Có thể dựng bằng PostgreSQL 18 (`/Library/PostgreSQL/18/bin`): `initdb` vào thư mục tạm, chạy với
  `-c unix_socket_directories= -c listen_addresses=127.0.0.1` (đường dẫn socket dài sẽ lỗi).
- Frontend (gốc repo): `pnpm install --frozen-lockfile`, `pnpm typecheck`, `pnpm test:web`, `pnpm api:check`,
  `pnpm test:client`, `pnpm build`.
- Bản chuẩn dùng chung cho app sinh ra: `node --test apps/api/src/f01/templates/shared/tests/*.test.mjs`.
- Mẫu app (M2) chạy trong image đã nghiệm thu, bật bằng cờ riêng (không có cờ thì test bị skip, skip không phải bằng chứng):
  `F01_TEMPLATE_DOCKER=1 F01_SANDBOX_IMAGE_ID=sha256:bf55945a66450b4d747196aed159eba926ca377b66e41400da70c0a54e3363c0 uv run --locked pytest tests/template_docker`.
  Test này chạy đúng các pha materialize/install/typecheck/build/test/preview của `DockerSandbox`, không gọi model, không cần DB.
- Mẫu nằm ở `apps/api/src/f01/templates/<id>/` (+ `shared/`), đăng ký trong `application/templates.py`; đổi nội dung mẫu thì tăng `version`.

Test của app sinh ra chạy bằng `node --test -- tests/*.test.mjs` trong image (Node 24, có type stripping):
import file TS phải ghi rõ đuôi `.ts`; module được test phải tự chứa, chỉ dùng TS xoá được (không `enum`/`namespace`),
không React/JSX/`next`. `tsconfig` của scaffold không kiểm tra `tests/`.

## Ghi chú thiết kế

- `VIETNAMESE_DEFAULTS` (`apps/api/src/f01/providers/prompts.py`) đang áp toàn cục cho mọi project mới; dự kiến chuyển thành profile bật/tắt được.

## Giao diện và chạy thật (G1–G3, 11/10/2026)

- Mọi chữ giao diện nằm trong `apps/web/src/lib/copy/vi.ts` (không dùng thư viện i18n). File trong `apps/web/src/lib/`
  được test Node nạp trực tiếp, nên phải import tương đối kèm đuôi `.ts` (ví dụ `../copy/vi.ts`), không dùng alias `@/`.
- Logic "Bước tiếp theo" là hàm thuần `nextStep()` trong `lib/workspace/next-step.ts` (có test). Lệnh lập kế hoạch và
  xây dựng nằm trong một hook duy nhất `features/workspace/flow.ts`. Lựa chọn mẫu lưu ở localStorage theo project.
- CSS mới chỉ thêm vào `apps/web/src/styles/vn-shop.css` và chỉ dùng token có sẵn.
- Ảnh QA: `docs/qa/ux1/`; kết quả chạy thật: `docs/qa/real-run.md`.
- Bản xem thử chạy trong iframe `sandbox="allow-scripts"`, nên localStorage luôn bị chặn trong xem thử; muốn đổi phải
  nới sandbox (cấm theo ràng buộc, cần chủ dự án quyết).
- Mẫu đơn hàng hiện là `orders-template@2`.
- Dừng `next start` theo PID đang giữ cổng (`lsof -t -iTCP:3000 -sTCP:LISTEN`); `pkill -f "next start"` không khớp vì
  tiến trình đổi tên thành `next-server`.
- `next dev` tự sinh `apps/web/AGENTS.md` và `apps/web/CLAUDE.md`; chưa commit hai file này.

## Các mốc

- M1 — Nền tảng tiếng Việt: chỉ dẫn planning/source generation (UI tiếng Việt, VND dạng `1.250.000 ₫`,
  ngày `dd/mm/yyyy`, lưu localStorage, mobile-first); `lib/vn.ts` (formatVND, formatDate, xuất CSV) kèm test.
- M2 — Thư viện mẫu app (đơn hàng, tồn kho, sổ thu chi). Trình bày 2–3 phương án tích hợp và chờ duyệt
  trước khi viết code.
- M3 — VietQR: `lib/vietqr.ts` thuần TypeScript (EMVCo TLV, 704, VN, số tiền, nội dung, CRC16), vẽ QR bằng
  code thuần, test với vector đã biết. Mã QR phải được quét thử bằng app ngân hàng thật.

Mỗi mốc chỉ bắt đầu sau khi chủ dự án duyệt.
