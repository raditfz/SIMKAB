import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { db, storage } from "../firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { ref, listAll, getDownloadURL, uploadBytes, deleteObject } from "firebase/storage";
import defaultProfile from "../assets/icon-profil.jpg";

const KaryawanData = () => {
  const { username } = useParams();
  const navigate = useNavigate();
  const [profilUtama, setProfilUtama] = useState(null);
  const [profil, setProfil] = useState(null);
  const [fotoList, setFotoList] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editField, setEditField] = useState("");
  const [editData, setEditData] = useState({});
  const [ktpFile, setKtpFile] = useState(null);
  const [ktpUploading, setKtpUploading] = useState(false);
  const [ktpError, setKtpError] = useState("");
  const [showKtpModal, setShowKtpModal] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [fileInputs, setFileInputs] = useState({});
  const [multipleFiles, setMultipleFiles] = useState([]);

  useEffect(() => {
    const fetchAll = async () => {
      setIsLoading(true);
      const docRef = doc(db, "dataKaryawan", username);
      const docSnap = await getDoc(docRef);
      setProfilUtama(docSnap.exists() ? docSnap.data() : null);
      const profilRef = doc(db, "dataKaryawan", username, "Data", "Profil");
      const profilSnap = await getDoc(profilRef);
      setProfil(profilSnap.exists() ? profilSnap.data() : null);
      setEditData(profilSnap.exists() ? profilSnap.data() : {});
      setIsLoading(false);
    };

    const fetchFotoList = async () => {
      try {
        const folderRef = ref(storage, `Karyawan/${username}/`);
        const result = await listAll(folderRef);
        if (!result || result.items.length === 0) setFotoList([]);
        else {
          const data = await Promise.all(result.items.map(async (itemRef) => {
            const url = await getDownloadURL(itemRef);
            return { name: itemRef.name, url };
          }));
          setFotoList(data);
        }
      } catch {
        setFotoList([]);
      }
    };

    fetchAll();
    fetchFotoList();
  }, [username, uploadProgress, ktpUploading]);

  const handleEditClick = (field) => {
    setEditField(field);
    if (field === "gajiKaryawan" || field === "posisiKaryawan") {
      setEditData({ ...profilUtama });
    } else {
      setEditData({ ...profil });
    }
  };

  const handleChange = (e) => setEditData({ ...editData, [e.target.name]: e.target.value });

  const handleCancel = () => {
    setEditField("");
    if (editField === "gajiKaryawan" || editField === "posisiKaryawan") {
      setEditData({ ...profilUtama });
    } else {
      setEditData({ ...profil });
    }
  };

  const handleSave = async (field) => {
    if (field === "gajiKaryawan" || field === "posisiKaryawan") {
      const docRef = doc(db, "dataKaryawan", username);
      let updateObj = {};
      if (field === "gajiKaryawan") {
        const gajiNum = Number(editData.gajiKaryawan);
        if (isNaN(gajiNum) || gajiNum < 0) {
          alert("Gaji harus berupa angka positif.");
          return;
        }
        updateObj.gajiKaryawan = gajiNum;
      } else {
        updateObj.posisiKaryawan = editData.posisiKaryawan || "";
      }
      await updateDoc(docRef, updateObj);
      setProfilUtama(prev => ({ ...prev, ...updateObj }));
    } else {
      const docRef = doc(db, "dataKaryawan", username, "Data", "Profil");
      await updateDoc(docRef, { [field]: editData[field] });
      setProfil(prev => ({ ...prev, [field]: editData[field] }));
    }
    setEditField("");
  };

  const handleKtpChange = (e) => {
    setKtpError("");
    const file = e.target.files[0];
    if (!file) return setKtpFile(null);
    if (!["image/jpeg", "image/png"].includes(file.type)) {
      setKtpError("File harus berupa JPG atau PNG");
      return setKtpFile(null);
    }
    if (file.size > 5 * 1024 * 1024) {
      setKtpError("Ukuran file maksimal 5MB");
      return setKtpFile(null);
    }
    setKtpFile(file);
  };

  const handleKtpUpload = async () => {
    setKtpError("");
    if (!ktpFile) { setKtpError("Pilih file gambar terlebih dahulu."); return; }
    setKtpUploading(true);
    try {
      const ext = ktpFile.name.split(".").pop().toLowerCase() === "png" ? "png" : "jpg";
      const fileName = `file(${username}_ktp).${ext}`;
      const fileRef = ref(storage, `dataKaryawan/${username}/${fileName}`);
      await uploadBytes(fileRef, ktpFile);
      const url = await getDownloadURL(fileRef);

      const profilRef = doc(db, "dataKaryawan", username, "Data", "Profil");
      const profilSnap = await getDoc(profilRef);
      if (!profilSnap.exists()) {
        await setDoc(profilRef, { KTP: url });
      } else {
        await updateDoc(profilRef, { KTP: url });
      }
      setKtpFile(null);
    } catch (err) {
      setKtpError("Upload gagal, cek koneksi!");
    }
    setKtpUploading(false);
  };

  const handleFileChange = (e) => {
    setMultipleFiles([...e.target.files]);
  };
  const handleUploadFotos = async () => {
    if (!multipleFiles.length) return;
    try {
      const folderRef = ref(storage, `Karyawan/${username}/`);
      const existing = await listAll(folderRef);
      const existingCount = existing.items.length;
      const maxUpload = 10 - existingCount;
      const filesToUpload = multipleFiles.slice(0, maxUpload);
      setUploadProgress(0);
      for (let i = 0; i < filesToUpload.length; i++) {
        const file = filesToUpload[i];
        const filename = `${username}_${String(existingCount + i + 1).padStart(2, "0")}.jpg`;
        const fileRef = ref(storage, `Karyawan/${username}/${filename}`);
        await uploadBytes(fileRef, file);
        setUploadProgress(Math.round(((i + 1) / filesToUpload.length) * 100));
      }
      setMultipleFiles([]);
      setUploadProgress(100);
      setTimeout(() => setUploadProgress(0), 1000);
    } catch { setUploadProgress(0); }
  };
  const handleFileReplace = (file, name) => setFileInputs((prev) => ({ ...prev, [name]: file }));
  const handleReplace = async (name) => {
    const file = fileInputs[name];
    if (!file) { alert("Pilih file untuk mengganti."); return; }
    try {
      const fileRef = ref(storage, `Karyawan/${username}/${name}`);
      await uploadBytes(fileRef, file);
      setFileInputs((prev) => ({ ...prev, [name]: null }));
      setUploadProgress(100);
      setTimeout(() => setUploadProgress(0), 1000);
    } catch { alert("Gagal upload."); }
  };
  const handleDeleteFoto = async (name) => {
    try {
      const fileRef = ref(storage, `Karyawan/${username}/${name}`);
      await deleteObject(fileRef);
      setUploadProgress(100);
      setTimeout(() => setUploadProgress(0), 1000);
    } catch { alert("Gagal hapus."); }
  };

  if (isLoading) return (
    <div className="container py-4 text-center">
      <div className="spinner-border text-primary" role="status" />
      <div>Memuat Data...</div>
    </div>
  );
  if (!profilUtama) return (
    <div className="container py-4 text-center">
      <div className="text-danger">Data karyawan tidak ditemukan.</div>
    </div>
  );

  return (
    <div className="container my-4" style={{ maxWidth: 800 }}>
      {showKtpModal && (
        <div className="position-fixed top-0 start-0 w-100 h-100" style={{ zIndex: 1055, background: "rgba(0,0,0,0.5)" }} onClick={() => setShowKtpModal(false)}>
          <div className="d-flex align-items-center justify-content-center h-100">
            <div className="bg-white rounded-3 p-2 shadow" style={{ maxWidth: "90vw", maxHeight: "90vh" }} onClick={e => e.stopPropagation()}>
              <img src={profil?.KTP} alt="Preview KTP" style={{ maxWidth: "90vw", maxHeight: "90vh", objectFit: "contain" }} />
            </div>
          </div>
        </div>
      )}
      <div className="mb-4">
        <button className="btn btn-outline-secondary mb-2" onClick={() => navigate(-1)}>← Kembali</button>
      </div>
      <div className="card p-4 mb-4">
        <div className="d-flex align-items-center gap-4 flex-wrap">
          <img src={profilUtama.fotoKaryawan || defaultProfile} alt={profilUtama.namaKaryawan} className="rounded-circle" style={{ width: "90px", height: "90px", objectFit: "cover", border: "2px solid #ccc" }} />
          <div>
            <h4 className="mb-1 text-uppercase">{profilUtama.namaKaryawan}</h4>

            {/* Posisi Karyawan */}
            {editField === "posisiKaryawan" ? (
              <div className="d-flex gap-2 align-items-center">
                <input
                  type="text"
                  className="form-control form-control-sm"
                  name="posisiKaryawan"
                  value={editData.posisiKaryawan || ""}
                  onChange={handleChange}
                  style={{ maxWidth: 250 }}
                />
                <button className="btn btn-success btn-sm" onClick={() => handleSave("posisiKaryawan")}>Simpan</button>
                <button className="btn btn-secondary btn-sm" onClick={handleCancel}>Batal</button>
              </div>
            ) : (
              <div className="d-flex align-items-center gap-2">
                <div className="text-muted">{profilUtama.posisiKaryawan || "-"}</div>
                <button className="btn btn-link btn-sm p-0" onClick={() => handleEditClick("posisiKaryawan")}>Edit</button>
              </div>
            )}

            {/* Gaji Karyawan */}
            <div className="mb-1 mt-2">
              <b>Gaji: </b>
              {editField === "gajiKaryawan" ? (
                <span className="d-flex align-items-center gap-2">
                  <input
                    type="number"
                    className="form-control form-control-sm"
                    name="gajiKaryawan"
                    value={editData.gajiKaryawan || ""}
                    onChange={handleChange}
                    style={{ maxWidth: 150 }}
                    min={0}
                  />
                  <button className="btn btn-success btn-sm" onClick={() => handleSave("gajiKaryawan")}>Simpan</button>
                  <button className="btn btn-secondary btn-sm" onClick={handleCancel}>Batal</button>
                </span>
              ) : (
                <span className="d-flex align-items-center gap-2">
                  Rp. {profilUtama.gajiKaryawan?.toLocaleString("id-ID") || "-"}
                  <button className="btn btn-link btn-sm p-0" onClick={() => handleEditClick("gajiKaryawan")}>Edit</button>
                </span>
              )}
            </div>

            <div><b>Username:</b> {profilUtama.username || username}</div>
          </div>
        </div>
      </div>

      <div className="card p-4 mb-4">
        <div className="fw-bold mb-2 fs-5">Data Pribadi</div>
        <div className="row gy-3">
          <div className="col-md-6">
            <div className="mb-2">
              <span className="fw-semibold d-block mb-1">Alamat</span>
              {editField === "Alamat" ? (
                <div className="d-flex gap-2">
                  <input type="text" className="form-control" name="Alamat" value={editData.Alamat || ""} onChange={handleChange} />
                  <button className="btn btn-success btn-sm" onClick={() => handleSave("Alamat")}>Simpan</button>
                  <button className="btn btn-secondary btn-sm" onClick={handleCancel}>Batal</button>
                </div>
              ) : (
                <div className="d-flex align-items-center gap-2">
                  <span>{profil?.Alamat || "-"}</span>
                  <button className="btn btn-link btn-sm p-0" onClick={() => handleEditClick("Alamat")}>Edit</button>
                </div>
              )}
            </div>
            <div className="mb-2">
              <span className="fw-semibold d-block mb-1">KTP</span>
              {profil?.KTP ? (
                <>
                  <img
                    src={profil.KTP}
                    alt="KTP"
                    className="img-thumbnail"
                    style={{ width: 90, maxHeight: 50, objectFit: "cover", cursor: "pointer" }}
                    onClick={() => setShowKtpModal(true)}
                  />
                  <div>
                    <button className="btn btn-sm btn-outline-primary mt-1" onClick={() => setShowKtpModal(true)}>
                      Perbesar
                    </button>
                  </div>
                </>
              ) : (
                <div>
                  <input
                    type="file"
                    accept="image/jpeg,image/png"
                    className="form-control mb-2"
                    style={{ maxWidth: 300 }}
                    onChange={handleKtpChange}
                    disabled={ktpUploading}
                  />
                  <button className="btn btn-success btn-sm" disabled={!ktpFile || ktpUploading} onClick={handleKtpUpload}>
                    {ktpUploading ? "Mengupload..." : "Upload KTP"}
                  </button>
                  {ktpError && <div className="text-danger small mt-1">{ktpError}</div>}
                </div>
              )}
            </div>
          </div>
          <div className="col-md-6">
            <div className="mb-2">
              <span className="fw-semibold d-block mb-1">NomorHP</span>
              {editField === "NomorHP" ? (
                <div className="d-flex gap-2">
                  <input type="text" className="form-control" name="NomorHP" value={editData.NomorHP || ""} onChange={handleChange} />
                  <button className="btn btn-success btn-sm" onClick={() => handleSave("NomorHP")}>Simpan</button>
                  <button className="btn btn-secondary btn-sm" onClick={handleCancel}>Batal</button>
                </div>
              ) : (
                <div className="d-flex align-items-center gap-2">
                  <span>{profil?.NomorHP || "-"}</span>
                  <button className="btn btn-link btn-sm p-0" onClick={() => handleEditClick("NomorHP")}>Edit</button>
                </div>
              )}
            </div>
            <div className="mb-2">
              <span className="fw-semibold d-block mb-1">Password</span>
              {editField === "Password" ? (
                <div className="d-flex gap-2">
                  <input type="text" className="form-control" name="Password" value={editData.Password || ""} onChange={handleChange} />
                  <button className="btn btn-success btn-sm" onClick={() => handleSave("Password")}>Simpan</button>
                  <button className="btn btn-secondary btn-sm" onClick={handleCancel}>Batal</button>
                </div>
              ) : (
                <div className="d-flex align-items-center gap-2">
                  {profil?.Password ? (<span style={{ letterSpacing: "0.3em" }}>{profil.Password.replace(/./g, "•")}</span>) : (<span className="text-muted">-</span>)}
                  <button className="btn btn-link btn-sm p-0" onClick={() => handleEditClick("Password")}>Edit</button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="card p-4 mb-4">
        <div className="fw-bold mb-2 fs-5">Foto Wajah Karyawan</div>
        <div className="mb-3">
          <label className="form-label">Tambah Foto Wajah (maksimal 10 foto):</label>
          <div className="d-flex flex-wrap gap-2 mb-2">
            <input type="file" multiple accept="image/*" className="form-control" style={{ maxWidth: 320 }} onChange={handleFileChange} />
            <button className="btn btn-primary" onClick={handleUploadFotos} disabled={multipleFiles.length === 0}>Upload Foto</button>
            {uploadProgress > 0 && uploadProgress < 100 && (
              <div style={{ minWidth: 120 }}>
                <div className="progress" style={{ height: 18 }}>
                  <div className="progress-bar progress-bar-striped progress-bar-animated" role="progressbar"
                    style={{ width: `${uploadProgress}%` }} aria-valuenow={uploadProgress}
                    aria-valuemin="0" aria-valuemax="100">{uploadProgress}%</div>
                </div>
              </div>
            )}
          </div>
        </div>
        {fotoList.length === 0 ? (
          <div className="text-muted mb-2">Belum ada foto wajah.</div>
        ) : (
          <div className="row g-3">
            {fotoList.map((foto, idx) => (
              <div className="col-6 col-md-3 d-flex flex-column align-items-center" key={idx}>
                <img src={foto.url} alt={foto.name} className="rounded mb-2" style={{ width: 90, height: 90, objectFit: "cover", border: "2px solid #bbb" }} />
                <input type="file" accept="image/*" className="form-control form-control-sm mb-1"
                  style={{ maxWidth: 140 }} onChange={e => setFileInputs(prev => ({ ...prev, [foto.name]: e.target.files[0] }))} />
                <div className="d-flex gap-1">
                  <button className="btn btn-sm btn-outline-primary" onClick={() => {
                    const file = fileInputs[foto.name];
                    if (!file) { alert("Pilih file untuk mengganti."); return; }
                    const fileRef = ref(storage, `Karyawan/${username}/${foto.name}`);
                    uploadBytes(fileRef, file).then(() => {
                      setFileInputs(prev => ({ ...prev, [foto.name]: null }));
                      setUploadProgress(100);
                      setTimeout(() => setUploadProgress(0), 1000);
                    }).catch(() => alert("Gagal upload."));
                  }}>Ganti</button>
                  <button className="btn btn-sm btn-outline-danger" onClick={async () => {
                    try {
                      const fileRef = ref(storage, `Karyawan/${username}/${foto.name}`);
                      await deleteObject(fileRef);
                      setUploadProgress(100);
                      setTimeout(() => setUploadProgress(0), 1000);
                    } catch {
                      alert("Gagal hapus.");
                    }
                  }}>Hapus</button>
                </div>
                <div className="small text-muted text-center mt-1" style={{ maxWidth: 100, fontSize: 12, wordBreak: "break-word" }}>{foto.name}</div>
              </div>
            ))}
          </div>
        )}
        <div className="text-muted mt-3" style={{ fontSize: 13 }}>Klik Ganti untuk update foto, atau Hapus untuk menghapus foto wajah.</div>
      </div>

      <style>{`
        @media (max-width: 600px) {
          .card { padding: 1.2rem !important; }
          h4 { font-size: 1.1rem !important; }
          .fs-5 { font-size: 1rem !important; }
          .form-control, .btn, .img-thumbnail { font-size: 13px !important; }
          .rounded, .rounded-circle, .img-thumbnail { max-width: 100%; height: auto; }
          .col-md-6 { flex: 0 0 100%; max-width: 100%; }
        }
      `}</style>
    </div>
  );
};

export default KaryawanData;