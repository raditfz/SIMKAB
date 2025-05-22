import React, { useState, useEffect } from "react";
import { db } from "../firebase";
import {
  doc,
  updateDoc,
  getDoc,
  collection,
  getDocs,
  setDoc,
  deleteDoc
} from "firebase/firestore";

const PenggajianBayar = ({ payment, employeeId, onPaymentProcessed, onCancel }) => {
  const [loading, setLoading] = useState(true);
  const [dataShow, setDataShow] = useState({
    totalWaktuTelat: 0,
    potonganPerMenit: 0,
    gajiTotalSementara: 0,
    nilaiKoreksi: 0,
    gajiTotal: 0
  });
  const [processingPayment, setProcessingPayment] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const employeeDoc = await getDoc(doc(db, "dataKaryawan", employeeId));
        const employeeData = employeeDoc.data();
        const baseGaji = employeeData.gajiKaryawan || 0;
        const nilaiKoreksi = payment.nilaiKoreksi || 0;

        const attendanceSnapshot = await getDocs(collection(db, `dataKaryawan/${employeeId}/Kehadiran`));
        const employeeAttendance = attendanceSnapshot.docs.filter(docSnap => {
          const docDate = docSnap.data().tanggalKerja;
          return docDate >= payment.tanggalMulai && docDate <= payment.tanggalPembayaran;
        });

        let totalLateMinutes = 0;
        for (const docSnap of employeeAttendance) {
          const attendance = docSnap.data();
          if (attendance.waktuTelat && typeof attendance.waktuTelat === 'number') {
            totalLateMinutes += attendance.waktuTelat;
          }
        }

        const potonganPerMenit = payment.potonganPerMenit || 0;
        const totalPotongan = totalLateMinutes * potonganPerMenit;
        const gajiTotalSementara = baseGaji - totalPotongan;
        const gajiTotal = gajiTotalSementara + nilaiKoreksi;

        setDataShow({
          totalWaktuTelat: totalLateMinutes,
          potonganPerMenit,
          gajiTotalSementara,
          nilaiKoreksi,
          gajiTotal
        });
        setLoading(false);
      } catch (e) {
        setLoading(false);
      }
    };
    fetchData();
  }, [employeeId, payment]);

  const formatDate = (dateString) => {
    if (!dateString) return "-";
    const date = new Date(dateString);
    return date.toLocaleDateString("id-ID");
  };

  const handleProcessPayment = async (e) => {
    e.preventDefault();
    setProcessingPayment(true);
    try {
      const attendanceSnapshot = await getDocs(collection(db, `dataKaryawan/${employeeId}/Kehadiran`));
      const employeeAttendance = attendanceSnapshot.docs.filter(docSnap => {
        const docDate = docSnap.data().tanggalKerja;
        return docDate >= payment.tanggalMulai && docDate <= payment.tanggalPembayaran;
      });
      for (const docSnap of employeeAttendance) {
        const attendance = docSnap.data();
        const docId = docSnap.id;
        const arsipRef = doc(db, `dataKaryawan/${employeeId}/arsipKehadiran/${docId}`);
        await setDoc(arsipRef, attendance);
        const originalRef = doc(db, `dataKaryawan/${employeeId}/Kehadiran/${docId}`);
        await deleteDoc(originalRef);
      }
      const paymentDocRef = doc(db, `dataKaryawan/${employeeId}/Penggajian/${payment.id}`);
      await updateDoc(paymentDocRef, {
        statusPembayaran: true
      });
      const updatedPayment = { ...payment, statusPembayaran: true };
      onPaymentProcessed(employeeId, updatedPayment);
      alert("Pembayaran gaji berhasil diproses dan data kehadiran diarsipkan!");
    } catch (error) {
      alert("Gagal memproses pembayaran. Silakan coba lagi.");
    } finally {
      setProcessingPayment(false);
    }
  };

  return (
    <div className="modal fade show d-block" tabIndex="-1" role="dialog" style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}>
      <div className="modal-dialog modal-dialog-centered" role="document">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">Verifikasi Pembayaran Gaji</h5>
            <button type="button" className="btn-close" aria-label="Close" onClick={onCancel}></button>
          </div>
          <div className="modal-body">
            <p>
              Periode: {formatDate(payment.tanggalMulai)} - {formatDate(payment.tanggalPembayaran)}
            </p>
            {loading ? (
              <div>Memuat data...</div>
            ) : (
              <div className="mb-2">
                <div>Total Waktu Telat: <strong>{dataShow.totalWaktuTelat} menit</strong></div>
                <div>Potongan per Menit: <strong>Rp {dataShow.potonganPerMenit}</strong></div>
                <div>Gaji Total Sementara: <strong>Rp {dataShow.gajiTotalSementara}</strong></div>
                <div>Nilai Koreksi: <strong>Rp {dataShow.nilaiKoreksi}</strong></div>
                <div>Gaji Total: <strong>Rp {dataShow.gajiTotal}</strong></div>
              </div>
            )}
            <div className="d-flex justify-content-end gap-2 mt-3">
              <button type="button" className="btn btn-secondary" onClick={onCancel}>
                Batal
              </button>
              <button
                type="button"
                className="btn btn-success"
                onClick={handleProcessPayment}
                disabled={processingPayment || loading}
              >
                {processingPayment ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                    Memproses...
                  </>
                ) : (
                  "Proses"
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PenggajianBayar;