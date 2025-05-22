import React, { useEffect, useState, useCallback } from "react";
import { db, storage, auth } from "../firebase.js";
import {
  collection,
  getDocs,
  query,
  where,
  deleteDoc,
  doc,
  setDoc,
} from "firebase/firestore";
import { ref, listAll, deleteObject } from "firebase/storage";
import { useNavigate } from "react-router-dom";
import { onAuthStateChanged } from "firebase/auth";
import "bootstrap/dist/css/bootstrap.min.css";
import defaultProfile from "../assets/icon-profil.jpg";
import { Modal, Spinner } from "react-bootstrap";

const isMobile = () => window.innerWidth <= 600;

const ManajerKaryawan = () => {
  const [isTambahModalOpen, setIsTambahModalOpen] = useState(false);
  const [employees, setEmployees] = useState([]);
  const [photoStatus, setPhotoStatus] = useState({});
  const [loadingData, setLoadingData] = useState(true);
  const [showModalHapus, setShowModalHapus] = useState(false);
  const [selectedKaryawanHapus, setSelectedKaryawanHapus] = useState(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [deleteStep, setDeleteStep] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [tambahLoading, setTambahLoading] = useState(false);
  const [tambahError, setTambahError] = useState("");
  const [formTambah, setFormTambah] = useState({
    username: "",
    Password: "",
    namaKaryawan: "",
    posisiKaryawan: "",
    gajiKaryawan: "",
  });

  const [isMobileView, setIsMobileView] = useState(isMobile());
  const navigate = useNavigate();

  useEffect(() => {
    const handleResize = () => setIsMobileView(isMobile());
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        navigate("/login");
        return;
      }
      setLoadingAuth(false);
    });
    return () => unsub();
  }, [navigate]);

  const fetchEmployees = useCallback(async () => {
    setLoadingData(true);
    const dataSnap = await getDocs(collection(db, "dataKaryawan"));
    const empList = dataSnap.docs.map((doc) => ({ ...doc.data(), id: doc.id }));
    setEmployees(empList);
    const statusObj = {};
    await Promise.all(
      empList.map(async (emp) => {
        try {
          const listRef = ref(storage, `Karyawan/${emp.username}/`);
          const listResult = await listAll(listRef);
          statusObj[emp.id] = listResult.items.length > 0;
        } catch {
          statusObj[emp.id] = false;
        }
      })
    );
    setPhotoStatus(statusObj);
    setLoadingData(false);
  }, []);

  const handleShowModalHapus = (employee) => {
    setSelectedKaryawanHapus(employee);
    setShowModalHapus(true);
    setDeleteStep("");
    setDeleteError("");
    setDeleting(false);
  };

  const handleDeleteEmployee = async () => {
    if (selectedKaryawanHapus && selectedKaryawanHapus.username) {
      const username = selectedKaryawanHapus.username;
      setDeleting(true);
      setDeleteError("");
      try {
        setDeleteStep("Menghapus subkoleksi Data...");
        const dataRef = collection(db, "dataKaryawan", selectedKaryawanHapus.id, "Data");
        const dataSnap = await getDocs(dataRef);
        for (const d of dataSnap.docs) await deleteDoc(d.ref);

        setDeleteStep("Menghapus data kehadiran karyawan...");
        const kehadiranRef = collection(db, `dataKaryawan/${selectedKaryawanHapus.id}/Kehadiran`);
        const kehadiranSnap = await getDocs(kehadiranRef);
        for (const d of kehadiranSnap.docs) await deleteDoc(d.ref);

        setDeleteStep("Menghapus data penggajian karyawan...");
        const penggajianRef = collection(db, `dataKaryawan/${selectedKaryawanHapus.id}/Penggajian`);
        const penggajianSnap = await getDocs(penggajianRef);
        for (const d of penggajianSnap.docs) await deleteDoc(d.ref);

        setDeleteStep("Menghapus data utama karyawan...");
        await deleteDoc(doc(db, "dataKaryawan", selectedKaryawanHapus.id));

        setDeleteStep("Menghapus foto & dokumen karyawan...");
        const folderRef = ref(storage, `Karyawan/${username}/`);
        const fileList = await listAll(folderRef);
        for (const itemRef of fileList.items) await deleteObject(itemRef);

        setDeleteStep("Selesai menghapus seluruh data!");
        await fetchEmployees();
        setTimeout(() => {
          setShowModalHapus(false);
          setSelectedKaryawanHapus(null);
          setDeleteStep("");
          setDeleting(false);
        }, 1200);
      } catch {
        setDeleteError("Gagal menghapus data. Silakan coba lagi.");
        setDeleting(false);
      }
    }
  };

  const handleFormTambahChange = (e) => {
    const { name, valueAsNumber, value } = e.target;
    setFormTambah((prev) => ({
      ...prev,
      [name]: name === "gajiKaryawan" ? valueAsNumber : value,
    }));
  };

  const handleTambahKaryawan = async () => {
    const { username, Password, namaKaryawan, posisiKaryawan, gajiKaryawan } = formTambah;
    if (!username || !Password || !namaKaryawan || !posisiKaryawan || !gajiKaryawan) {
      setTambahError("Semua field harus diisi.");
      return;
    }
    setTambahError("");
    setTambahLoading(true);
    try {
      const existing = await getDocs(
        query(collection(db, "dataKaryawan"), where("username", "==", username))
      );
      if (!existing.empty) {
        setTambahError("Username sudah digunakan.");
        setTambahLoading(false);
        return;
      }
      await setDoc(doc(db, "dataKaryawan", username), {
        username,
        namaKaryawan,
        posisiKaryawan,
        gajiKaryawan: Number(gajiKaryawan),
      });
      await setDoc(doc(db, "dataKaryawan", username, "Data", "Profil"), {
        Password,
      });
      await fetchEmployees();
      setIsTambahModalOpen(false);
      setFormTambah({ username: "", Password: "", namaKaryawan: "", posisiKaryawan: "", gajiKaryawan: "" });
    } catch {
      setTambahError("Gagal menambahkan karyawan.");
    }
    setTambahLoading(false);
  };

  useEffect(() => {
    if (!loadingAuth) fetchEmployees();
  }, [fetchEmployees, loadingAuth]);

  if (loadingAuth) return null;

  return (
    <div className="container my-4">
      <h3 className="text-center fw-bold mb-3">DAFTAR KARYAWAN</h3>
      <div className="alert alert-warning text-dark text-center mb-4" style={{ fontSize: '0.95rem' }}>
        Tambahkan foto karyawan untuk bisa presensi dengan alat
      </div>
      <div className="text-center mb-4">
        <button
          className="btn btn-success btn-sm"
          onClick={() => setIsTambahModalOpen(true)}
        >
          + Tambah Karyawan
        </button>
      </div>
      {loadingData ? (
        <div className="text-center py-5">
          <Spinner animation="border" />
        </div>
      ) : (
        <div className="d-flex flex-column gap-3">
          {employees.map((employee) => (
            <div key={employee.id} className="card p-3 position-relative" style={{ minHeight: 110 }}>
              <div className="d-flex align-items-center justify-content-between flex-wrap flex-md-nowrap">
                <div className="d-flex align-items-center gap-3 flex-wrap">
                  <img
                    src={employee.fotoKaryawan || defaultProfile}
                    alt={employee.namaKaryawan}
                    className="rounded-circle"
                    style={{
                      width: isMobileView ? "48px" : "60px",
                      height: isMobileView ? "48px" : "60px",
                      objectFit: "cover",
                    }}
                  />
                  <div style={{ minWidth: 0 }}>
                    <h5 className="mb-0 text-uppercase text-truncate" style={{ maxWidth: isMobileView ? 160 : 300 }}>
                      {employee.namaKaryawan}
                    </h5>
                    <p className="mb-0 text-muted small">{employee.posisiKaryawan}</p>
                    <p className="mb-0 text-muted small">
                      Gaji: {employee.gajiKaryawan ? `Rp ${parseInt(employee.gajiKaryawan).toLocaleString("id-ID")}` : "Belum Ditentukan"}
                    </p>
                  </div>
                </div>
                <div className={`d-flex ${isMobileView ? "mt-3 w-100 justify-content-end gap-2" : ""}`}>
                  <button
                    onClick={() => navigate(`/karyawan/${employee.username}`)}
                    className="btn btn-outline-primary fw-bold me-2"
                    style={isMobileView ? { fontSize: 13, padding: "4px 8px" } : {}}
                  >
                    ☷ Data
                  </button>
                  <button
                    onClick={() => handleShowModalHapus(employee)}
                    className="btn btn-outline-danger fw-bolder"
                    style={isMobileView ? { fontSize: 13, padding: "4px 8px" } : {}}
                  >
                    Х Hapus
                  </button>
                </div>
              </div>
              {photoStatus[employee.id] === false && (
                <div
                  style={{
                    position: "absolute",
                    right: 6,
                    bottom: 0,
                    zIndex: 2,
                    background: "#ffe066",
                    color: "#674c00",
                    borderRadius: 5,
                    fontWeight: 500,
                    fontSize: isMobileView ? "0.82rem" : "0.9rem",
                    padding: isMobileView ? "6px 12px" : "7px 16px",
                    boxShadow: "0 2px 6px rgba(120,100,0,0.07)",
                    maxWidth: isMobileView ? 180 : 320,
                    textAlign: "center",
                  }}
                >
                  Foto belum ditambahkan
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <Modal show={isTambahModalOpen} onHide={() => setIsTambahModalOpen(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Tambah Karyawan Baru</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {tambahError && <div className="alert alert-danger">{tambahError}</div>}
          <form onSubmit={(e) => { e.preventDefault(); handleTambahKaryawan(); }}>
            <div className="mb-3">
              <label htmlFor="username" className="form-label">Username</label>
              <input type="text" id="username" name="username" className="form-control" value={formTambah.username} onChange={handleFormTambahChange} required />
            </div>
            <div className="mb-3">
              <label htmlFor="Password" className="form-label">Password</label>
              <input type="Password" id="Password" name="Password" className="form-control" value={formTambah.Password} onChange={handleFormTambahChange} required />
            </div>
            <div className="mb-3">
              <label htmlFor="namaKaryawan" className="form-label">Nama Karyawan</label>
              <input type="text" id="namaKaryawan" name="namaKaryawan" className="form-control" value={formTambah.namaKaryawan} onChange={handleFormTambahChange} required />
            </div>
            <div className="mb-3">
              <label htmlFor="posisiKaryawan" className="form-label">Posisi Karyawan</label>
              <input type="text" id="posisiKaryawan" name="posisiKaryawan" className="form-control" value={formTambah.posisiKaryawan} onChange={handleFormTambahChange} required />
            </div>
            <div className="mb-3">
              <label htmlFor="gajiKaryawan" className="form-label">Gaji Karyawan</label>
              <input type="number" id="gajiKaryawan" name="gajiKaryawan" className="form-control" value={formTambah.gajiKaryawan} onChange={handleFormTambahChange} required />
            </div>
            <div className="text-end">
              <button type="button" className="btn btn-secondary me-2" onClick={() => setIsTambahModalOpen(false)} disabled={tambahLoading}>
                Batal
              </button>
              <button type="submit" className="btn btn-primary" disabled={tambahLoading}>
                {tambahLoading ? "Menyimpan..." : "Simpan"}
              </button>
            </div>
          </form>
        </Modal.Body>
      </Modal>

      <Modal show={showModalHapus} onHide={() => setShowModalHapus(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title className="text-danger fw-bold">PERINGATAN PENGHAPUSAN DATA</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div className="alert alert-danger" role="alert">
            <b>Anda akan menghapus seluruh data terkait karyawan ini!</b>
            <ul className="mt-2 mb-0">
              <li>Semua <span className="fw-bold">Histori Kehadiran</span></li>
              <li>Semua <span className="fw-bold">Histori Penggajian</span></li>
              <li>Subkoleksi <span className="fw-bold">Data</span> (termasuk Profil dan lainnya)</li>
              <li>Seluruh file foto & dokumen terkait karyawan ini</li>
            </ul>
            <div className="mt-3 text-dark fw-bold">
              <span className="bi bi-exclamation-triangle"></span> <span>Tindakan ini tidak dapat dibatalkan!</span>
            </div>
          </div>
          <p>Apakah Anda yakin ingin menghapus seluruh data karyawan ini?</p>
          <div className="text-center">
            <span className="fw-bold text-danger">{selectedKaryawanHapus?.namaKaryawan?.toUpperCase()}</span>
          </div>
          {deleting && (
            <div className="mt-3 text-center">
              <span className="fw-bold text-danger" style={{ fontSize: "1rem" }}>
                <Spinner size="sm" animation="border" className="me-2" />
                {deleteStep}
              </span>
            </div>
          )}
          {deleteError && (
            <div className="mt-2 text-center">
              <span className="fw-bold text-danger">{deleteError}</span>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <button className="btn btn-secondary" onClick={() => setShowModalHapus(false)} disabled={deleting}>
            Batal
          </button>
          <button className="btn btn-danger" onClick={handleDeleteEmployee} disabled={deleting}>
            Hapus Semua Data
          </button>
        </Modal.Footer>
      </Modal>
      <style>{`
        @media (max-width: 600px) {
          .card { padding: 1.1rem !important; }
          h5, .fw-bold { font-size: 1rem !important; }
          .btn, .form-control, .small { font-size: 13px !important; }
          .gap-3 { gap: 1rem !important; }
        }
      `}</style>
    </div>
  );
};

export default ManajerKaryawan;
