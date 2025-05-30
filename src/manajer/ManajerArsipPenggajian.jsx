import React, { useEffect, useState, useRef } from "react";
import { db, auth } from "../firebase";
import { collection, getDocs } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import { onAuthStateChanged } from "firebase/auth";
import dayjs from "dayjs";
import "dayjs/locale/id";

dayjs.locale("id");

const ManajerArsipPenggajian = () => {
  const today = dayjs();
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState("ALL");
  const [selectedYear, setSelectedYear] = useState(today.format("YYYY"));
  const [arsipList, setArsipList] = useState([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const printRef = useRef();

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (!user) navigate("/login");
      else setLoadingAuth(false);
    });
    return () => unsub();
  }, [navigate]);

  useEffect(() => {
    fetchArsipByPeriod(selectedMonth, selectedYear);
  }, [selectedMonth, selectedYear]);

  const fetchArsipByPeriod = async (bulan, tahun) => {
    setLoading(true);
    try {
      const empSnap = await getDocs(collection(db, "dataKaryawan"));
      const empList = empSnap.docs.map(doc => ({
        id: doc.id,
        namaKaryawan: doc.data().namaKaryawan
      }));

      const allGaji = await Promise.all(
        empList.map(async (emp) => {
          const gajiSnap = await getDocs(collection(db, "dataKaryawan", emp.id, "Penggajian"));
          return gajiSnap.docs
            .map(pDoc => {
              const p = pDoc.data();
              const periodeBulan = p.tanggalMulai ? String(p.tanggalMulai).slice(5, 7) : "";
              const periodeTahun = p.tanggalMulai ? String(p.tanggalMulai).slice(0, 4) : "";
              const cocokTahun = periodeTahun === tahun;
              const cocokBulan = bulan === "ALL" || periodeBulan === bulan;
              if (cocokTahun && cocokBulan) {
                return { ...p, id: pDoc.id, karyawanId: emp.id, namaKaryawan: emp.namaKaryawan };
              }
              return null;
            })
            .filter(Boolean);
        })
      );

      const list = allGaji.flat();
      list.sort((a, b) => a.namaKaryawan.localeCompare(b.namaKaryawan) || ((a.tanggalPembayaran || "").localeCompare(b.tanggalPembayaran || "")));
      setArsipList(list);
    } catch {}
    setLoading(false);
  };

  const months = [{ value: "ALL", label: "Semua Bulan" }, ...Array.from({ length: 12 }, (_, i) => ({
    value: String(i + 1).padStart(2, "0"),
    label: dayjs().month(i).format("MMMM"),
  }))];

  const years = Array.from({ length: 6 }, (_, i) => {
    const year = String(today.year() - 4 + i);
    return { value: year, label: year };
  });

  const totalGajiFix = arshipList =>
    arshipList.reduce((sum, item) => sum + (item.gajiTotal ? Number(item.gajiTotal) : 0), 0);

  const formatTotalJamKerja = (totalJamKerja) => {
    if (!totalJamKerja || isNaN(totalJamKerja)) return "-";
    const jam = Math.floor(totalJamKerja / 60);
    const menit = totalJamKerja % 60;
    return `${jam}j ${menit}m (${totalJamKerja}m)`;
  };

  const handlePrint = () => {
    const originalTitle = document.title;
    document.title = "Arsip Penggajian Karyawan";
    window.print();
    setTimeout(() => {
      document.title = originalTitle;
    }, 500);
  };

  if (loadingAuth) return (
    <div className="container mt-5 text-center">
      <div className="spinner-border text-primary" role="status">
        <span className="visually-hidden">Loading...</span>
      </div>
      <p className="mt-2">Memuat halaman...</p>
    </div>
  );

  return (
    <div className="container my-4 mb-5 py-4 bg-white" style={{ maxWidth: 1280 }}>
      <h3 className="text-center mb-4 fw-bold mt-2">ARSIP PENGGAJIAN KARYAWAN</h3>
      <div className="d-flex flex-column align-items-center mb-4">
        <button
          className="btn btn-primary mb-3 px-3 py-1"
          onClick={() => navigate("/Penggajian")}
          style={{ fontSize: "1rem", fontWeight: "bold", width: 180 }}
        >
          &lt; Penggajian
        </button>
        <div className="d-flex gap-2 align-items-center flex-wrap">
          <select
            className="form-select"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            style={{ width: 150 }}
          >
            {months.map(m => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>
          <select
            className="form-select"
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            style={{ width: 110 }}
          >
            {years.map(y => (
              <option key={y.value} value={y.value}>{y.label}</option>
            ))}
          </select>
          <button
            className="btn btn-outline-secondary"
            style={{ fontWeight: 500 }}
            onClick={handlePrint}
            id="btn-print"
          >
            <i className="bi bi-printer" style={{ fontSize: 18, marginRight: 5 }}></i> Print PDF
          </button>
        </div>
      </div>
      <div style={{ minHeight: 320 }}>
        {loading ? (
          <div className="text-center my-5">
            <div className="spinner-border" role="status" style={{ width: "2.5rem", height: "2.5rem" }}>
              <span className="visually-hidden">Loading...</span>
            </div>
            <p className="text-muted mt-3">Mengambil data penggajian...</p>
          </div>
        ) : (
          <>
            {arsipList.length === 0 ? (
              <p className="text-muted text-center">Belum ada data penggajian pada periode ini.</p>
            ) : (
              <div ref={printRef}>
                <div style={{ overflowX: "auto" }}>
                  <table className="table table-bordered table-hover align-middle gaji-print-table" style={{ minWidth: 1150, fontSize: "15px" }}>
                    <thead className="table-dark text-center">
                      <tr>
                        <th style={{ width: 190 }}>NAMA KARYAWAN</th>
                        <th style={{ width: 110 }}>PERIODE</th>
                        <th style={{ width: 110 }}>JAM KERJA</th>
                        <th style={{ width: 80 }}>TELAT</th>
                        <th style={{ width: 110 }}>POTONGAN</th>
                        <th style={{ width: 140 }}>GAJI TERHITUNG</th>
                        <th style={{ width: 100 }}>KOREKSI</th>
                        <th style={{ width: 120 }}>GAJI FIX</th>
                        <th style={{ width: 90 }}>STATUS</th>
                      </tr>
                    </thead>
                    <tbody>
                      {arsipList.map((item) => (
                        <tr key={item.karyawanId + "-" + item.id}>
                          <td>{item.namaKaryawan}</td>
                          <td style={{ whiteSpace: "nowrap" }}>
                            {item.tanggalMulai ? `${item.tanggalMulai} - ${item.tanggalPembayaran}` : "-"}
                          </td>
                          <td>{formatTotalJamKerja(item.totalJamKerja)}</td>
                          <td>{item.totalWaktuTelat ? `${item.totalWaktuTelat} menit` : "-"}</td>
                          <td>
                            {item.potonganPerMenit ? `Rp ${item.potonganPerMenit.toLocaleString("id-ID")}` : "-"}
                          </td>
                          <td>
                            {item.gajiTotalSementara ? `Rp ${Number(item.gajiTotalSementara).toLocaleString("id-ID")}` : "-"}
                          </td>
                          <td>{item.nilaiKoreksi ? `Rp ${item.nilaiKoreksi.toLocaleString("id-ID")}` : "-"}</td>
                          <td>{item.gajiTotal ? `Rp ${Number(item.gajiTotal).toLocaleString("id-ID")}` : "-"}</td>
                          <td className="text-center">
                            <span className={`badge ${item.statusPembayaran ? "bg-success" : "bg-warning text-dark"}`}>
                              {item.statusPembayaran ? "DIBAYAR" : "BELUM"}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div
                  className="d-flex justify-content-end mt-4"
                  style={{ printColorAdjust: "exact" }}
                >
                  <div
                    className="card shadow-sm"
                    style={{
                      minWidth: 320,
                      maxWidth: 440,
                      background: "#f8fafc",
                      borderRadius: 18,
                      border: "1px solid #e2e8f0"
                    }}
                  >
                    <div className="card-body d-flex flex-column align-items-end py-3 px-4">
                      <div style={{ fontWeight: 500, fontSize: 17, color: "#475569" }}>
                        Jumlah Total Gaji Fix
                      </div>
                      <div
                        style={{
                          fontWeight: 700,
                          fontSize: 23,
                          color: "#2563eb",
                          marginTop: 2,
                          letterSpacing: 1
                        }}
                      >
                        Rp {totalGajiFix(arsipList).toLocaleString("id-ID")}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
      <style>{`
        @media print {
          @page {
            size: A4 landscape;
            margin: 10mm 8mm;
          }
          .container {
            margin-left: 0 !important;
            margin-right: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
          }
          .gaji-print-table {
            font-size: 11px !important;
            min-width: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
            table-layout: fixed !important;
          }
          .gaji-print-table th,
          .gaji-print-table td {
            padding: 3px 6px !important;
            font-size: 11px !important;
            vertical-align: middle !important;
            word-break: break-word !important;
            max-width: 120px !important;
            overflow: hidden !important;
            text-overflow: ellipsis !important;
          }
        }
      `}</style>
    </div>
  );
};

export default ManajerArsipPenggajian;
