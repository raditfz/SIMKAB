import React, { useState } from "react";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../firebase";
import { Modal, Button, Form } from "react-bootstrap";

const PenggajianUbah = ({ show, payment, employeeId, onPaymentUpdated, onCancel }) => {
  const [form, setForm] = useState({
    tanggalMulai: payment.tanggalMulai || "",
    tanggalPembayaran: payment.tanggalPembayaran || "",
    gajiTotal: payment.gajiTotal || "",
    batalkan: false,
  });
  const [saving, setSaving] = useState(false);

  const handleChange = (e) => {
    const { name, value, checked } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: checked !== undefined ? checked : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    const paymentRef = doc(db, `dataKaryawan/${employeeId}/Penggajian/${payment.id}`);
    let statusPembayaran = payment.statusPembayaran;
    if (payment.statusPembayaran && form.batalkan) {
      statusPembayaran = false;
    }
    let updateData = {
      tanggalMulai: form.tanggalMulai,
      tanggalPembayaran: form.tanggalPembayaran,
      gajiTotal: Number(form.gajiTotal),
      statusPembayaran,
    };
    if (!statusPembayaran) {
      updateData = {
        ...updateData,
        potonganPerMenit: "",
        gajiTotal: "",
      };
    }
    await updateDoc(paymentRef, updateData);
    onPaymentUpdated(employeeId, { ...payment, ...updateData });
    setSaving(false);
  };

  return (
    <Modal show={show} onHide={onCancel} centered>
      <Modal.Header closeButton>
        <Modal.Title>Ubah Penggajian</Modal.Title>
      </Modal.Header>
      <Form onSubmit={handleSubmit}>
        <Modal.Body>
          <Form.Group className="mb-3">
            <Form.Label>Tanggal Mulai</Form.Label>
            <Form.Control
              type="date"
              name="tanggalMulai"
              value={form.tanggalMulai}
              onChange={handleChange}
              required
            />
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>Tanggal Pembayaran</Form.Label>
            <Form.Control
              type="date"
              name="tanggalPembayaran"
              value={form.tanggalPembayaran}
              onChange={handleChange}
              required
            />
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>Total Gaji</Form.Label>
            <Form.Control
              type="number"
              name="gajiTotal"
              value={form.gajiTotal}
              onChange={handleChange}
              disabled={!payment.statusPembayaran || form.batalkan}
              required={payment.statusPembayaran && !form.batalkan}
            />
          </Form.Group>
          <Form.Group className="mb-3" controlId="batalkan-histori">
            {payment.statusPembayaran && (
              <div className="d-flex align-items-center gap-3">
                <Form.Check
                  type="checkbox"
                  label={<span className="text-danger">Batalkan Histori Pembayaran? <strong>Ya</strong></span>}
                  name="batalkan"
                  checked={form.batalkan}
                  onChange={handleChange}
                  id="batalkan-histori"
                />
              </div>
            )}
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={onCancel} disabled={saving}>
            Batal
          </Button>
          <Button
            variant="primary"
            type="submit"
            disabled={saving}
          >
            {saving ? "Menyimpan..." : "Simpan Perubahan"}
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
};

export default PenggajianUbah;
