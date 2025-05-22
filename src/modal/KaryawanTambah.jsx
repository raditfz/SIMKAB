import React, { useState } from "react";
import { db, storage } from "../firebase";
import { doc, setDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

const KaryawanTambah = ({ isOpen, setIsOpen, fetchEmployees }) => {
  const [akun, setAkun] = useState({ email: "", username: "", password: "" });
  const [data, setData] = useState({ namaKaryawan: "", posisiKaryawan: "", gajiKaryawan: "" });
  const [selectedFile, setSelectedFile] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChangeAkun = (e) => setAkun({ ...akun, [e.target.name]: e.target.value });
  const handleChangeData = (e) => setData({ ...data, [e.target.name]: e.target.value });

  const handleFileChange = (e) => {
    if (e.target.files[0]) setSelectedFile(e.target.files[0]);
  };

  const handleSubmit = async () => {
    if (!akun.username) {
      alert("Username harus diisi.");
      return;
    }
    setIsSubmitting(true);

    try {
      let fotoURL = "";

      if (selectedFile) {
        const fotoRef = ref(storage, `fotoKaryawan/${akun.username}_${selectedFile.name}`);
        await uploadBytes(fotoRef, selectedFile);
        fotoURL = await getDownloadURL(fotoRef);
      }

      await setDoc(doc(db, "akunKaryawan", akun.username), {
        email: akun.email,
        username: akun.username,
        password: akun.password
      });

      await setDoc(doc(db, "dataKaryawan", akun.username), {
        namaKaryawan: data.namaKaryawan,
        posisiKaryawan: data.posisiKaryawan,
        gajiKaryawan: Number(data.gajiKaryawan),
        fotoKaryawan: fotoURL,
        username: akun.username
      });

      setIsOpen(false);
      fetchEmployees();
    } catch (err) {
      console.error(err);
      alert("Gagal menyimpan data");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal show" style={{ display: "block", backgroundColor: "rgba(0,0,0,0.5)" }}>
      {/* Modal Content */}
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">Tambah Karyawan</h5>
            <button type="button" className="btn-close" onClick={() => setIsOpen(false)}></button>
          </div>
          <div className="modal-body">
            {/* Form */}
            <form>
              {/* Input fields */}
              <div className="mb-2">
                <label className="form-label">Email:</label>
                <input type="email" className="form-control form-control-sm" name="email" onChange={handleChangeAkun} />
              </div>
              <div className="mb-2">
                <label className="form-label">Username:</label>
                <input type="text" className="form-control form-control-sm" name="username" onChange={handleChangeAkun} />
              </div>
              <div className="mb-2">
                <label className="form-label">Password:</label>
                <input type="password" className="form-control form-control-sm" name="password" onChange={handleChangeAkun} />
              </div>

              <hr />
              <h6 className="mb-2">Data Karyawan</h6>
              <div className="mb-2">
                <label className="form-label">Nama:</label>
                <input type="text" className="form-control form-control-sm" name="namaKaryawan" onChange={handleChangeData} />
              </div>
              <div className="mb-2">
                <label className="form-label">Jabatan:</label>
                <input type="text" className="form-control form-control-sm" name="posisiKaryawan" onChange={handleChangeData} />
              </div>
              <div className="mb-2">
                <label className="form-label">Gaji:</label>
                <input type="number" className="form-control form-control-sm" name="gajiKaryawan" onChange={handleChangeData} />
              </div>
              <div className="mb-2">
                <label className="form-label">Foto:</label>
                <input type="file" className="form-control form-control-sm" accept="image/*" onChange={handleFileChange} />
              </div>
            </form>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => setIsOpen(false)} disabled={isSubmitting}>Batal</button>
            <button type="button" className="btn btn-success btn-sm" onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? "Menyimpan..." : "Simpan"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default KaryawanTambah;