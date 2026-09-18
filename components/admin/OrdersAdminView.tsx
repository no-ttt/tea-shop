"use client";

import { useState, useTransition } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import type { AdminOrder, AdminOrderFailure } from "@/lib/admin-data";
import type { OrderStatus } from "@/lib/types";
import { parseErrorMessage } from "@/lib/admin-client-helpers";
import CustomSelect from "@/components/CustomSelect";
import styles from "./adminShared.module.css";

const STATUS_LABEL: Record<OrderStatus, string> = {
  pending_payment: "待付款",
  paid: "已付款",
  cancelled: "已取消",
};

const SHIPPING_LABEL: Record<AdminOrder["shippingMethod"], string> = {
  mail: "郵寄",
  cvs: "超商取貨",
};

const PAYMENT_LABEL: Record<AdminOrder["paymentMethod"], string> = {
  bank: "匯款",
  linepay: "LINE Pay",
};

export default function OrdersAdminView({
  orders,
  ordersTotal,
  ordersPage,
  ordersPageSize,
  statusFilter,
  failures,
  failuresTotal,
  failuresPage,
  failuresPageSize,
}: {
  orders: AdminOrder[];
  ordersTotal: number;
  ordersPage: number;
  ordersPageSize: number;
  statusFilter: OrderStatus | "all";
  failures: AdminOrderFailure[];
  failuresTotal: number;
  failuresPage: number;
  failuresPageSize: number;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tab = searchParams.get("tab") === "failures" ? "failures" : "orders";
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const navigate = (updates: Record<string, string | undefined>) => {
    const next = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(updates)) {
      if (value === undefined) next.delete(key);
      else next.set(key, value);
    }
    router.push(`${pathname}?${next.toString()}`);
  };

  const ordersTotalPages = Math.max(1, Math.ceil(ordersTotal / ordersPageSize));
  const failuresTotalPages = Math.max(1, Math.ceil(failuresTotal / failuresPageSize));
  const ordersPageOutOfRange = orders.length === 0 && ordersTotal > 0 && ordersPage > ordersTotalPages;
  const failuresPageOutOfRange = failures.length === 0 && failuresTotal > 0 && failuresPage > failuresTotalPages;

  return (
    <div>
      <h1 className={styles.pageTitle}>訂單管理</h1>

      <div className={styles.toolbar}>
        <button
          type="button"
          className={tab === "orders" ? styles.button : styles.buttonSecondary}
          onClick={() => navigate({ tab: undefined })}
        >
          訂單列表（{ordersTotal}）
        </button>
        <button
          type="button"
          className={tab === "failures" ? styles.button : styles.buttonSecondary}
          onClick={() => navigate({ tab: "failures" })}
        >
          失敗記錄（{failuresTotal}）
        </button>
      </div>

      {tab === "orders" ? (
        <div className={styles.section}>
          <div className={styles.toolbar}>
            <button
              type="button"
              className={statusFilter === "all" ? styles.button : styles.buttonSecondary}
              onClick={() => navigate({ status: undefined, ordersPage: undefined })}
            >
              全部
            </button>
            {(Object.keys(STATUS_LABEL) as OrderStatus[]).map((s) => (
              <button
                key={s}
                type="button"
                className={statusFilter === s ? styles.button : styles.buttonSecondary}
                onClick={() => navigate({ status: s, ordersPage: undefined })}
              >
                {STATUS_LABEL[s]}
              </button>
            ))}
          </div>

          {orders.length === 0 ? (
            <div className={styles.emptyState}>
              {ordersPageOutOfRange ? (
                <>
                  此頁碼沒有資料。
                  <button
                    type="button"
                    className={styles.buttonSecondary}
                    style={{ marginLeft: 8 }}
                    onClick={() => navigate({ ordersPage: undefined })}
                  >
                    回到第一頁
                  </button>
                </>
              ) : ordersTotal === 0 ? (
                "目前還沒有任何訂單"
              ) : (
                "這個狀態底下沒有訂單"
              )}
            </div>
          ) : (
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>訂單編號</th>
                    <th>下單時間</th>
                    <th>客戶姓名</th>
                    <th>配送方式</th>
                    <th>付款方式</th>
                    <th>總額</th>
                    <th>狀態</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order) => (
                    <OrderRow
                      key={order.id}
                      order={order}
                      expanded={expandedId === order.id}
                      onToggle={() => setExpandedId((cur) => (cur === order.id ? null : order.id))}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <Pagination
            page={ordersPage}
            totalPages={ordersTotalPages}
            onChange={(p) => navigate({ ordersPage: p === 1 ? undefined : String(p) })}
          />
        </div>
      ) : (
        <div className={styles.section}>
          {failures.length === 0 ? (
            <div className={styles.emptyState}>
              {failuresPageOutOfRange ? (
                <>
                  此頁碼沒有資料。
                  <button
                    type="button"
                    className={styles.buttonSecondary}
                    style={{ marginLeft: 8 }}
                    onClick={() => navigate({ failuresPage: undefined })}
                  >
                    回到第一頁
                  </button>
                </>
              ) : (
                "目前沒有系統性訂單失敗記錄"
              )}
            </div>
          ) : (
            failures.map((failure) => <FailureCard key={failure.id} failure={failure} />)
          )}

          <Pagination
            page={failuresPage}
            totalPages={failuresTotalPages}
            onChange={(p) => navigate({ failuresPage: p === 1 ? undefined : String(p) })}
          />
        </div>
      )}
    </div>
  );
}

function Pagination({
  page,
  totalPages,
  onChange,
}: {
  page: number;
  totalPages: number;
  onChange: (page: number) => void;
}) {
  if (totalPages <= 1) return null;
  return (
    <div className={styles.toolbar} style={{ marginTop: 16, justifyContent: "center" }}>
      <button type="button" className={styles.buttonSecondary} disabled={page <= 1} onClick={() => onChange(page - 1)}>
        上一頁
      </button>
      <span className={styles.helpText}>
        第 {page} / {totalPages} 頁
      </span>
      <button
        type="button"
        className={styles.buttonSecondary}
        disabled={page >= totalPages}
        onClick={() => onChange(page + 1)}
      >
        下一頁
      </button>
    </div>
  );
}

function OrderRow({
  order,
  expanded,
  onToggle,
}: {
  order: AdminOrder;
  expanded: boolean;
  onToggle: () => void;
}) {
  const router = useRouter();
  const [status, setStatus] = useState<OrderStatus>(order.status);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [copied, setCopied] = useState(false);

  const handleCopyOrderId = async () => {
    try {
      await navigator.clipboard.writeText(order.id);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // 剪貼簿權限被擋時靜默失敗，使用者仍可用 title 屬性 hover 看到完整編號。
    }
  };

  const handleStatusChange = async (next: OrderStatus) => {
    const prev = status;
    setStatus(next);
    setError(null);
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/orders/${order.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      if (!res.ok) {
        setStatus(prev);
        setError(await parseErrorMessage(res, "更新狀態失敗"));
        setSaving(false);
        return;
      }
      startTransition(() => {
        router.refresh();
      });
      setSaving(false);
    } catch {
      setStatus(prev);
      setError("更新狀態失敗，請確認網路連線");
      setSaving(false);
    }
  };

  return (
    <>
      <tr>
        <td>
          <span className={styles.orderIdWrap}>
            <button type="button" className={styles.orderIdCell} onClick={handleCopyOrderId}>
              {order.id}
            </button>
            <span className={styles.orderIdTooltip}>{copied ? "已複製" : "點擊複製"}</span>
          </span>
        </td>
        <td>{order.createdAt}</td>
        <td>{order.customerName}</td>
        <td>{SHIPPING_LABEL[order.shippingMethod]}</td>
        <td>{PAYMENT_LABEL[order.paymentMethod]}</td>
        <td>NT${order.total}</td>
        <td>
          <CustomSelect
            value={status}
            disabled={saving || isPending}
            onChange={(v) => handleStatusChange(v as OrderStatus)}
            options={(Object.keys(STATUS_LABEL) as OrderStatus[]).map((s) => ({
              value: s,
              label: STATUS_LABEL[s],
            }))}
          />
        </td>
        <td>
          <button type="button" className={styles.buttonSecondary} onClick={onToggle}>
            {expanded ? "收合" : "明細"}
          </button>
        </td>
      </tr>
      {error && (
        <tr>
          <td colSpan={8}>
            <p className={styles.helpText} style={{ color: "#c0392b" }}>
              {error}
            </p>
          </td>
        </tr>
      )}
      {expanded && (
        <tr>
          <td colSpan={8}>
            <OrderDetail order={order} />
          </td>
        </tr>
      )}
    </>
  );
}

function OrderDetail({ order }: { order: AdminOrder }) {
  return (
    <div className={styles.card} style={{ marginTop: 0, marginBottom: 0 }}>
      <div className={styles.fieldRow}>
        <div>
          <p className={styles.helpText}>聯絡電話</p>
          <p>{order.customerPhone}</p>
        </div>
        <div>
          <p className={styles.helpText}>Email</p>
          <p>{order.customerEmail}</p>
        </div>
        {order.customerLineId && (
          <div>
            <p className={styles.helpText}>LINE ID</p>
            <p>{order.customerLineId}</p>
          </div>
        )}
      </div>

      {order.shippingMethod === "cvs" ? (
        <p className={styles.helpText} style={{ marginTop: 8 }}>
          超商門市：{order.cvsStoreName}（{order.cvsType}）
        </p>
      ) : (
        <p className={styles.helpText} style={{ marginTop: 8 }}>
          郵寄地址：{order.customerZip} {order.customerAddress}
        </p>
      )}

      {order.isGift && (
        <p className={styles.helpText} style={{ marginTop: 4 }}>
          送禮收件人：{order.giftName}
        </p>
      )}

      {order.paymentMethod === "bank" && order.bankTransferLast5 && (
        <p className={styles.helpText} style={{ marginTop: 4 }}>
          匯款後五碼：{order.bankTransferLast5}
        </p>
      )}
      {order.paymentMethod === "linepay" && order.linePayLast3 && (
        <p className={styles.helpText} style={{ marginTop: 4 }}>
          LINE Pay 後三碼：{order.linePayLast3}
        </p>
      )}

      <div className={styles.tableWrap} style={{ marginTop: 12 }}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>品項</th>
              <th>規格</th>
              <th>單價</th>
            </tr>
          </thead>
          <tbody>
            {order.items.map((item) => (
              <tr key={item.key}>
                <td>{item.name}</td>
                <td>{item.detail}</td>
                <td>NT${item.price}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ marginTop: 12, textAlign: "right" }}>
        <p className={styles.helpText}>商品小計：NT${order.subtotal}</p>
        {order.bundleName && (
          <p className={styles.helpText}>
            組合折扣（{order.bundleName}）：-NT${order.bundleDiscountAmount}
          </p>
        )}
        <p className={styles.helpText}>運費：NT${order.shippingFee}</p>
        <p style={{ fontWeight: 700 }}>應付總額：NT${order.total}</p>
      </div>
    </div>
  );
}

function FailureCard({ failure }: { failure: AdminOrderFailure }) {
  const [showPayload, setShowPayload] = useState(false);
  const formattedPayload = (() => {
    try {
      return JSON.stringify(JSON.parse(failure.payloadSnapshot), null, 2);
    } catch {
      return failure.payloadSnapshot;
    }
  })();

  return (
    <div className={styles.card}>
      <div className={styles.cardHeader}>
        <div>
          <div style={{ fontWeight: 700 }}>{failure.orderIdAttempt ?? "（訂單編號未產生）"}</div>
          <div style={{ fontSize: 12.5, color: "var(--muted)", marginTop: 2 }}>{failure.occurredAt}</div>
        </div>
        <button type="button" className={styles.buttonSecondary} onClick={() => setShowPayload((v) => !v)}>
          {showPayload ? "收合" : "查看訂單內容"}
        </button>
      </div>
      <p className={styles.helpText} style={{ marginTop: 8, color: "#c0392b" }}>
        {failure.errorMessage}
      </p>
      {showPayload && (
        <pre
          style={{
            marginTop: 8,
            padding: 12,
            background: "var(--card-bg, #f5f2ea)",
            borderRadius: 8,
            fontSize: 12,
            overflowX: "auto",
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
          }}
        >
          {formattedPayload}
        </pre>
      )}
    </div>
  );
}
