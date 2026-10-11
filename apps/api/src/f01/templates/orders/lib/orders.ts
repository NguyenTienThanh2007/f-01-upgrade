// Pure order logic for the order-management template. No React, no browser APIs and
// no imports, so tests can load this file directly with node --test.

export type OrderStatus = "new" | "shipping" | "delivered" | "paid" | "cancelled";

export type Order = {
  id: string;
  customerName: string;
  phone: string;
  product: string;
  quantity: number;
  unitPrice: number;
  note: string;
  status: OrderStatus;
  createdAt: string;
  updatedAt: string;
};

export type OrderInput = Pick<Order, "customerName" | "phone" | "product" | "quantity" | "unitPrice" | "note">;
export type OrderErrors = Partial<Record<keyof OrderInput, string>>;
export type StatusFilter = OrderStatus | "all";
export type DailyTotal = { date: string; count: number; total: number };

export const STORAGE_KEY = "f01.orders.v1";
export const STORAGE_VERSION = 1;
export const MAX_UNIT_PRICE = 1000000000;
export const MAX_QUANTITY = 100000;

export const STATUSES: readonly OrderStatus[] = ["new", "shipping", "delivered", "paid", "cancelled"];
export const STATUS_LABELS: Record<OrderStatus, string> = {
  new: "Mới",
  shipping: "Đang giao",
  delivered: "Đã giao",
  paid: "Đã thanh toán",
  cancelled: "Đã huỷ",
};

export const EMPTY_INPUT: OrderInput = { customerName: "", phone: "", product: "", quantity: 1, unitPrice: 0, note: "" };

/** Lowercase, without Vietnamese diacritics, so "Nguyễn" matches "nguyen". */
export function foldText(value: string): string {
  return value.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D").toLowerCase().trim();
}

export function digitsOnly(value: string): string {
  return value.replace(/\D/g, "");
}

/** Accepts 0xxxxxxxxx or +84xxxxxxxxx, with spaces, dots or dashes. */
export function isValidPhone(value: string): boolean {
  const compact = value.replace(/[\s.-]/g, "");
  return /^(0\d{9}|\+84\d{9})$/.test(compact);
}

export function orderTotal(order: Pick<Order, "quantity" | "unitPrice">): number {
  return order.quantity * order.unitPrice;
}

export function validateOrder(input: OrderInput): OrderErrors {
  const errors: OrderErrors = {};
  if (!input.customerName.trim()) errors.customerName = "Vui lòng nhập tên khách hàng.";
  if (!isValidPhone(input.phone)) errors.phone = "Số điện thoại cần 10 số, bắt đầu bằng 0 hoặc +84.";
  if (!input.product.trim()) errors.product = "Vui lòng nhập sản phẩm.";
  if (!Number.isInteger(input.quantity) || input.quantity < 1 || input.quantity > MAX_QUANTITY) {
    errors.quantity = "Số lượng phải là số nguyên từ 1 trở lên.";
  }
  if (!Number.isInteger(input.unitPrice) || input.unitPrice < 0 || input.unitPrice > MAX_UNIT_PRICE) {
    errors.unitPrice = "Đơn giá phải là số nguyên không âm (đồng).";
  }
  return errors;
}

function clean(input: OrderInput): OrderInput {
  return {
    customerName: input.customerName.trim(),
    phone: input.phone.trim(),
    product: input.product.trim(),
    quantity: input.quantity,
    unitPrice: input.unitPrice,
    note: input.note.trim(),
  };
}

export function createOrder(input: OrderInput, id: string, now: Date): Order {
  const time = now.toISOString();
  return { id, ...clean(input), status: "new", createdAt: time, updatedAt: time };
}

export function updateOrder(orders: readonly Order[], id: string, input: OrderInput, now: Date): Order[] {
  return orders.map((order) => (order.id === id ? { ...order, ...clean(input), updatedAt: now.toISOString() } : order));
}

export function setStatus(orders: readonly Order[], id: string, status: OrderStatus, now: Date): Order[] {
  return orders.map((order) => (order.id === id && order.status !== status ? { ...order, status, updatedAt: now.toISOString() } : order));
}

export function removeOrder(orders: readonly Order[], id: string): Order[] {
  return orders.filter((order) => order.id !== id);
}

