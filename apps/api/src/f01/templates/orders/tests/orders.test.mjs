import test from "node:test";
import assert from "node:assert/strict";
import {
  EMPTY_INPUT, ORDER_CSV_COLUMNS, STATUSES, STATUS_LABELS, STORAGE_KEY,
  createOrder, dailyTotals, filterOrders, foldText, isValidPhone, orderCsvRows, orderTotal,
  parseStoredOrders, removeOrder, serializeOrders, setStatus, updateOrder, validateOrder,
} from "../lib/orders.ts";
import { toCSV } from "../lib/vn.ts";

const input = { customerName: "  Nguyễn Thị Hoa ", phone: "0901 234 567", product: "Áo thun", quantity: 2, unitPrice: 150000, note: "" };
const at = (day, hour = 9) => new Date(2026, 9, day, hour);

function sample() {
  const a = createOrder(input, "a", at(1));
  const b = createOrder({ ...input, customerName: "Trần Văn Đức", phone: "+84 912 345 678", unitPrice: 420000, quantity: 1 }, "b", at(1, 15));
  const c = createOrder({ ...input, customerName: "Lê Minh", phone: "0987654321", quantity: 3, unitPrice: 50000 }, "c", at(2));
  return [a, b, c];
}

test("statuses cover the five Vietnamese labels", () => {
  assert.deepEqual(STATUSES, ["new", "shipping", "delivered", "paid", "cancelled"]);
  assert.deepEqual(Object.values(STATUS_LABELS), ["Mới", "Đang giao", "Đã giao", "Đã thanh toán", "Đã huỷ"]);
  assert.equal(STORAGE_KEY, "f01.orders.v1");
});

test("validateOrder accepts a complete order and explains every problem in Vietnamese", () => {
  assert.deepEqual(validateOrder(input), {});
  const errors = validateOrder({ ...EMPTY_INPUT, phone: "12345", quantity: 0, unitPrice: -1 });
  assert.deepEqual(Object.keys(errors).sort(), ["customerName", "phone", "product", "quantity", "unitPrice"]);
  assert.equal(errors.customerName, "Vui lòng nhập tên khách hàng.");
  assert.deepEqual(validateOrder({ ...input, quantity: 1.5, unitPrice: 1000.5 }), {
    quantity: "Số lượng phải là số nguyên từ 1 trở lên.",
    unitPrice: "Đơn giá phải là số nguyên không âm (đồng).",
  });
});

test("isValidPhone accepts common Vietnamese mobile formats", () => {
  for (const ok of ["0901234567", "090 123 4567", "090.123.4567", "+84901234567", "+84 90 123 4567"]) assert.equal(isValidPhone(ok), true, ok);
  for (const bad of ["", "090123456", "09012345678", "84901234567", "abc0901234567"]) assert.equal(isValidPhone(bad), false, bad);
});

test("createOrder trims input and starts as a new order", () => {
  const order = createOrder(input, "id-1", at(1));
  assert.equal(order.customerName, "Nguyễn Thị Hoa");
  assert.equal(order.status, "new");
  assert.equal(order.createdAt, order.updatedAt);
  assert.equal(orderTotal(order), 300000);
});

test("updateOrder, setStatus and removeOrder change only the target order", () => {
  const orders = sample();
  const updated = updateOrder(orders, "a", { ...input, quantity: 5 }, at(3));
  assert.equal(updated[0].quantity, 5);
  assert.equal(updated[0].createdAt, orders[0].createdAt);
  assert.notEqual(updated[0].updatedAt, orders[0].updatedAt);
  assert.deepEqual(updated.slice(1), orders.slice(1));
  const shipped = setStatus(orders, "b", "shipping", at(3));
  assert.equal(shipped[1].status, "shipping");
  assert.equal(setStatus(shipped, "b", "shipping", at(4))[1].updatedAt, shipped[1].updatedAt);
  assert.deepEqual(removeOrder(orders, "c").map((o) => o.id), ["a", "b"]);
  assert.equal(orders.length, 3);
});

test("filterOrders searches names without diacritics, phone digits and status, newest first", () => {
  const orders = setStatus(sample(), "c", "paid", at(3));
  assert.deepEqual(filterOrders(orders, "", "all").map((o) => o.id), ["c", "b", "a"]);
  assert.deepEqual(filterOrders(orders, "nguyen hoa", "all").map((o) => o.id), ["a"]);
  assert.deepEqual(filterOrders(orders, "Đức", "all").map((o) => o.id), ["b"]);
  assert.deepEqual(filterOrders(orders, "duc", "all").map((o) => o.id), ["b"]);
  assert.deepEqual(filterOrders(orders, "912 345", "all").map((o) => o.id), ["b"]);
  assert.deepEqual(filterOrders(orders, "", "paid").map((o) => o.id), ["c"]);
  assert.deepEqual(filterOrders(orders, "hoa", "paid"), []);
  assert.equal(foldText("  Đặng Thị Ánh "), "dang thi anh");
});

test("dailyTotals groups by local day and excludes cancelled orders", () => {
  const orders = setStatus(sample(), "a", "cancelled", at(3));
  assert.deepEqual(dailyTotals(orders), [
    { date: "2026-10-02", count: 1, total: 150000 },
    { date: "2026-10-01", count: 1, total: 420000 },
  ]);
  assert.deepEqual(dailyTotals([]), []);
});

test("stored orders round-trip and bad data is ignored", () => {
  const orders = sample();
  assert.deepEqual(parseStoredOrders(serializeOrders(orders)), orders);
  assert.deepEqual(parseStoredOrders(null), []);
  assert.deepEqual(parseStoredOrders("{not json"), []);
  assert.deepEqual(parseStoredOrders(JSON.stringify({ version: 2, orders })), []);
  assert.deepEqual(parseStoredOrders(JSON.stringify([orders[0]])), []);
  const mixed = JSON.stringify({ version: 1, orders: [orders[0], { ...orders[1], status: "lost" }, { ...orders[2], quantity: "3" }, null] });
  assert.deepEqual(parseStoredOrders(mixed), [orders[0]]);
});

test("orders export to CSV with Vietnamese headers, labels and totals", () => {
  const [order] = setStatus(sample(), "a", "paid", at(3));
  const csv = toCSV(orderCsvRows([order]), ORDER_CSV_COLUMNS);
  assert.equal(
    csv,
    "\uFEFFNgày tạo,Khách hàng,Số điện thoại,Sản phẩm,Số lượng,Đơn giá (₫),Thành tiền (₫),Trạng thái,Ghi chú\r\n" +
      "01/10/2026,Nguyễn Thị Hoa,0901 234 567,Áo thun,2,150000,300000,Đã thanh toán,\r\n",
  );
});
