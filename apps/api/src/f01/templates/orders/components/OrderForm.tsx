"use client";

import { useState, type FormEvent } from "react";
import { EMPTY_INPUT, orderTotal, validateOrder, type OrderErrors, type OrderInput } from "../lib/orders";
import { formatVND } from "../lib/vn";

type Props = {
  initial?: OrderInput;
  submitLabel: string;
  onSubmit: (input: OrderInput) => void;
  onCancel?: () => void;
};

function toInteger(value: string): number {
  const digits = value.replace(/\D/g, "");
  return digits ? Number(digits) : 0;
}

export default function OrderForm({ initial = EMPTY_INPUT, submitLabel, onSubmit, onCancel }: Props) {
  const [input, setInput] = useState<OrderInput>(initial);
  const [errors, setErrors] = useState<OrderErrors>({});

  function change<K extends keyof OrderInput>(key: K, value: OrderInput[K]) {
    setInput((current) => ({ ...current, [key]: value }));
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const found = validateOrder(input);
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    onSubmit(input);
    if (!onCancel) setInput(EMPTY_INPUT);
  }

  const field = (key: keyof OrderInput) => ({
    id: `order-${key}`,
    "aria-invalid": errors[key] ? true : undefined,
    "aria-describedby": errors[key] ? `order-${key}-error` : undefined,
  });
  const error = (key: keyof OrderInput) =>
    errors[key] ? <p className="error" id={`order-${key}-error`}>{errors[key]}</p> : null;

  return (
    <form className="card form" onSubmit={submit} noValidate>
      <label htmlFor="order-customerName">Tên khách hàng</label>
      <input {...field("customerName")} value={input.customerName} autoComplete="name"
        onChange={(e) => change("customerName", e.target.value)} />
      {error("customerName")}

      <label htmlFor="order-phone">Số điện thoại</label>
      <input {...field("phone")} value={input.phone} type="tel" inputMode="tel" autoComplete="tel"
        onChange={(e) => change("phone", e.target.value)} />
      {error("phone")}

      <label htmlFor="order-product">Sản phẩm</label>
      <input {...field("product")} value={input.product} onChange={(e) => change("product", e.target.value)} />
      {error("product")}

      <div className="row">
        <div>
          <label htmlFor="order-quantity">Số lượng</label>
          <input {...field("quantity")} value={String(input.quantity)} inputMode="numeric"
            onChange={(e) => change("quantity", toInteger(e.target.value))} />
          {error("quantity")}
        </div>
        <div>
          <label htmlFor="order-unitPrice">Đơn giá (₫)</label>
          <input {...field("unitPrice")} value={String(input.unitPrice)} inputMode="numeric"
            onChange={(e) => change("unitPrice", toInteger(e.target.value))} />
          {error("unitPrice")}
        </div>
      </div>

      <label htmlFor="order-note">Ghi chú</label>
      <textarea id="order-note" value={input.note} rows={2} onChange={(e) => change("note", e.target.value)} />

      <p className="total">Thành tiền: <strong>{formatVND(orderTotal(input))}</strong></p>
      <div className="actions">
        <button type="submit" className="primary">{submitLabel}</button>
        {onCancel && <button type="button" onClick={onCancel}>Huỷ sửa</button>}
      </div>
    </form>
  );
}