/** Newest first; every query word must appear in the customer name (ignoring diacritics), or the digits in the phone. */
export function filterOrders(orders: readonly Order[], query: string, status: StatusFilter): Order[] {
  const words = foldText(query).split(/\s+/).filter(Boolean);
  const digits = digitsOnly(query);
  const matches = (order: Order) => {
    if (words.length === 0) return true;
    const name = foldText(order.customerName);
    return words.every((word) => name.includes(word)) || (digits.length > 0 && digitsOnly(order.phone).includes(digits));
  };
  return orders
    .filter((order) => (status === "all" || order.status === status) && matches(order))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

/** Local calendar day "YYYY-MM-DD" for an ISO timestamp. */
export function localDay(iso: string): string {
  const date = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** Revenue per local day, newest day first. Cancelled orders are excluded. */
export function dailyTotals(orders: readonly Order[]): DailyTotal[] {
  const days = new Map<string, DailyTotal>();
  for (const order of orders) {
    if (order.status === "cancelled") continue;
    const date = localDay(order.createdAt);
    const day = days.get(date) ?? { date, count: 0, total: 0 };
    day.count += 1;
    day.total += orderTotal(order);
    days.set(date, day);
  }
  return [...days.values()].sort((a, b) => b.date.localeCompare(a.date));
}

function isOrder(value: unknown): value is Order {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.id === "string" && v.id.length > 0 &&
    typeof v.customerName === "string" && typeof v.phone === "string" &&
    typeof v.product === "string" && typeof v.note === "string" &&
    typeof v.quantity === "number" && Number.isInteger(v.quantity) && v.quantity >= 1 &&
    typeof v.unitPrice === "number" && Number.isInteger(v.unitPrice) && v.unitPrice >= 0 &&
    typeof v.status === "string" && (STATUSES as readonly string[]).includes(v.status) &&
    typeof v.createdAt === "string" && !Number.isNaN(Date.parse(v.createdAt)) &&
    typeof v.updatedAt === "string" && !Number.isNaN(Date.parse(v.updatedAt))
  );
}

/** The browser storage if it can be written, otherwise null (blocked, e.g. in a sandboxed preview). */
export function openStorage(get: () => Storage | undefined): Storage | null {
  try {
    const storage = get();
    if (!storage) return null;
    const probe = STORAGE_KEY + ".probe";
    storage.setItem(probe, "1");
    storage.removeItem(probe);
    return storage;
  } catch {
    return null;
  }
}

/** Tolerates missing, malformed or other-version data by returning only valid orders. */
export function parseStoredOrders(raw: string | null): Order[] {
  if (!raw) return [];
  try {
    const data: unknown = JSON.parse(raw);
    if (!data || typeof data !== "object") return [];
    const record = data as { version?: unknown; orders?: unknown };
    if (record.version !== STORAGE_VERSION || !Array.isArray(record.orders)) return [];
    return record.orders.filter(isOrder);
  } catch {
    return [];
  }
}

export function serializeOrders(orders: readonly Order[]): string {
  return JSON.stringify({ version: STORAGE_VERSION, orders });
}

export type OrderCsvRow = {
  createdAt: Date;
  customerName: string;
  phone: string;
  product: string;
  quantity: number;
  unitPrice: number;
  total: number;
  status: string;
  note: string;
};

export const ORDER_CSV_COLUMNS: { key: keyof OrderCsvRow & string; label: string }[] = [
  { key: "createdAt", label: "Ngày tạo" },
  { key: "customerName", label: "Khách hàng" },
  { key: "phone", label: "Số điện thoại" },
  { key: "product", label: "Sản phẩm" },
  { key: "quantity", label: "Số lượng" },
  { key: "unitPrice", label: "Đơn giá (₫)" },
  { key: "total", label: "Thành tiền (₫)" },
  { key: "status", label: "Trạng thái" },
  { key: "note", label: "Ghi chú" },
];

export function orderCsvRows(orders: readonly Order[]): OrderCsvRow[] {
  return orders.map((order) => ({
    createdAt: new Date(order.createdAt),
    customerName: order.customerName,
    phone: order.phone,
    product: order.product,
    quantity: order.quantity,
    unitPrice: order.unitPrice,
    total: orderTotal(order),
    status: STATUS_LABELS[order.status],
    note: order.note,
  }));
}
