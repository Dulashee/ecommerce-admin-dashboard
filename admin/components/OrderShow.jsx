import React from "react";

const STATUS_LABELS = {
  pending: "Draft — add products, then place order",
  confirmed: "Placed — waiting for admin",
  completed: "Completed",
  cancelled: "Cancelled",
};

const STATUS_COLORS = {
  pending: "#d97706",
  confirmed: "#2563eb",
  completed: "#059669",
  cancelled: "#dc2626",
};

const OrderShow = ({ record, currentAdmin }) => {
  const params = record?.params || {};
  const orderId = params.id;
  const status = params.status || "pending";
  const isAdmin = currentAdmin?.role === "admin";

  let lines = [];
  try {
    lines = JSON.parse(params.orderLines || "[]");
  } catch {
    lines = [];
  }

  const total = Number(params.totalAmount || 0);
  const canEdit = status === "pending";

  const formatMoney = (n) =>
    `Rs. ${Number(n || 0).toLocaleString(undefined, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    })}`;

  const addProductUrl = `/admin/resources/OrderItems/actions/new?orderId=${orderId}`;

  return (
    <div style={wrapStyle}>
      <div style={headerRowStyle}>
        <div>
          <h2 style={{ margin: 0, fontSize: "22px" }}>Order #{orderId}</h2>
          <span
            style={{
              ...badgeStyle,
              background: `${STATUS_COLORS[status] || "#64748b"}18`,
              color: STATUS_COLORS[status] || "#64748b",
              border: `1px solid ${STATUS_COLORS[status] || "#64748b"}`,
            }}
          >
            {STATUS_LABELS[status] || status}
          </span>
        </div>
        <div style={totalBoxStyle}>
          <span style={totalLabelStyle}>Order total</span>
          <span style={totalValueStyle}>{formatMoney(total)}</span>
          <span style={totalHintStyle}>
            {lines.length === 0
              ? "Total updates when you add products"
              : `${lines.length} product line(s) — all lines count toward this total`}
          </span>
        </div>
      </div>

      {params.notes && (
        <p style={notesStyle}>
          <strong>Notes:</strong> {params.notes}
        </p>
      )}

      {isAdmin && params.userId && (
        <p style={metaStyle}>
          <strong>Customer ID:</strong> {params.userId}
        </p>
      )}

      {canEdit && (
        <div style={stepsStyle}>
          <strong>How this order works</strong>
          <ol style={{ margin: "8px 0 0", paddingLeft: "20px", lineHeight: 1.6 }}>
            <li>Add every product you want below (each line = product + quantity).</li>
            <li>Check the total — all lines below are included together.</li>
            <li>
              Use <strong>Confirm &amp; place order</strong> when ready (stock is
              already reserved for each line above).
            </li>
          </ol>
        </div>
      )}

      <div style={tableWrapStyle}>
        <div style={tableHeadStyle}>
          <span>Products in this order</span>
          {canEdit && (
            <a href={addProductUrl} style={addBtnStyle}>
              + Add product
            </a>
          )}
        </div>

        {lines.length === 0 ? (
          <div style={emptyStyle}>
            <p style={{ margin: 0 }}>No products yet.</p>
            {canEdit && (
              <a href={addProductUrl} style={{ ...addBtnStyle, marginTop: "12px" }}>
                Add your first product
              </a>
            )}
          </div>
        ) : (
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>Product</th>
                <th style={thStyle}>Qty</th>
                <th style={thStyle}>Unit price</th>
                <th style={thStyle}>Line total</th>
              </tr>
            </thead>
            <tbody>
              {lines.map((line) => (
                <tr key={line.id}>
                  <td style={tdStyle}>{line.productName}</td>
                  <td style={tdStyle}>{line.quantity}</td>
                  <td style={tdStyle}>{formatMoney(line.price)}</td>
                  <td style={tdStyle}>{formatMoney(line.lineTotal)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={3} style={footLabelStyle}>
                  Order total (all lines above)
                </td>
                <td style={footValueStyle}>{formatMoney(total)}</td>
              </tr>
            </tfoot>
          </table>
        )}
      </div>

      <p style={finePrintStyle}>
        Created: {params.createdAt ? new Date(params.createdAt).toLocaleString() : "—"}
        {params.updatedAt && params.updatedAt !== params.createdAt && (
          <> · Updated: {new Date(params.updatedAt).toLocaleString()}</>
        )}
      </p>
    </div>
  );
};

const wrapStyle = {
  padding: "24px",
  fontFamily: "Segoe UI, Arial, sans-serif",
  maxWidth: "900px",
};

const headerRowStyle = {
  display: "flex",
  flexWrap: "wrap",
  justifyContent: "space-between",
  gap: "20px",
  marginBottom: "20px",
};

const badgeStyle = {
  display: "inline-block",
  marginTop: "8px",
  padding: "4px 10px",
  borderRadius: "6px",
  fontSize: "13px",
  fontWeight: 600,
};

const totalBoxStyle = {
  textAlign: "right",
  padding: "16px 20px",
  background: "#f0fdf4",
  borderRadius: "10px",
  border: "1px solid #bbf7d0",
  minWidth: "200px",
};

const totalLabelStyle = {
  display: "block",
  fontSize: "12px",
  color: "#64748b",
  textTransform: "uppercase",
  letterSpacing: "0.04em",
};

const totalValueStyle = {
  display: "block",
  fontSize: "28px",
  fontWeight: 700,
  color: "#166534",
  marginTop: "4px",
};

const totalHintStyle = {
  display: "block",
  fontSize: "12px",
  color: "#64748b",
  marginTop: "6px",
  maxWidth: "220px",
  marginLeft: "auto",
};

const notesStyle = {
  margin: "0 0 16px",
  padding: "12px",
  background: "#f8fafc",
  borderRadius: "8px",
  color: "#334155",
};

const metaStyle = { margin: "0 0 12px", color: "#64748b", fontSize: "14px" };

const stepsStyle = {
  marginBottom: "20px",
  padding: "14px 16px",
  background: "#eff6ff",
  borderRadius: "8px",
  color: "#1e40af",
  fontSize: "14px",
};

const tableWrapStyle = {
  border: "1px solid #e2e8f0",
  borderRadius: "10px",
  overflow: "hidden",
};

const tableHeadStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  padding: "12px 16px",
  background: "#f8fafc",
  fontWeight: 600,
  color: "#0f172a",
};

const addBtnStyle = {
  display: "inline-block",
  padding: "8px 14px",
  background: "#4f46e5",
  color: "#fff",
  borderRadius: "6px",
  textDecoration: "none",
  fontSize: "14px",
  fontWeight: 600,
};

const emptyStyle = {
  padding: "32px",
  textAlign: "center",
  color: "#64748b",
};

const tableStyle = { width: "100%", borderCollapse: "collapse" };
const thStyle = {
  textAlign: "left",
  padding: "10px 16px",
  fontSize: "12px",
  textTransform: "uppercase",
  color: "#64748b",
  borderBottom: "1px solid #e2e8f0",
  background: "#fff",
};
const tdStyle = {
  padding: "12px 16px",
  borderBottom: "1px solid #f1f5f9",
  color: "#0f172a",
};
const footLabelStyle = {
  padding: "14px 16px",
  textAlign: "right",
  fontWeight: 600,
  color: "#334155",
};
const footValueStyle = {
  padding: "14px 16px",
  fontWeight: 700,
  fontSize: "18px",
  color: "#166534",
};

const finePrintStyle = {
  marginTop: "16px",
  fontSize: "12px",
  color: "#94a3b8",
};

export default OrderShow;
