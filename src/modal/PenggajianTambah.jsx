import React, { useState } from "react";
import { db } from "../firebase";
import { collection, doc, setDoc } from "firebase/firestore";

const PenggajianTambah = ({ employeeId, onPaymentAdded, onCancel }) => {
  const [formData, setFormData] = useState({
    tanggalMulai: "",
    tanggalPembayaran: ""
  });
  const [submitting, setSubmitting] = useState(false);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };

  const handleAddPayment = async (e) => {
    e.preventDefault();

    if (!formData.tanggalMulai || !formData.tanggalPembayaran) {
      alert("Silakan isi semua field yang diperlukan");
      return;
    }

    setSubmitting(true);
    try {
      const customId = `${formData.tanggalMulai}_${formData.tanggalPembayaran}`;

      const newPayment = {
        karyawanID: employeeId,
        tanggalMulai: formData.tanggalMulai,
        tanggalPembayaran: formData.tanggalPembayaran,
        gajiTotal: 0,
        statusPembayaran: false
      };

      const docRef = doc(db, `dataKaryawan/${employeeId}/Penggajian`, customId);
      await setDoc(docRef, newPayment);

      const updatedPayment = {
        id: customId,
        ...newPayment
      };

      onPaymentAdded(employeeId, updatedPayment);
    } catch (error) {
      console.error("Error adding payment:", error);
      alert("Gagal menambahkan riwayat penggajian. Silakan coba lagi.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={styles.backdrop}>
      <div style={styles.modal}>
        <h5 className="mb-3">Tambah Penggajian Baru</h5>
        <form onSubmit={handleAddPayment}>
          <div className="mb-3">
            <label className="form-label">Tanggal Mulai</label>
            <input
              type="date"
              className="form-control"
              name="tanggalMulai"
              value={formData.tanggalMulai}
              onChange={handleInputChange}
              required
            />
          </div>
          <div className="mb-3">
            <label className="form-label">Tanggal Pembayaran</label>
            <input
              type="date"
              className="form-control"
              name="tanggalPembayaran"
              value={formData.tanggalPembayaran}
              onChange={handleInputChange}
              required
            />
          </div>
          <div className="d-flex justify-content-end gap-2 mt-4">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onCancel}
            >
              Batal
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={submitting}
            >
              {submitting ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                  Menyimpan...
                </>
              ) : (
                "Simpan"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const styles = {
  backdrop: {
    position: "fixed",
    top: 0,
    left: 0,
    zIndex: 1050,
    width: "100vw",
    height: "100vh",
    background: "rgba(0, 0, 0, 0.5)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "1rem"
  },
  modal: {
    background: "#fff",
    borderRadius: "8px",
    padding: "1.5rem",
    maxWidth: "500px",
    width: "100%",
    boxShadow: "0 0 20px rgba(0, 0, 0, 0.2)"
  }
};

export default PenggajianTambah;
