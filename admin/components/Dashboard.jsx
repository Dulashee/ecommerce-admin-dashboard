import React, { useCallback, useEffect, useState } from "react";

import { ApiClient, useCurrentAdmin } from "adminjs";



const REFRESH_MS = 8000;



const Dashboard = () => {

  const [currentAdmin] = useCurrentAdmin();

  const [stats, setStats] = useState({});

  const [loading, setLoading] = useState(true);

  const [lastUpdated, setLastUpdated] = useState(null);



  const isAdmin = currentAdmin?.role === "admin";



  const refresh = useCallback(async (silent = true) => {

    if (!silent) {

      setLoading(true);

    }



    try {

      const api = new ApiClient();

      const { data } = await api.getDashboard();

      setStats(data || {});

      setLastUpdated(new Date());

    } catch {

      /* keep previous stats on network error */

    } finally {

      setLoading(false);

    }

  }, []);



  useEffect(() => {

    refresh(false);

  }, [refresh]);



  useEffect(() => {

    if (!isAdmin) {

      return undefined;

    }



    const timer = setInterval(() => refresh(true), REFRESH_MS);

    return () => clearInterval(timer);

  }, [isAdmin, refresh]);



  const formatMoney = (amount) =>

    `Rs. ${Number(amount || 0).toLocaleString()}`;



  const formatTime = (date) =>

    date

      ? date.toLocaleTimeString(undefined, {

          hour: "2-digit",

          minute: "2-digit",

          second: "2-digit",

        })

      : "—";



  if (loading && !Object.keys(stats).length) {

    return (

      <div style={pageStyle}>

        <p style={{ color: "#64748b", margin: 0 }}>Loading dashboard…</p>

      </div>

    );

  }



  if (isAdmin) {

    return (

      <AdminDashboard

        stats={stats}

        loading={loading}

        lastUpdated={lastUpdated}

        onRefresh={() => refresh(false)}

        formatMoney={formatMoney}

        formatTime={formatTime}

      />

    );

  }



  return (

    <CustomerDashboard stats={stats} formatMoney={formatMoney} />

  );

};



const AdminDashboard = ({

  stats,

  loading,

  lastUpdated,

  onRefresh,

  formatMoney,

  formatTime,

}) => {

  const mainCards = [

    {

      label: "Total users",

      value: stats.usersCount ?? 0,

      accent: "#4f46e5",

      hint: "Registered accounts",

    },

    {

      label: "Total orders",

      value: stats.ordersCount ?? 0,

      accent: "#059669",

      hint: "All statuses",

    },

    {

      label: "Total revenue",

      value: formatMoney(stats.totalRevenue),

      accent: "#d97706",

      hint: "Placed + completed orders",

    },

  ];



  return (

    <div style={pageStyle}>

      <div style={headerRowStyle}>

        <div>

          <h1 style={{ margin: 0, fontSize: "28px" }}>Admin dashboard</h1>

          <p style={{ margin: "8px 0 0", color: "#64748b", fontSize: "16px" }}>

            Welcome

            {stats.adminName ? (

              <span style={{ color: "#0f172a", fontWeight: 600 }}>

                {" "}

                {stats.adminName}

              </span>

            ) : null}

            — store overview

          </p>

        </div>

        <div style={liveBoxStyle}>

          <span style={liveDotStyle} />

          <span style={{ fontSize: "13px", color: "#64748b" }}>

            {loading ? "Updating…" : "Live"}

          </span>

          <span style={{ fontSize: "12px", color: "#94a3b8" }}>

            {formatTime(lastUpdated)}

          </span>

          <button type="button" onClick={onRefresh} style={refreshBtnStyle}>

            Refresh now

          </button>

        </div>

      </div>



      <div style={mainGridStyle}>

        {mainCards.map((card) => (

          <div key={card.label} style={cardStyle(card.accent)}>

            <p style={labelStyle}>{card.label}</p>

            <p style={valueStyle}>{card.value}</p>

            <p style={hintStyle}>{card.hint}</p>

          </div>

        ))}

      </div>



      <p style={footerNoteStyle}>

        Numbers refresh automatically every {REFRESH_MS / 1000} seconds while

        this page is open.

      </p>

    </div>

  );

};



