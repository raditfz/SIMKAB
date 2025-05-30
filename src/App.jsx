import React, { useState, useEffect, lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import Sidebar from "./components/Sidebar.jsx";
import FooterBar from "./components/FooterBar.jsx";
import "bootstrap/dist/css/bootstrap.min.css";
import RequireAuth from "./auth/RequireAuth.jsx";

const LoginPage = lazy(() => import("./auth/LoginPage.jsx"));
const LoginPageKaryawan = lazy(() => import("./auth/LoginPageKaryawan.jsx"));
const HomeManajer = lazy(() => import("./manajer/ManajerDashboard..jsx"));
const HomeKaryawan = lazy(() => import("./karyawan/KaryawanDashboard.jsx"));
const Kehadiran = lazy(() => import("./manajer/ManajerKehadiran.jsx"));
const Penggajian = lazy(() => import("./manajer/ManajerPenggajian.jsx"));
const Karyawan = lazy(() => import("./manajer/ManajerKaryawan.jsx"));
const ResetPassword = lazy(() => import("./auth/ResetPassword.jsx"));
const JadwalKaryawan = lazy(() => import("./karyawan/KaryawanJadwal.jsx"));
const PenggajianKaryawan = lazy(() => import("./karyawan/KaryawanPenggajian.jsx"));
const ManajerArsipKehadiran = lazy(() => import("./manajer/ManajerArsipKehadiran.jsx"));
const ManajerArsipPenggajian = lazy(() => import("./manajer/ManajerArsipPenggajian.jsx"));
const KaryawanData = lazy(() => import("./manajer/ManajerKaryawanData.jsx"));

function Layout() {
  const location = useLocation();
  const [isMobile, setIsMobile] = useState(window.innerWidth < 720);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 720);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const hiddenPaths = ["/login", "/ResetPassword", "/HomeKaryawan", "/JadwalKaryawan", "/PenggajianKaryawan", "/LoginKaryawan"];
  const hideSidebar = isMobile || hiddenPaths.includes(location.pathname);
  const showFooterBar = isMobile && !hiddenPaths.includes(location.pathname);

  return (
    <div className="d-flex flex-column" style={{ minHeight: "100vh" }}>
      {!hideSidebar && <Sidebar />}
      <div
        className="content flex-grow-1"
        style={{
          marginLeft: hideSidebar ? "0" : "18%",
          padding: "0px",
          width: hideSidebar ? "100%" : "78%",
        }}
      >
        <Suspense fallback={<div className="text-center my-5">Memuat halaman...</div>}>
          <Routes>
            <Route path="/" element={<Navigate replace to="/HomeManajer" />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/loginKaryawan" element={<LoginPageKaryawan />} />
            <Route path="/ResetPassword" element={<ResetPassword />} />
            <Route path="/HomeManajer" element={<RequireAuth role="manajer"><HomeManajer /></RequireAuth>}/>
            <Route path="/Kehadiran" element={<RequireAuth role="manajer"><Kehadiran /></RequireAuth>} />
            <Route path="/Penggajian" element={<RequireAuth role="manajer"><Penggajian /></RequireAuth>} />
            <Route path="/Karyawan" element={<RequireAuth role="manajer"><Karyawan /></RequireAuth>} />
            <Route path="/Karyawan/:username" element={<RequireAuth role="manajer"><KaryawanData /></RequireAuth>} />
            <Route path="/Arsip" element={<RequireAuth role="manajer"><ManajerArsipKehadiran /></RequireAuth>} />
            <Route path="/Rekap" element={<RequireAuth role="manajer"><ManajerArsipPenggajian /></RequireAuth>} />
            <Route path="/HomeKaryawan" element={<HomeKaryawan />} />
            <Route path="/JadwalKaryawan" element={<JadwalKaryawan />} />
            <Route path="/PenggajianKaryawan" element={<PenggajianKaryawan />} />
          </Routes>
        </Suspense>
      </div>
      {showFooterBar && <FooterBar />}
      <style>{`
        @media print {
          .content {
            margin-left: 0 !important;
            width: 100% !important;
          }
        }
      `}</style>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Layout />
    </BrowserRouter>
  );
}

export default App;
