import React, { useEffect, useState } from "react";
import { ref, listAll, getDownloadURL, uploadBytes } from "firebase/storage";
import { storage } from "../firebase";

const KaryawanFace = ({ isOpen, setIsOpen, username }) => {
  const [fotoList, setFotoList] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [fileInputs, setFileInputs] = useState({});
  const [multipleFiles, setMultipleFiles] = useState([]);
  const [folderExists, setFolderExists] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const fetchFotoList = async () => {
    if (!username) return;
    setIsLoading(true);
    try {
      const folderRef = ref(storage, `Karyawan/${username}/`);
      const result = await listAll(folderRef);
      if (!result || result.items.length === 0) {
        setFotoList([]);
        setFolderExists(false);
      } else {
        const data = await Promise.all(
          result.items.map(async (itemRef) => {
            const url = await getDownloadURL(itemRef);
            return {
              name: itemRef.name,
              fullPath: itemRef.fullPath,
              ref: itemRef,
              url
            };
          })
        );
        setFotoList(data);
        setFolderExists(true);
      }
    } catch {
      setFotoList([]);
      setFolderExists(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileChange = (file, fileName) => {
    setFileInputs((prev) => ({
      ...prev,
      [fileName]: file
    }));
  };

  const handleReplace = async (fileName) => {
    const file = fileInputs[fileName];
    if (!file) {
      alert("Pilih file terlebih dahulu.");
      return;
    }
    try {
      const fileRef = ref(storage, `Karyawan/${username}/${fileName}`);
      await uploadBytes(fileRef, file);
      alert("Berhasil mengganti file.");
      await fetchFotoList();
      setFileInputs((prev) => ({ ...prev, [fileName]: null }));
    } catch {
      alert("Gagal mengganti file.");
    }
  };

  const handleMultipleChange = (e) => {
    setMultipleFiles([...e.target.files]);
  };

  const handleMultipleUpload = async () => {
    if (multipleFiles.length === 0) {
      alert("Pilih file terlebih dahulu.");
      return;
    }
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
      alert("Berhasil mengunggah file.");
      setMultipleFiles([]);
      await fetchFotoList();
      setUploadProgress(0);
    } catch {
      alert("Gagal mengunggah file.");
      setUploadProgress(0);
    }
  };

  useEffect(() => {
    if (isOpen && username) {
      fetchFotoList();
    }
  }, [isOpen, username]);

  if (!isOpen) return null;

  return (
    <div className="modal show" style={{ display: "block", backgroundColor: "rgba(0,0,0,0.5)" }}>
      <div className="modal-dialog modal-dialog-centered modal-lg">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">
              Atur Foto Wajah<br />
              {username}
            </h5>
          </div>
          <div className="modal-body">
            {isLoading ? (
              <p>Memuat daftar file...</p>
            ) : (
              <>
                {folderExists && fotoList.length > 0 && (
                  <div className="table-responsive">
                    <table className="table table-sm align-middle">
                      <thead>
                        <tr>
                          <th>Nama File</th>
                          <th>Ganti File</th>
                          <th>Aksi</th>
                        </tr>
                      </thead>
                      <tbody>
                        {fotoList.map((foto, index) => (
                          <tr key={index}>
                            <td style={{ wordBreak: "break-all" }}>{foto.name}</td>
                            <td>
                              <input
                                type="file"
                                accept="image/*"
                                className="form-control form-control-sm"
                                onChange={(e) => handleFileChange(e.target.files[0], foto.name)}
                              />
                            </td>
                            <td>
                              <button
                                className="btn btn-sm btn-primary"
                                onClick={() => handleReplace(foto.name)}
                              >
                                Ganti
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                {fotoList.length < 10 && (
                  <>
                    <p>Tambah Foto Wajah (maksimal 10 foto):</p>
                    <div className="mb-3">
                      <input
                        type="file"
                        multiple
                        accept="image/*"
                        className="form-control"
                        onChange={handleMultipleChange}
                      />
                    </div>
                    <div className="d-flex align-items-center gap-2">
                      <button
                        className="btn btn-primary"
                        onClick={handleMultipleUpload}
                        disabled={multipleFiles.length === 0}
                      >
                        Upload Foto
                      </button>
                      {uploadProgress > 0 && uploadProgress < 100 && (
                        <div style={{ width: "100px" }}>
                          <div className="progress">
                            <div
                              className="progress-bar progress-bar-striped progress-bar-animated"
                              role="progressbar"
                              style={{ width: `${uploadProgress}%` }}
                              aria-valuenow={uploadProgress}
                              aria-valuemin="0"
                              aria-valuemax="100"
                            ></div>
                          </div>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </>
            )}
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => setIsOpen(false)}>
              Tutup
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default KaryawanFace;
