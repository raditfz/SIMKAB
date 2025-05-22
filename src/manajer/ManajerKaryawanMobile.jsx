import React, { useEffect, useState, useCallback } from "react";
import { db, storage } from "../firebase.js";
import { collection, query, where, getDocs, deleteDoc, doc } from "firebase/firestore";
import { ref, listAll, deleteObject } from "firebase/storage";
import 'bootstrap/dist/css/bootstrap.min.css';
import defaultProfile from "../assets/icon-profil.jpg";
import KaryawanEdit from "../modal/KaryawanEdit.jsx";
import KaryawanTambah from "../modal/KaryawanTambah.jsx";
import KaryawanFace from "../modal/KaryawanFace.jsx";
import { Modal } from "react-bootstrap";

const ManajerKaryawanMobile = () => {
  const [isTambahModalOpen, setIsTambahModalOpen] = useState(false);
  const [employees, setEmployees] = useState([]);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [formData, setFormData] = useState({});
  const [formattedSalary, setFormattedSalary] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isFaceModalOpen, setIsFaceModalOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [showModalHapus, setShowModalHapus] = useState(false);
  const [selectedKaryawanHapus, setSelectedKaryawanHapus] = useState(null);

  const fetchEmployees = useCallback(async () => {
    const data = await getDocs(collection(db, "dataKaryawan"));
    setEmployees(data.docs.map((doc) => ({ ...doc.data(), id: doc.id })));
  }, []);

  const handleEditEmployee = (employee) => {
    setEditingEmployee(employee);
    setFormData({
      namaKaryawan: employee.namaKaryawan || '',
      posisiKaryawan: employee.posisiKaryawan || '',
      gajiKaryawan: employee.gajiKaryawan || '',
      fotoKaryawan: employee.fotoKaryawan || '',
      alamat: employee.alamat || '',
      fotoKTP: employee.fotoKTP || '',
      email: employee.email || '',
    });
    setFormattedSalary(formatNumber(employee.gajiKaryawan ? employee.gajiKaryawan.toString() : ""));
    setIsEditModalOpen(true);
  };

  const handleAturFoto = (employee) => {
    setSelectedEmployee(employee);
    setIsFaceModalOpen(true);
  };

  const handleDeleteEmployee = async () => {
    if (selectedKaryawanHapus && selectedKaryawanHapus.username) {
      const username = selectedKaryawanHapus.username;
      try {
        const dataQuery = query(collection(db, "dataKaryawan"), where("username", "==", username));
        const dataSnap = await getDocs(dataQuery);
        for (const docSnap of dataSnap.docs) {
          const docId = docSnap.id;
          const kehadiranRef = collection(db, `dataKaryawan/${docId}/Kehadiran`);
          const kehadiranSnap = await getDocs(kehadiranRef);
          for (const d of kehadiranSnap.docs) await deleteDoc(d.ref);
          const penggajianRef = collection(db, `dataKaryawan/${docId}/Penggajian`);
          const penggajianSnap = await getDocs(penggajianRef);
          for (const d of penggajianSnap.docs) await deleteDoc(d.ref);
          await deleteDoc(doc(db, "dataKaryawan", docId));
        }
        const akunQuery = query(collection(db, "akunKaryawan"), where("username", "==", username));
        const akunSnap = await getDocs(akunQuery);
        for (const docSnap of akunSnap.docs) await deleteDoc(doc(db, "akunKaryawan", docSnap.id));
        const folderRef = ref(storage, `Karyawan/${username}/`);
        const fileList = await listAll(folderRef);
        for (const itemRef of fileList.items) await deleteObject(itemRef);
        await fetchEmployees();
        setShowModalHapus(false);
        setSelectedKaryawanHapus(null);
      } catch (error) {}
    }
  };

  const formatNumber = (value) => value.replace(/\D/g, "").replace(/\B(?=(\d{3})+(?!\d))/g, ",");

  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  return (
    <div className="container my-4" style={{ width: "100%" }}>
      <h3 className="text-center fw-bold mb-4">DAFTAR KARYAWAN</h3>
      <div className="text-center mb-4">
        <button className="btn btn-success btn-sm" onClick={() => setIsTambahModalOpen(true)}>
          + Tambah Karyawan
        </button>
      </div>
      <div className="d-flex flex-column gap-3" style={{ marginBottom: "100px" }}>
        {employees.map((employee) => (
          <div key={employee.id} className="card p-3">
            <div className="d-flex align-items-center gap-3 mb-3">
              <img
                src={employee.fotoKaryawan || defaultProfile}
                alt={employee.namaKaryawan}
                className="rounded-circle"
                style={{ width: "60px", height: "60px", objectFit: "cover" }}
              />
              <div>
                <h5 className="mb-0 text-uppercase text-truncate" style={{ maxWidth: "240px" }}>
                  {employee.namaKaryawan.length > 18
                    ? employee.namaKaryawan.substring(0, 20) + ".."
                    : employee.namaKaryawan}
                </h5>
                <p className="mb-0 text-muted small">{employee.posisiKaryawan}</p>
                <p className="mb-0 text-muted small">
                  Gaji: {employee.gajiKaryawan
                    ? `Rp ${parseInt(employee.gajiKaryawan).toLocaleString("id-ID")}`
                    : "Belum Ditentukan"}
                </p>
              </div>
            </div>
            <div className="d-flex justify-content-between gap-2">
              <button
                onClick={() => handleEditEmployee(employee)}
                className="btn btn-outline-primary btn-sm flex-fill"
              >
                ✎ Edit
              </button>
              <button
                onClick={() => handleAturFoto(employee)}
                className="btn btn-outline-success btn-sm flex-fill"
              >
                ☰ Atur Foto
              </button>
              <button
                onClick={() => {
                  setSelectedKaryawanHapus(employee);
                  setShowModalHapus(true);
                }}
                className="btn btn-outline-danger btn-sm flex-fill"
              >
                ✕ Hapus
              </button>
            </div>
          </div>
        ))}
      </div>
      <KaryawanEdit
        isOpen={isEditModalOpen}
        setIsOpen={setIsEditModalOpen}
        employee={editingEmployee}
        formData={formData}
        setFormData={setFormData}
        selectedFile={selectedFile}
        setSelectedFile={setSelectedFile}
        formattedSalary={formattedSalary}
        setFormattedSalary={setFormattedSalary}
        fetchEmployees={fetchEmployees}
        isUploading={isUploading}
        setIsUploading={setIsUploading}
      />
      <KaryawanTambah
        isOpen={isTambahModalOpen}
        setIsOpen={setIsTambahModalOpen}
        fetchEmployees={fetchEmployees}
      />
      <KaryawanFace
        isOpen={isFaceModalOpen}
        setIsOpen={setIsFaceModalOpen}
        username={selectedEmployee?.username}
      />
      <Modal show={showModalHapus} onHide={() => setShowModalHapus(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title className="text-danger fw-bold">PERINGATAN PENGHAPUSAN DATA</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div className="alert alert-danger" role="alert">
            <b>
              Anda akan menghapus seluruh data terkait karyawan ini!
            </b>
            <ul className="mt-2 mb-0">
              <li>Akun Karyawan</li>
              <li>Semua <span className="fw-bold">Histori Kehadiran</span></li>
              <li>Semua <span className="fw-bold">Histori Penggajian</span></li>
              <li>Seluruh file foto & dokumen terkait karyawan ini</li>
            </ul>
            <div className="mt-3 text-dark fw-bold">
              <span className="bi bi-exclamation-triangle"></span>
              <span> Tindakan ini tidak dapat dibatalkan!</span>
            </div>
          </div>
          <p>Apakah Anda yakin ingin menghapus seluruh data karyawan ini?</p>
          <div className="text-center">
            <span className="fw-bold text-danger">{selectedKaryawanHapus?.namaKaryawan?.toUpperCase()}</span>
          </div>
        </Modal.Body>
        <Modal.Footer>
          <button className="btn btn-secondary" onClick={() => setShowModalHapus(false)}>
            Batal
          </button>
          <button className="btn btn-danger" onClick={handleDeleteEmployee}>
            Hapus Semua Data
          </button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default ManajerKaryawanMobile;
