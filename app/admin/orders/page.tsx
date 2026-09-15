import { listOrders, listOrderFailures } from "@/lib/admin-data";
import { ORDER_STATUSES } from "@/lib/types";
import type { OrderStatus } from "@/lib/types";
import OrdersAdminView from "@/components/admin/OrdersAdminView";

function parsePage(value: string | string[] | undefined): number {
  const raw = Array.isArray(value) ? value[0] : value;
  const parsed = Number(raw);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 1;
}

function parseStatus(value: string | string[] | undefined): OrderStatus | undefined {
  const raw = Array.isArray(value) ? value[0] : value;
  return ORDER_STATUSES.includes(raw as OrderStatus) ? (raw as OrderStatus) : undefined;
}

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const ordersPage = parsePage(params.ordersPage);
  const failuresPage = parsePage(params.failuresPage);
  const status = parseStatus(params.status);

  const [ordersResult, failuresResult] = await Promise.all([
    listOrders({ page: ordersPage, status }),
    listOrderFailures({ page: failuresPage }),
  ]);

  return (
    <OrdersAdminView
      orders={ordersResult.orders}
      ordersTotal={ordersResult.total}
      ordersPage={ordersResult.page}
      ordersPageSize={ordersResult.pageSize}
      statusFilter={status ?? "all"}
      failures={failuresResult.failures}
      failuresTotal={failuresResult.total}
      failuresPage={failuresResult.page}
      failuresPageSize={failuresResult.pageSize}
    />
  );
}
