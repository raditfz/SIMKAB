import { useState, useEffect } from "react";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "../firebase";

const KaryawanEdit = ({
  isOpen,
  setIsOpen,
  employee,
  formData,
  setFormData,
  selectedFile,
  setSelectedFile,
  fetchEmployees,
  isUploading,
  setIsUploading,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [emailAkun, setEmailAkun] = useState("");

  useEffect(() => {
    const fetchEmail = async () => {
      if (employee?.username) {
        const akunRef = doc(db, "akunKaryawan", employee.username);
        const akunSnap = await getDoc(akunRef);
        if (akunSnap.exists()) {
          setEmailAkun(akunSnap.data().email || "");
        }
      }
    };

    if (isOpen) {
      setIsEditing(false);
      fetchEmail();
    }
  }, [isOpen, employee]);

  if (!employee) return null;

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    if (name === "email") {
      setEmailAkun(value);
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

    const handleSaveChanges = async () => {
      setIsUploading(true);
      const employeeRef = doc(db, "dataKaryawan", employee.id);
      const akunRef = doc(db, "akunKaryawan", employee.username);

      const updatedData = {
        namaKaryawan: formData.namaKaryawan,
        posisiKaryawan: formData.posisiKaryawan,
        gajiKaryawan: Number(formData.gajiKaryawan),
        alamat: formData.alamat || "", // Tambahkan alamat
      };

      // Foto profil
      if (selectedFile) {
        const storageRef = ref(storage, `fotoKaryawan/${employee.id}`);
        await uploadBytes(storageRef, selectedFile);
        const photoURL = await getDownloadURL(storageRef);
        updatedData.fotoKaryawan = photoURL;
      }

      // Foto KTP
      if (formData.ktpFile) {
        const filePath = `dataKaryawan/${employee.username}/${employee.username}.jpg`;
        const ktpRef = ref(storage, filePath);
        await uploadBytes(ktpRef, formData.ktpFile);
        const ktpURL = await getDownloadURL(ktpRef);
        updatedData.fotoKTP = ktpURL;
      }

      await updateDoc(employeeRef, updatedData);
      await updateDoc(akunRef, { email: emailAkun });

      setIsOpen(false);
      setSelectedFile(null);
      setIsUploading(false);
      fetchEmployees();
    };


    return isOpen ? (
    <div className="modal show" style={{ display: "block", backgroundColor: "rgba(0,0,0,0.5)" }}>
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">{isEditing ? "Edit Karyawan" : "Detail Karyawan"}</h5>
            <button
              type="button"
              className="btn-close"
              onClick={() => {
                setIsOpen(false);
                setSelectedFile(null);
              }}
              disabled={isUploading}
            ></button>
          </div>

          <div className="modal-body">
            <form>
              {/* Email */}
              <div className="mb-2">
                <label className="form-label">Email:</label>
                <input
                  type="email"
                  className="form-control form-control-sm"
                  name="email"
                  value={emailAkun}
                  onChange={handleInputChange}
                  readOnly={!isEditing}
                />
              </div>

              {/* Nama */}
              <div className="mb-2">
                <label className="form-label">Nama:</label>
                <input
                  type="text"
                  className="form-control form-control-sm"
                  name="namaKaryawan"
                  value={formData.namaKaryawan}
                  onChange={handleInputChange}
                  readOnly={!isEditing}
                />
              </div>

              {/* Jabatan */}
              <div className="mb-2">
                <label className="form-label">Jabatan:</label>
                <input
                  type="text"
                  className="form-control form-control-sm"
                  name="posisiKaryawan"
                  value={formData.posisiKaryawan}
                  onChange={handleInputChange}
                  readOnly={!isEditing}
                />
              </div>

              {/* Gaji */}
              <div className="mb-2">
                <label className="form-label">Gaji:</label>
                <input
                  type="number"
                  className="form-control form-control-sm"
                  name="gajiKaryawan"
                  value={formData.gajiKaryawan}
                  onChange={handleInputChange}
                  readOnly={!isEditing}
                />
              </div>

              {/* Alamat */}
              <div className="mb-2">
                <label className="form-label">Alamat:</label>
                <textarea
                  className="form-control form-control-sm"
                  name="alamat"
                  value={formData.alamat || ""}
                  onChange={handleInputChange}
                  readOnly={!isEditing}
                />
              </div>

              {/* Foto Profil */}
              <div className="">
                <label className="form-label">Foto:</label>
                <div className="text-center">
                  <img
                    src={formData.fotoKaryawan}
                    alt="Preview"
                    className="img-thumbnail rounded-circle"
                    style={{ width: "80px", height: "80px", objectFit: "cover" }}
                  />
                </div>
                {isEditing && (
                  <input
                    type="file"
                    className="form-control form-control-sm"
                    accept="image/*"
                    onChange={handleFileChange}
                  />
                )}
              </div>

              {/* Foto KTP */}
              <div className="mb-1">
                <label className="form-label">Foto KTP:</label>

                {/* Preview */}
                {formData.fotoKTP ? (
                  <div className="text-center">
                    <img
                      src={formData.fotoKTP}
                      alt="KTP"
                      className="img-thumbnail"
                      style={{ width: "100%", maxHeight: "240px", objectFit: "cover" }}
                    />
                  </div>
                ) : (
                  !isEditing && (
                    <p className="text-muted fst-italic text-center mb-2">
                      Belum ada foto KTP.
                    </p>
                  )
                )}

                {/* Input upload saat editing */}
                {isEditing && (
                  <input
                    type="file"
                    className="form-control form-control-sm"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files[0];
                      if (file && file.type.startsWith("image/")) {
                        setFormData({ ...formData, ktpFile: file });
                      } else {
                        alert("File harus berupa gambar.");
                      }
                    }}
                  />
                )}
              </div>
            </form>
          </div>

          {/* Footer */}
          <div className="modal-footer">
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => {
                setIsOpen(false);
                setSelectedFile(null);
              }}
              disabled={isUploading}
            >
              Batal
            </button>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => {
                if (isEditing) {
                  handleSaveChanges();
                } else {
                  setIsEditing(true);
                }
              }}
              disabled={isUploading}
            >
              {isUploading ? (
                <>
                  <span
                    className="spinner-border spinner-border-sm me-2"
                    role="status"
                    aria-hidden="true"
                  ></span>
                  Menyimpan...
                </>
              ) : isEditing ? (
                "Simpan"
              ) : (
                "Ubah"
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  ) : null;

};

export default KaryawanEdit;