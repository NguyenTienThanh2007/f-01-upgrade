"use client";

import { STATUSES, STATUS_LABELS, type StatusFilter } from "../lib/orders";

type Props = {
  query: string;
  status: StatusFilter;
  onQuery: (value: string) => void;
  onStatus: (value: StatusFilter) => void;
};

export default function OrderFilters({ query, status, onQuery, onStatus }: Props) {
  return (
    <div className="card filters" role="search">
      <label htmlFor="order-search">Tìm theo tên khách hoặc số điện thoại</label>
      <input id="order-search" type="search" value={query} placeholder="Ví dụ: Hoa hoặc 0901"
        onChange={(e) => onQuery(e.target.value)} />
      <label htmlFor="order-status-filter">Lọc theo trạng thái</label>
      <select id="order-status-filter" value={status} onChange={(e) => onStatus(e.target.value as StatusFilter)}>
        <option value="all">Tất cả trạng thái</option>
        {STATUSES.map((value) => <option key={value} value={value}>{STATUS_LABELS[value]}</option>)}
      </select>
    </div>
  );
}
