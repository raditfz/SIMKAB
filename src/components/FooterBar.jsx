import React from "react";
import { NavLink, useLocation } from "react-router-dom";
import iconHome from "/src/assets/icon-home.png";
import iconDate from "/src/assets/icon-date.png";
import iconGaji from "/src/assets/icon-gaji.png";
import iconUser from "/src/assets/icon-user.png";
import iconData from "/src/assets/icon-data.png";

function FooterBar() {
  const location = useLocation();
  const hiddenPaths = ["/login", "/ResetPassword"];

  if (hiddenPaths.includes(location.pathname)) {
    return null; // Sembunyikan FooterBar di halaman tertentu
  }

  const footerStyle = {
    position: "fixed",
    bottom: 0,
    left: 0,
    width: "100%",
    backgroundColor: "white",
    borderTop: "1px solid #ddd",
    display: "flex",
    justifyContent: "space-around",
    padding: "8px 0",
    boxShadow: "0 -2px 5px rgba(0, 0, 0, 0.1)",
    fontSize: "14px",
    zIndex: 999,
  };

  const navItemStyle = {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    textDecoration: "none",
    color: "black",
    fontSize: "14px",
  };

  const iconStyle = {
    width: "24px",
    height: "24px",
    marginBottom: "4px",
  };

  const activeStyle = {
    color: "blue", // Gaya saat aktif
    fontWeight: "bold",
  };

    const activeFilter = "brightness(0) saturate(100%) invert(39%) sepia(83%) saturate(600%) hue-rotate(170deg)";

  return (
    <div style={footerStyle}>
      {[
        { to: "/HomeManajer", icon: iconHome, label: "HOME" },
        { to: "/Kehadiran", icon: iconDate, label: "JADWAL" },
        { to: "/Arsip", icon: iconData, label: "ARSIP" },
        { to: "/Penggajian", icon: iconGaji, label: "GAJI" },
        { to: "/Karyawan", icon: iconUser, label: "KARYAWAN" },
      ].map(({ to, icon, label }) => (
        <NavLink
          key={to}
          to={to}
          style={({ isActive }) => ({
            ...navItemStyle,
            color: isActive ? "blue" : "black",
            fontWeight: isActive ? "bold" : "normal",
          })}
        >
          {/** tambahkan filter hanya kalau aktif */}
          <img
            src={icon}
            alt={label}
            style={{
              ...iconStyle,
              filter: ({ isActive }) => (isActive ? activeFilter : "none"),
            }}
          />
          <div>{label}</div>
        </NavLink>
      ))}
    </div>
  );
}

export default FooterBar;