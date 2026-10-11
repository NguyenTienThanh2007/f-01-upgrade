"use client";

import { STATUSES, STATUS_LABELS, orderTotal, type Order, type OrderStatus } from "../lib/orders";
import { formatDate, formatVND } from "../lib/vn";

type Props = {
  orders: Order[];
  onEdit: (order: Order) => void;
  onDelete: (order: Order) => void;
  onStatus: (order: Order, status: OrderStatus) => void;
};

export default function OrderList({ orders, onEdit, onDelete, onStatus }: Props) {
  if (orders.length === 0) return <p className="card empty">Chưa có đơn hàng nào phù hợp.</p>;
  return (
    <ul className="orders">
      {orders.map((order) => (
        <li key={order.id} className={`card order status-${order.status}`}>
          <div className="order-head">
            <strong>{order.customerName}</strong>
            <span className="badge">{STATUS_LABELS[order.status]}</span>
          </div>
          <p><a href={`tel:${order.phone.replace(/[\s.-]/g, "")}`}>{order.phone}</a> · {formatDate(order.createdAt)}</p>
          <p>{order.product} × {order.quantity} = <strong>{formatVND(orderTotal(order))}</strong></p>
          {order.note && <p className="note">{order.note}</p>}
          <label className="sr-only" htmlFor={`status-${order.id}`}>Trạng thái đơn của {order.customerName}</label>
          <select id={`status-${order.id}`} value={order.status} onChange={(e) => onStatus(order, e.target.value as OrderStatus)}>
            {STATUSES.map((value) => <option key={value} value={value}>{STATUS_LABELS[value]}</option>)}
          </select>
          <div className="actions">
            <button type="button" onClick={() => onEdit(order)}>Sửa</button>
            <button type="button" className="danger" onClick={() => onDelete(order)}>Xoá</button>
          </div>
        </li>
      ))}
    </ul>
  );
}
