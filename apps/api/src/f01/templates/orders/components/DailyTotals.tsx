import type { DailyTotal } from "../lib/orders";
import { formatDate, formatVND } from "../lib/vn";

export default function DailyTotals({ totals }: { totals: DailyTotal[] }) {
  return (
    <section className="card" aria-labelledby="daily-totals">
      <h2 id="daily-totals">Tổng tiền theo ngày</h2>
      <p className="hint">Không tính đơn đã huỷ.</p>
      {totals.length === 0 ? <p>Chưa có doanh thu.</p> : (
        <table>
          <thead><tr><th scope="col">Ngày</th><th scope="col">Số đơn</th><th scope="col">Tổng tiền</th></tr></thead>
          <tbody>
            {totals.slice(0, 14).map((day) => (
              <tr key={day.date}><td>{formatDate(day.date)}</td><td>{day.count}</td><td>{formatVND(day.total)}</td></tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
