import React from "react";

const Dashboard = (props) => {
  const {
    role,
    userName,
    usersCount,
    productsCount,
    ordersCount,
    totalRevenue,
    totalSpent,
  } = props;

  const isAdmin = role === "admin";

  const formatMoney = (amount) =>
    `Rs. ${Number(amount || 0).toLocaleString()}`;

  const cards = isAdmin
    ? [
        { label: "Total Users", value: usersCount, accent: "#4f46e5" },
        { label: "Total Products", value: productsCount, accent: "#0891b2" },
        { label: "Total Orders", value: ordersCount, accent: "#059669" },
        {
          label: "Total Revenue",
          value: formatMoney(totalRevenue),
          accent: "#d97706",
        },
      ]
    : [
        { label: "Products Available", value: productsCount, accent: "#0891b2" },
        { label: "My Orders", value: ordersCount, accent: "#059669" },
        {
          label: "My Total Spent",
          value: formatMoney(totalSpent),
          accent: "#d97706",
        },
      ];

  return (
    <div style={pageStyle}>
      <div style={headerStyle}>
        <h1 style={{ margin: 0, fontSize: "28px" }}>
          {isAdmin ? "Store Overview" : "My Account"}
        </h1>
        <p style={{ margin: "8px 0 0", color: "#64748b" }}>
          {isAdmin
            ? "Admin summary for the eCommerce store."
            : `Welcome back, ${userName || "Customer"}. Browse products and place orders.`}
        </p>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: isAdmin
            ? "repeat(2, 1fr)"
            : "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "20px",
          marginTop: "28px",
        }}
      >
        {cards.map((card) => (
          <div key={card.label} style={cardStyle(card.accent)}>
            <p style={labelStyle}>{card.label}</p>
            <p style={valueStyle}>{card.value}</p>
          </div>
        ))}
      </div>

      {!isAdmin && (
        <p style={hintStyle}>
          You can view products and categories. Create orders under My Orders.
          Catalog management is restricted to administrators.
        </p>
      )}
    </div>
  );
};

const pageStyle = {
  padding: "32px",
  fontFamily: "Segoe UI, Arial, sans-serif",
  maxWidth: "900px",
};

const headerStyle = {
  borderBottom: "1px solid #e2e8f0",
  paddingBottom: "20px",
};

const labelStyle = {
  margin: 0,
  fontSize: "14px",
  color: "#64748b",
  textTransform: "uppercase",
  letterSpacing: "0.04em",
};

const valueStyle = {
  margin: "12px 0 0",
  fontSize: "32px",
  fontWeight: "700",
  color: "#0f172a",
};

const hintStyle = {
  marginTop: "28px",
  padding: "14px 16px",
  background: "#f8fafc",
  borderRadius: "8px",
  color: "#475569",
  fontSize: "14px",
  lineHeight: 1.5,
};

const cardStyle = (accent) => ({
  background: "#fff",
  padding: "24px",
  borderRadius: "12px",
  boxShadow: "0 1px 3px rgba(15, 23, 42, 0.08)",
  borderLeft: `4px solid ${accent}`,
});

export default Dashboard;
