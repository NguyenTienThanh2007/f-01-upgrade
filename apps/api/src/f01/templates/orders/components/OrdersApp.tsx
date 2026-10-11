"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ORDER_CSV_COLUMNS, STORAGE_KEY, createOrder, dailyTotals, filterOrders, orderCsvRows,
  openStorage, parseStoredOrders, removeOrder, serializeOrders, setStatus, updateOrder,
  type Order, type OrderInput, type OrderStatus, type StatusFilter,
} from "../lib/orders";
import { downloadCSV, toCSV } from "../lib/vn";
import DailyTotals from "./DailyTotals";
import OrderFilters from "./OrderFilters";
import OrderForm from "./OrderForm";
import OrderList from "./OrderList";

function newId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Date.now().toString(36) + Math.random().toString(36).slice(2);
}

export default function OrdersApp() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [storage, setStorage] = useState<Storage | null>(null);
  const [saveError, setSaveError] = useState("");
  const [query, setQuery] = useState("");
  const [status, setStatusFilter] = useState<StatusFilter>("all");
  const [editing, setEditing] = useState<Order | null>(null);

  useEffect(() => {
    // Sandboxed previews block localStorage; the app still works in memory.
    const opened = openStorage(() => window.localStorage);
    setStorage(opened);
    if (opened) setOrders(parseStoredOrders(opened.getItem(STORAGE_KEY)));
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!loaded || !storage) return;
    try {
      storage.setItem(STORAGE_KEY, serializeOrders(orders));
      setSaveError("");
    } catch {
      setSaveError("Không lưu được dữ liệu. Bộ nhớ trình duyệt có thể đã đầy.");
    }
  }, [orders, loaded, storage]);

  const visible = useMemo(() => filterOrders(orders, query, status), [orders, query, status]);
  const totals = useMemo(() => dailyTotals(orders), [orders]);

  function add(input: OrderInput) {
    setOrders((current) => [...current, createOrder(input, newId(), new Date())]);
  }

  function save(input: OrderInput) {
    if (!editing) return;
    setOrders((current) => updateOrder(current, editing.id, input, new Date()));
    setEditing(null);
  }

  function remove(order: Order) {
    if (!window.confirm(`Xoá đơn của ${order.customerName}? Thao tác này không hoàn tác được.`)) return;
    setOrders((current) => removeOrder(current, order.id));
    if (editing?.id === order.id) setEditing(null);
  }

  function changeStatus(order: Order, next: OrderStatus) {
    setOrders((current) => setStatus(current, order.id, next, new Date()));
  }

  function exportCsv() {
    const day = new Date().toISOString().slice(0, 10);
    downloadCSV(`don-hang-${day}.csv`, toCSV(orderCsvRows(visible), ORDER_CSV_COLUMNS));
  }

  return (
    <main className="app">
      <header>
        <h1>Quản lý đơn hàng</h1>
        <p className="hint">Dữ liệu chỉ lưu trên trình duyệt của máy này.</p>
      </header>
      {loaded && !storage && <p className="card note" role="status">Trình duyệt đang chặn bộ nhớ (thường gặp trong khung xem thử), nên đơn hàng chỉ giữ tới khi tải lại trang.</p>}
      {saveError && <p className="card error" role="alert">{saveError}</p>}

      <section aria-labelledby="order-form-title">
        <h2 id="order-form-title">{editing ? "Sửa đơn hàng" : "Thêm đơn hàng"}</h2>
        <OrderForm
          key={editing?.id ?? "new"}
          initial={editing ?? undefined}
          submitLabel={editing ? "Lưu thay đổi" : "Thêm đơn"}
          onSubmit={editing ? save : add}
          onCancel={editing ? () => setEditing(null) : undefined}
        />
      </section>

      <DailyTotals totals={totals} />

      <section aria-labelledby="order-list-title">
        <div className="list-head">
          <h2 id="order-list-title">Danh sách đơn ({visible.length})</h2>
          <button type="button" onClick={exportCsv} disabled={visible.length === 0}>Xuất CSV</button>
        </div>
        <OrderFilters query={query} status={status} onQuery={setQuery} onStatus={setStatusFilter} />
        {loaded ? (
          <OrderList orders={visible} onEdit={setEditing} onDelete={remove} onStatus={changeStatus} />
        ) : (
          <p className="card">Đang tải dữ liệu…</p>
        )}
      </section>
    </main>
  );
}
