import React from "react";

const Dashboard = (props) => {

  const {
    usersCount,
    productsCount,
    ordersCount,
    totalRevenue,
  } = props;

  return (
    <div
      style={{
        padding: "30px",
        fontFamily: "Arial",
      }}
    >

      <h1>
        Xcelen eCommerce Dashboard
      </h1>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(2, 1fr)",
          gap: "20px",
          marginTop: "30px",
        }}
      >

        <div style={cardStyle}>
          <h2>Total Users</h2>
          <h1>{usersCount}</h1>
        </div>

        <div style={cardStyle}>
          <h2>Total Products</h2>
          <h1>{productsCount}</h1>
        </div>

        <div style={cardStyle}>
          <h2>Total Orders</h2>
          <h1>{ordersCount}</h1>
        </div>

        <div style={cardStyle}>
          <h2>Total Revenue</h2>
          <h1>Rs. {totalRevenue}</h1>
        </div>

      </div>
    </div>
  );
};

const cardStyle = {
  background: "#fff",
  padding: "30px",
  borderRadius: "10px",
  boxShadow: "0 2px 10px rgba(0,0,0,0.1)",
};

export default Dashboard;