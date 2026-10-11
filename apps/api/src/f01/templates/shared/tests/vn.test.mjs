import test from "node:test";
import assert from "node:assert/strict";
import { downloadCSV, formatDate, formatVND, toCSV } from "../lib/vn.ts";

test("formatVND groups thousands with dots and appends ₫", () => {
  assert.equal(formatVND(0), "0 ₫");
  assert.equal(formatVND(999), "999 ₫");
  assert.equal(formatVND(1000), "1.000 ₫");
  assert.equal(formatVND(1250000), "1.250.000 ₫");
  assert.equal(formatVND(1234567890), "1.234.567.890 ₫");
});

test("formatVND rounds to whole đồng and keeps the sign", () => {
  assert.equal(formatVND(1999.5), "2.000 ₫");
  assert.equal(formatVND(-1250000), "-1.250.000 ₫");
  assert.equal(formatVND(-0.4), "0 ₫");
});

test("formatVND rejects values that are not real amounts", () => {
  for (const value of [Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY, 1e20]) {
    assert.throws(() => formatVND(value), RangeError);
  }
});

test("formatDate returns dd/mm/yyyy in local time", () => {
  assert.equal(formatDate(new Date(2026, 9, 1, 23, 59)), "01/10/2026");
  assert.equal(formatDate(new Date(2026, 0, 5).getTime()), "05/01/2026");
  assert.equal(formatDate(new Date(2026, 11, 31, 8).toISOString()), "31/12/2026");
});

test("formatDate treats YYYY-MM-DD as a calendar date, not UTC midnight", () => {
  assert.equal(formatDate("2026-10-01"), "01/10/2026");
  assert.equal(formatDate("2024-02-29"), "29/02/2024");
});

test("formatDate returns an empty string for invalid input", () => {
  for (const value of ["", "không phải ngày", "2026-02-30", "2026-13-01", new Date(Number.NaN), Number.NaN]) {
    assert.equal(formatDate(value), "");
  }
});

test("toCSV writes a BOM, a header row and CRLF line endings", () => {
  const csv = toCSV(
    [{ name: "Áo thun", price: 150000 }, { name: "Quần jean", price: 420000 }],
    [{ key: "name", label: "Tên sản phẩm" }, { key: "price", label: "Giá (₫)" }],
  );
  assert.equal(csv, "\uFEFFTên sản phẩm,Giá (₫)\r\nÁo thun,150000\r\nQuần jean,420000\r\n");
});

test("toCSV starts with exactly one U+FEFF byte order mark", () => {
  const csv = toCSV([], [{ key: "name", label: "Tên" }]);
  assert.equal(csv.codePointAt(0), 0xfeff);
  assert.notEqual(csv.codePointAt(1), 0xfeff);
  assert.deepEqual([...Buffer.from(csv, "utf8").subarray(0, 3)], [0xef, 0xbb, 0xbf]);
});

test("toCSV quotes commas, quotes and line breaks", () => {
  const csv = toCSV(
    [{ note: 'Giao "gấp", trước 5h\nGọi trước' }],
    [{ key: "note", label: "Ghi chú" }],
  );
  assert.equal(csv, '\uFEFFGhi chú\r\n"Giao ""gấp"", trước 5h\nGọi trước"\r\n');
});

test("toCSV formats empty values and dates", () => {
  const csv = toCSV(
    [{ day: new Date(2026, 9, 1), customer: null, phone: undefined }],
    [{ key: "day", label: "Ngày" }, { key: "customer", label: "Khách" }, { key: "phone", label: "SĐT" }],
  );
  assert.equal(csv, "\uFEFFNgày,Khách,SĐT\r\n01/10/2026,,\r\n");
});

test("toCSV neutralises spreadsheet formulas in text but keeps negative numbers", () => {
  const csv = toCSV(
    [{ text: "=HYPERLINK(\"http://x\")", plus: "+84 90", at: "@sum", amount: -50000 }],
    [{ key: "text", label: "a" }, { key: "plus", label: "b" }, { key: "at", label: "c" }, { key: "amount", label: "d" }],
  );
  assert.equal(csv, '\uFEFFa,b,c,d\r\n"\'=HYPERLINK(""http://x"")",\'+84 90,\'@sum,-50000\r\n');
});

test("downloadCSV does nothing outside the browser", () => {
  assert.equal(downloadCSV("don-hang", "a,b\r\n"), undefined);
});
