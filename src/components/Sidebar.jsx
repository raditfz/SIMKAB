import React from "react";
import { Link, useLocation } from "react-router-dom";

const Sidebar = () => {
  const location = useLocation(); // Dapatkan path saat ini

  const sidebarStyle = {
    width: "220px",
    height: "100vh",
    position: "fixed",
    top: "0",
    left: "0",
    backgroundColor: "#343a40",
    color: "white",
    padding: "10px",
  };

  const headerStyle = {
    textAlign: "center",
    marginBottom: "20px",
  };

  const linkStyle = {
    color: "white",
    padding: "10px",
    display: "block",
    textDecoration: "none",
    borderRadius: "5px",
    transition: "background 0.3s", // Efek transisi halus
  };

  const activeLinkStyle = {
    backgroundColor: "#007bff", // Warna aktif (biru)
    fontWeight: "bold",
  };

  const menuItems = [
    { path: "/HomeManajer", label: "Dashboard" },
    { path: "/Kehadiran", label: "Kehadiran" },
    { path: "/Arsip", label: "Arsip Kehadiran" },
    { path: "/Penggajian", label: "Penggajian" },
    { path: "/Rekap", label: "Rekap Penggajian" },
    { path: "/Karyawan", label: "Data Karyawan" },
  ];

  return (
    <div style={sidebarStyle} className="d-none d-md-block">
      {/* Header Sidebar */}
      <div style={headerStyle}>
        <h2 style={{ fontSize: "24px", fontWeight: "bold" }}>SIMKAB</h2>
        <p style={{ fontSize: "12px" }}>SISTEM MANAJEMEN KARYAWAN</p>
      </div>

      {/* Navigasi */}
      <ul className="nav flex-column">
        {menuItems.map((item) => (
          <li className="nav-item" key={item.path}>
            <Link
              to={item.path}
              className="nav-link"
              style={{
                ...linkStyle,
                ...(location.pathname === item.path ? activeLinkStyle : {}),
              }}
            >
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default Sidebar;