import React, { useEffect, useState, useCallback } from "react";
import { db, auth } from "../firebase";
import { collection, getDocs, doc, updateDoc, deleteDoc, query, where } from "firebase/firestore";
import { useNavigate } from 'react-router-dom';
import { onAuthStateChanged } from "firebase/auth";
import PenggajianTambah from "../modal/PenggajianTambah";
import PenggajianBayar from "../modal/PenggajianBayar";
import PenggajianUbah from "../utils/PenggajianUbah";
import 'bootstrap/dist/css/bootstrap.min.css';

const ManajerPenggajian = () => {
  const [employees, setEmployees] = useState([]);
  const [paymentHistory, setPaymentHistory] = useState({});
  const [expandedEmployee, setExpandedEmployee] = useState(null);
  const [modalState, setModalState] = useState({ type: null, employeeId: null, payment: null });
  const [loading, setLoading] = useState(true);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [editingPotongan, setEditingPotongan] = useState({});
  const [editingKoreksi, setEditingKoreksi] = useState({});
  const [inputPotongan, setInputPotongan] = useState({});
  const [inputKoreksi, setInputKoreksi] = useState({});
  const [deletingPayment, setDeletingPayment] = useState({});

  const navigate = useNavigate();

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (!user) {
        navigate('/login');
        return;
      }
      setLoadingAuth(false);
    });
    fetchData();
    return () => unsub();
  }, [navigate]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const employeeSnapshot = await getDocs(collection(db, "dataKaryawan"));
      const employeeData = employeeSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setEmployees(employeeData);

      const paymentResults = await Promise.all(
        employeeData.map(async (employee) => {
          const paymentsSnapshot = await getDocs(collection(db, `dataKaryawan/${employee.id}/Penggajian`));
          const employeePayments = paymentsSnapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data()
          }));
          return [employee.id, employeePayments];
        })
      );
      setPaymentHistory(Object.fromEntries(paymentResults));
    } catch (error) {
    } finally {
      setLoading(false);
    }
  };

  const toggleExpand = useCallback((employeeId) => {
    setExpandedEmployee(prev => prev === employeeId ? null : employeeId);
    setModalState({ type: null, employeeId: null, payment: null });
  }, []);

  const handleShowAdd = useCallback((employeeId, e) => {
    e.stopPropagation();
    setModalState({ type: "add", employeeId, payment: null });
  }, []);

  const handleShowVerification = useCallback((employeeId, payment, e) => {
    e.stopPropagation();
    setModalState({ type: "pay", employeeId, payment });
  }, []);

  const handleShowEdit = useCallback((employeeId, payment, e) => {
    e.stopPropagation();
    setModalState({ type: "edit", employeeId, payment });
  }, []);

  const handlePaymentAdded = useCallback((employeeId, newPayment) => {
    setPaymentHistory(prev => ({
      ...prev,
      [employeeId]: [...(prev[employeeId] || []), newPayment]
    }));
    setModalState({ type: null, employeeId: null, payment: null });
  }, []);

  const handlePaymentProcessed = useCallback((employeeId, updatedPayment) => {
    setPaymentHistory(prev => {
      const updated = { ...prev };
      const payments = [...(updated[employeeId] || [])];
      const idx = payments.findIndex(p => p.id === updatedPayment.id);
      if (idx >= 0) payments[idx] = updatedPayment;
      updated[employeeId] = payments;
      return updated;
    });
    setModalState({ type: null, employeeId: null, payment: null });
  }, []);

  const handlePaymentUpdated = useCallback((employeeId, updatedPayment) => {
    setPaymentHistory(prev => {
      const updated = { ...prev };
      const payments = [...(updated[employeeId] || [])];
      const idx = payments.findIndex(p => p.id === updatedPayment.id);
      if (idx >= 0) payments[idx] = updatedPayment;
      updated[employeeId] = payments;
      return updated;
    });
    setModalState({ type: null, employeeId: null, payment: null });
  }, []);

  const formatDate = (dateString) => {
    if (!dateString) return "-";
    const date = new Date(dateString);
    return date.toLocaleDateString("id-ID");
  };

  const hitungTelatDanTerhitung = async (employeeId, payment, potonganPerMenit, nilaiKoreksi = 0) => {
    try {
      const attendanceSnapshot = await getDocs(collection(db, `dataKaryawan/${employeeId}/Kehadiran`));
      const employeeAttendance = attendanceSnapshot.docs.filter(docSnap => {
        const data = docSnap.data();
        return data.tanggalKerja >= payment.tanggalMulai && data.tanggalKerja <= payment.tanggalPembayaran;
      });

      let totalLateMinutes = 0;
      for (const docSnap of employeeAttendance) {
        const attendance = docSnap.data();
        if (attendance.waktuTelat && typeof attendance.waktuTelat === 'number') {
          totalLateMinutes += attendance.waktuTelat;
        }
      }

      const employee = employees.find(emp => emp.id === employeeId);
      const gajiAwal = employee?.gajiKaryawan || 0;
      const totalPotongan = potonganPerMenit * totalLateMinutes;
      const gajiTotalSementara = gajiAwal - totalPotongan;
      const gajiTotal = gajiTotalSementara + nilaiKoreksi;

      await updateDoc(doc(db, `dataKaryawan/${employeeId}/Penggajian/${payment.id}`), {
        totalWaktuTelat: totalLateMinutes,
        potonganPerMenit: potonganPerMenit,
        gajiTotalSementara,
        gajiTotal,
        nilaiKoreksi
      });

      return { totalLateMinutes, gajiTotalSementara, gajiTotal };
    } catch (e) {
      alert("Gagal menghitung telat dan terhitung");
      return null;
    }
  };

  const handleEditPotongan = (payment, v) => {
    setEditingPotongan(prev => ({ ...prev, [payment.id]: v }));
    setInputPotongan(prev => ({ ...prev, [payment.id]: payment.potonganPerMenit || "" }));
  };

  const savePotongan = async (employeeId, payment) => {
    const val = Number(inputPotongan[payment.id]);
    if (isNaN(val) || val <= 0) return alert("Masukkan angka yang valid");
    try {
      const koreksiVal = payment.nilaiKoreksi != null ? Number(payment.nilaiKoreksi) : 0;
      await hitungTelatDanTerhitung(employeeId, payment, val, koreksiVal);
      setEditingPotongan(prev => ({ ...prev, [payment.id]: false }));
      fetchData();
    } catch {
      alert("Gagal update potongan!");
    }
  };

  const handleEditKoreksi = (payment, v) => {
    setEditingKoreksi(prev => ({ ...prev, [payment.id]: v }));
    setInputKoreksi(prev => ({ ...prev, [payment.id]: payment.nilaiKoreksi || "" }));
  };

  const saveKoreksi = async (employeeId, payment) => {
    const val = Number(inputKoreksi[payment.id]);
    if (isNaN(val)) return alert("Masukkan angka yang valid");
    try {
      const potonganPerMenit = payment.potonganPerMenit || 0;
      await hitungTelatDanTerhitung(employeeId, payment, potonganPerMenit, val);
      setEditingKoreksi(prev => ({ ...prev, [payment.id]: false }));
      fetchData();
    } catch {
      alert("Gagal update koreksi!");
    }
  };

  const handleDeletePayment = async (employeeId, paymentId) => {
    if (!window.confirm("Yakin ingin menghapus data penggajian ini?")) return;
    setDeletingPayment(prev => ({ ...prev, [paymentId]: true }));
    try {
      await deleteDoc(doc(db, `dataKaryawan/${employeeId}/Penggajian/${paymentId}`));
      fetchData();
    } catch (e) {
      alert("Gagal menghapus data!");
    } finally {
      setDeletingPayment(prev => ({ ...prev, [paymentId]: false }));
    }
  };

  if (loadingAuth || loading) {
    return (
      <div className="container py-4 text-center">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-4">
      <h3 className="text-center mb-4 fw-bold">PENGGAJIAN KARYAWAN</h3>
      <div className="row g-3">
        {employees.map((employee) => (
          <React.Fragment key={employee.id}>
            <div className={`border rounded p-3 mb-1 ${expandedEmployee === employee.id ? "bg-light" : ""}`} style={{ cursor: "pointer" }} onClick={() => toggleExpand(employee.id)}>
              <div className="d-flex justify-content-between align-items-center flex-wrap gap-2">
                <div>
                  <div className="fw-bold text-uppercase">{employee.namaKaryawan}</div>
                  <div className="text-muted small">
                    Rp. {employee.gajiKaryawan?.toLocaleString("id-ID") || "Belum Ditentukan"}
                  </div>
                </div>
                <i className={`bi bi-chevron-${expandedEmployee === employee.id ? 'up' : 'down'} fs-4`}></i>
              </div>
            </div>
            {expandedEmployee === employee.id && (
              <div className="mb-4">
                <div className="card shadow-sm p-2 mb-2" style={{ border: "1px solid #e6e6e6" }}>
                  <div className="table-responsive">
                    <table className="table table-sm align-middle mb-0">
                      <thead className="table-light">
                        <tr>
                          <th style={{ minWidth: 60 }}>PERIODE</th>
                          <th style={{ minWidth: 40 }}>TELAT</th>
                          <th style={{ minWidth: 70 }}>POTONGAN</th>
                          <th style={{ minWidth: 90 }}>TERHITUNG</th>
                          <th style={{ minWidth: 68 }}>KOREKSI</th>
                          <th style={{ minWidth: 95 }}>GAJI FINAL</th>
                          <th style={{ minWidth: 50 }}>STATUS</th>
                          <th style={{ minWidth: 68 }}>AKSI</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(paymentHistory[employee.id] || []).map((payment) => {
                          const potonganPerMenit = payment.potonganPerMenit || 0;
                          const totalWaktuTelat = payment.totalWaktuTelat || 0;
                          const gajiAwal = employee.gajiKaryawan || 0;
                          const totalPotongan = potonganPerMenit * totalWaktuTelat;
                          const gajiTotalSementara = gajiAwal - totalPotongan;
                          return (
                            <tr key={payment.id}>
                              <td className="text-nowrap">{formatDate(payment.tanggalMulai)} - {formatDate(payment.tanggalPembayaran)}</td>
                              <td>{totalWaktuTelat}</td>
                              <td>
                                {payment.statusPembayaran
                                  ? <span>{payment.potonganPerMenit ?? "-"}</span>
                                  : editingPotongan[payment.id] ? (
                                    <>
                                      <input type="number" className="form-control form-control-sm d-inline w-auto"
                                        value={inputPotongan[payment.id]}
                                        onChange={e => setInputPotongan(prev => ({ ...prev, [payment.id]: e.target.value }))}
                                        style={{ width: 38 }}
                                        onClick={e => e.stopPropagation()}
                                      />
                                      <button className="btn btn-sm btn-success ms-1" onClick={(e) => { e.stopPropagation(); savePotongan(employee.id, payment); }}>✓</button>
                                      <button className="btn btn-sm btn-secondary ms-1" onClick={(e) => { e.stopPropagation(); setEditingPotongan(prev => ({ ...prev, [payment.id]: false })); }}>✗</button>
                                    </>
                                  ) : (
                                    <span style={{ display: "flex", alignItems: "center" }}>
                                      {payment.potonganPerMenit ?? "-"}
                                      {!payment.statusPembayaran && (
                                        <button className="btn btn-sm btn-link text-primary ms-2" onClick={(e) => { e.stopPropagation(); handleEditPotongan(payment, true); }}>
                                          +
                                        </button>
                                      )}
                                    </span>
                                  )}
                              </td>
                              <td>
                                <span className="ms-2">
                                  Rp. {gajiTotalSementara != null ? gajiTotalSementara.toLocaleString("id-ID") : "-"}
                                </span>
                              </td>
                              <td>
                                {payment.statusPembayaran
                                  ? <span>{payment.nilaiKoreksi ?? "-"}</span>
                                  : editingKoreksi[payment.id] ? (
                                    <>
                                      <input type="number" className="form-control form-control-sm d-inline w-auto"
                                        value={inputKoreksi[payment.id]}
                                        onChange={e => setInputKoreksi(prev => ({ ...prev, [payment.id]: e.target.value }))}
                                        style={{ width: 38 }}
                                        onClick={e => e.stopPropagation()}
                                      />
                                      <button className="btn btn-sm btn-success ms-1" onClick={(e) => { e.stopPropagation(); saveKoreksi(employee.id, payment); }}>✓</button>
                                      <button className="btn btn-sm btn-secondary ms-1" onClick={(e) => { e.stopPropagation(); setEditingKoreksi(prev => ({ ...prev, [payment.id]: false })); }}>✗</button>
                                    </>
                                  ) : (
                                    <span style={{ display: "flex", alignItems: "center" }}>
                                      {payment.nilaiKoreksi ?? "-"}
                                      {!payment.statusPembayaran && (
                                        <button className="btn btn-sm btn-link text-primary ms-2" onClick={(e) => { e.stopPropagation(); handleEditKoreksi(payment, true); }}>
                                          +
                                        </button>
                                      )}
                                    </span>
                                  )}
                              </td>
                              <td className="text-nowrap">
                                Rp. {payment.gajiTotal != null ? payment.gajiTotal.toLocaleString("id-ID") : "-"}
                              </td>
                              <td>
                                <span className={`badge ${payment.statusPembayaran ? 'bg-success' : 'bg-warning text-dark'}`}>
                                  {payment.statusPembayaran ? 'DIBAYAR' : 'BELUM'}
                                </span>
                              </td>
                              <td>
                                <div className="d-flex flex-column flex-md-row gap-1">
                                  {!payment.statusPembayaran && (
                                    <>
                                      <button
                                        className="btn btn-sm btn-outline-dark"
                                        style={{ minWidth: 44 }}
                                        onClick={(e) => { e.stopPropagation(); handleShowVerification(employee.id, payment, e); }}
                                      >
                                        Bayar
                                      </button>
                                      <button
                                        className="btn btn-sm btn-outline-danger"
                                        style={{ minWidth: 44 }}
                                        disabled={deletingPayment[payment.id]}
                                        onClick={(e) => { e.stopPropagation(); handleDeletePayment(employee.id, payment.id); }}
                                      >
                                        {deletingPayment[payment.id] ? '...' : 'Hapus'}
                                      </button>
                                    </>
                                  )}
                                  {payment.statusPembayaran && (
                                    <button
                                      className="btn btn-sm btn-outline-secondary"
                                      style={{ minWidth: 44 }}
                                      onClick={(e) => { e.stopPropagation(); handleShowEdit(employee.id, payment, e); }}
                                    >
                                      Ubah
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  <div className="d-flex justify-content-end mt-3">
                    <button
                      className="btn btn-outline-primary"
                      style={{ width: "12%" }}
                      onClick={(e) => { e.stopPropagation(); handleShowAdd(employee.id, e); }}
                    >
                      + Tambah
                    </button>
                  </div>
                </div>
                {modalState.type === "add" && modalState.employeeId === employee.id && (
                  <PenggajianTambah
                    employeeId={modalState.employeeId}
                    onPaymentAdded={handlePaymentAdded}
                    onCancel={() => setModalState({ type: null, employeeId: null, payment: null })}
                  />
                )}
                {modalState.type === "pay" && modalState.employeeId === employee.id && modalState.payment && (
                  <PenggajianBayar
                    payment={modalState.payment}
                    employeeId={modalState.employeeId}
                    onPaymentProcessed={handlePaymentProcessed}
                    onCancel={() => setModalState({ type: null, employeeId: null, payment: null })}
                  />
                )}
                {modalState.type === "edit" && modalState.employeeId === employee.id && modalState.payment && (
                  <PenggajianUbah
                    show={true}
                    payment={modalState.payment}
                    employeeId={modalState.employeeId}
                    onPaymentUpdated={handlePaymentUpdated}
                    onCancel={() => setModalState({ type: null, employeeId: null, payment: null })}
                  />
                )}
              </div>
            )}
          </React.Fragment>
        ))}
      </div>
      <style>{`
        @media (max-width: 600px) {
          .table th, .table td {
            font-size: 12px !important;
            padding: 0.45rem 0.3rem !important;
          }
          .table thead th {
            font-size: 13px !important;
          }
          .table-responsive {
            border-radius: 0.5rem;
          }
          .fw-bold, .fw-semibold {
            font-size: 15px !important;
          }
          .btn-sm {
            font-size: 12px !important;
            padding: 0.24rem 0.5rem !important;
          }
        }
      `}</style>
    </div>
  );
};

export default ManajerPenggajian;