const CustomerDashboard = ({ stats, formatMoney }) => {

  const cards = [

    {

      label: "Products available",

      value: stats.productsCount ?? 0,

      accent: "#0891b2",

    },

    {

      label: "My orders",

      value: stats.ordersCount ?? 0,

      accent: "#059669",

    },

    {

      label: "My total spent",

      value: formatMoney(stats.totalSpent),

      accent: "#d97706",

    },

  ];



  const displayName = stats.userName || "Customer";



  return (

    <div style={pageStyle}>

      <div style={headerStyle}>

        <h1 style={{ margin: 0, fontSize: "28px" }}>My account</h1>

        <p style={{ margin: "8px 0 0", color: "#64748b" }}>

          Welcome back, {displayName}. Browse products and place orders.

        </p>

      </div>



      <div style={customerGridStyle}>

        {cards.map((card) => (

          <div key={card.label} style={cardStyle(card.accent)}>

            <p style={labelStyle}>{card.label}</p>

            <p style={valueStyle}>{card.value}</p>

          </div>

        ))}

      </div>



      <p style={orderHintStyle}>

        <strong>How to order:</strong> (1) <strong>My Orders → Orders → Start

        new order</strong> — optional delivery notes. (2) On the order page,{" "}

        <strong>Add product</strong> for each item (stock is reserved

        immediately). (3) <strong>Confirm &amp; place order</strong> when the

        total is correct.

      </p>

    </div>

  );

};



const pageStyle = {

  padding: "32px",

  fontFamily: "Segoe UI, Arial, sans-serif",

  maxWidth: "1000px",

};



const headerStyle = {

  borderBottom: "1px solid #e2e8f0",

  paddingBottom: "20px",

};



const headerRowStyle = {

  display: "flex",

  flexWrap: "wrap",

  justifyContent: "space-between",

  alignItems: "flex-start",

  gap: "16px",

  borderBottom: "1px solid #e2e8f0",

  paddingBottom: "20px",

};



const liveBoxStyle = {

  display: "flex",

  flexDirection: "column",

  alignItems: "flex-end",

  gap: "6px",

};



const liveDotStyle = {

  width: "8px",

  height: "8px",

  borderRadius: "50%",

  background: "#22c55e",

  boxShadow: "0 0 0 3px rgba(34, 197, 94, 0.25)",

  alignSelf: "flex-end",

};



const refreshBtnStyle = {

  marginTop: "4px",

  padding: "6px 12px",

  fontSize: "13px",

  border: "1px solid #e2e8f0",

  borderRadius: "6px",

  background: "#fff",

  cursor: "pointer",

  color: "#334155",

};



const mainGridStyle = {

  display: "grid",

  gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",

  gap: "20px",

  marginTop: "28px",

};



const customerGridStyle = {

  display: "grid",

  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",

  gap: "20px",

  marginTop: "28px",

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

  margin: "8px 0 0",

  fontSize: "12px",

  color: "#94a3b8",

};



const orderHintStyle = {

  marginTop: "28px",

  padding: "14px 16px",

  background: "#f8fafc",

  borderRadius: "8px",

  color: "#475569",

  fontSize: "14px",

  lineHeight: 1.5,

};



const footerNoteStyle = {

  marginTop: "24px",

  fontSize: "13px",

  color: "#94a3b8",

};



const cardStyle = (accent) => ({

  background: "#fff",

  padding: "24px",

  borderRadius: "12px",

  boxShadow: "0 1px 3px rgba(15, 23, 42, 0.08)",

  borderLeft: `4px solid ${accent}`,

});



export default Dashboard;

