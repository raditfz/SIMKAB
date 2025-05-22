import React, { useEffect, useState } from 'react';
import { db, auth } from '../firebase';
import { collection, getDocs, doc, getDoc, query, where, deleteDoc } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { onAuthStateChanged } from "firebase/auth";
import dayjs from 'dayjs';
import 'dayjs/locale/id';

dayjs.locale('id');

const ManajerArsipKehadiran = () => {
  const today = dayjs();
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [namaOptions, setNamaOptions] = useState([]);
  const [filteredOptions, setFilteredOptions] = useState([]);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [selectedNama, setSelectedNama] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState(today.format('MM'));
  const [selectedYear, setSelectedYear] = useState(today.format('YYYY'));
  const [arsipList, setArsipList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [selectedDelete, setSelectedDelete] = useState([]);
  const [selectAll, setSelectAll] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (!user) {
        navigate('/login');
        return;
      }
      setLoadingAuth(false);
    });
    return () => unsub();
  }, [navigate]);

  useEffect(() => {
    const fetchNamaKaryawan = async () => {
      try {
        const snapshot = await getDocs(collection(db, 'dataKaryawan'));
        const namaList = snapshot.docs.map(doc => ({
          id: doc.id,
          nama: doc.data().namaKaryawan,
        }));
        setNamaOptions(namaList);
        setFilteredOptions(namaList);
      } catch (err) {}
    };
    fetchNamaKaryawan();
  }, []);

  const handleSearchNama = (keyword) => {
    setSearchKeyword(keyword);
    if (!keyword.trim()) {
      setFilteredOptions(namaOptions);
      return;
    }
    const lower = keyword.toLowerCase();
    const filtered = namaOptions.filter(opt =>
      opt.nama.toLowerCase().includes(lower)
    );
    setFilteredOptions(filtered);
  };

  const handlePilihNama = (nama) => {
    setSelectedNama(nama);
    setSearchKeyword(nama);
    fetchArsipByNama(nama, selectedMonth, selectedYear);
    setFilteredOptions([]);
    setDeleting(false);
    setSelectedDelete([]);
    setSelectAll(false);
  };

  const fetchArsipByNama = async (nama, bulan, tahun) => {
    setLoading(true);
    setDeleting(false);
    setSelectedDelete([]);
    setSelectAll(false);
    try {
      const karyawanSnapshot = await getDocs(collection(db, 'dataKaryawan'));
      const found = karyawanSnapshot.docs.find(doc => {
        const data = doc.data();
        return data.namaKaryawan?.toLowerCase() === nama.toLowerCase().trim();
      });
      if (!found) {
        setArsipList([]);
        setLoading(false);
        return;
      }
      const karyawanId = found.id;
      const arsipRef = collection(db, 'dataKaryawan', karyawanId, 'arsipKehadiran');
      const tanggalAwal = `${tahun}-${bulan}-01`;
      const tanggalAkhir = dayjs(`${tahun}-${bulan}-01`).endOf('month').format('YYYY-MM-DD');
      const q = query(
        arsipRef,
        where("tanggalKerja", ">=", tanggalAwal),
        where("tanggalKerja", "<=", tanggalAkhir)
      );
      const arsipSnapshot = await getDocs(q);
      const arsipData = arsipSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          tanggalKerja: data.tanggalKerja,
          waktuKerja: data.waktuKerja,
          waktuSelesai: data.waktuSelesai,
          statusHadir: data.statusHadir,
          waktuHadir: data.waktuHadir,
          waktuTelat: data.waktuTelat,
          photo: data.photo,
        };
      });
      setArsipList(arsipData);
    } catch (err) {}
    setLoading(false);
  };

  const handleOpenPhotoModal = async (karyawanNama, tanggalKerja) => {
    try {
      const karyawanSnapshot = await getDocs(collection(db, 'dataKaryawan'));
      const found = karyawanSnapshot.docs.find(doc => {
        const data = doc.data();
        return data.namaKaryawan?.toLowerCase() === karyawanNama.toLowerCase().trim();
      });
      if (!found) {
        return;
      }
      const karyawanId = found.id;
      const ref = doc(db, 'dataKaryawan', karyawanId, 'arsipKehadiran', tanggalKerja);
      const snapshot = await getDoc(ref);
      if (snapshot.exists()) {
        const data = snapshot.data();
        if (data.photo) {
          setSelectedPhoto(data.photo);
          setShowPhotoModal(true);
        }
      }
    } catch (err) {}
  };

  const handleClosePhotoModal = () => {
    setShowPhotoModal(false);
    setSelectedPhoto(null);
  };

  const handleDeleteClick = () => {
    setDeleting(!deleting);
    setSelectedDelete([]);
    setSelectAll(false);
  };

  const handleCheckboxChange = (id) => {
    if (selectedDelete.includes(id)) {
      setSelectedDelete(selectedDelete.filter(x => x !== id));
    } else {
      setSelectedDelete([...selectedDelete, id]);
    }
  };

  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedDelete([]);
    } else {
      setSelectedDelete(arsipList.map(item => item.id));
    }
    setSelectAll(!selectAll);
  };

  const handleDeleteSelected = async () => {
    setDeleteLoading(true);
    try {
      const karyawanSnapshot = await getDocs(collection(db, 'dataKaryawan'));
      const found = karyawanSnapshot.docs.find(doc => {
        const data = doc.data();
        return data.namaKaryawan?.toLowerCase() === selectedNama.toLowerCase().trim();
      });
      if (!found) return;
      const karyawanId = found.id;
      await Promise.all(
        selectedDelete.map(async (id) => {
          await deleteDoc(doc(db, 'dataKaryawan', karyawanId, 'arsipKehadiran', id));
        })
      );
      fetchArsipByNama(selectedNama, selectedMonth, selectedYear);
      setDeleting(false);
      setSelectedDelete([]);
      setSelectAll(false);
    } catch (err) {}
    setDeleteLoading(false);
  };

  if (loadingAuth) {
    return (
      <div className="container mt-5 text-center">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
        <p className="mt-2">Memuat halaman...</p>
      </div>
    );
  }

  return (
    <>
      <div className="container my-2 mb-5 py-2 bg-white" style={{ maxWidth: 700, borderRadius: 10, boxShadow: '0 2px 10px rgba(0,0,0,0.03)' }}>
        <h3 className="text-center mb-4 fw-bold mt-2" style={{ fontSize: 'clamp(18px,3vw,26px)' }}>ARSIP KEHADIRAN KARYAWAN</h3>
        <div className="mb-3 text-center d-flex justify-content-center position-relative gap-2 flex-wrap">
          <div style={{ width: '30%', position: 'relative', minWidth: 160, maxWidth: 250 }}>
            <input
              type="text"
              className="form-control"
              placeholder="Ketik nama karyawan..."
              value={searchKeyword}
              onChange={(e) => handleSearchNama(e.target.value)}
              style={{ fontSize: 'clamp(12px,2vw,16px)' }}
            />
            {searchKeyword.trim() !== '' && filteredOptions.length > 0 && (
              <ul
                className="list-group position-absolute w-100"
                style={{ zIndex: 1000, top: '100%', left: 0, fontSize: 'clamp(11px,2vw,15px)' }}
              >
                {filteredOptions.slice(0, 5).map((opt) => (
                  <li
                    key={opt.id}
                    className="list-group-item list-group-item-action"
                    onClick={() => handlePilihNama(opt.nama)}
                    style={{ cursor: 'pointer' }}
                  >
                    {opt.nama}
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div style={{ minWidth: 100, maxWidth: 130 }}>
            <select
              className="form-select"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              style={{ fontSize: 'clamp(12px,2vw,16px)' }}
            >
              {Array.from({ length: 12 }, (_, i) => {
                const month = String(i + 1).padStart(2, '0');
                return (
                  <option key={month} value={month}>
                    {dayjs().month(i).format('MMMM')}
                  </option>
                );
              })}
            </select>
          </div>
          <div style={{ minWidth: 90, maxWidth: 120 }}>
            <select
              className="form-select"
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              style={{ fontSize: 'clamp(12px,2vw,16px)' }}
            >
              {Array.from({ length: 6 }, (_, i) => {
                const year = String(today.year() - 4 + i);
                return (
                  <option key={year} value={year}>{year}</option>
                );
              })}
            </select>
          </div>
          <button
            className="btn btn-primary"
            style={{ fontSize: 'clamp(13px,2vw,17px)', minWidth: 85 }}
            onClick={() => {
              if (selectedNama) {
                fetchArsipByNama(selectedNama, selectedMonth, selectedYear);
              }
            }}
          >
            Tampilkan
          </button>
        </div>
        <div className="d-flex justify-content-center gap-2 mb-3 flex-wrap">
          <button
            className={`btn btn-outline-danger ${deleting ? 'active' : ''}`}
            style={{ fontSize: 'clamp(13px,2vw,17px)', minWidth: 100 }}
            onClick={handleDeleteClick}
            disabled={!selectedNama || arsipList.length === 0}
          >
            {deleting ? 'Batal' : 'Delete'}
          </button>
          {deleting && (
            <button
              className="btn btn-danger"
              style={{ fontSize: 'clamp(13px,2vw,17px)', minWidth: 120 }}
              onClick={handleDeleteSelected}
              disabled={selectedDelete.length === 0 || deleteLoading}
            >
              {deleteLoading ? 'Menghapus...' : `Hapus (${selectedDelete.length})`}
            </button>
          )}
        </div>
        {loading ? (
          <div className="text-center">
            <div className="spinner-border" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
          </div>
        ) : (
          <>
            {selectedNama && (
              <>
                {arsipList.length === 0 ? (
                  <p className="text-muted">Belum ada arsip kehadiran untuk karyawan ini.</p>
                ) : (
                  <div style={{ overflowX: 'auto' }}>
                    <table className="table table-bordered table-hover align-middle" style={{ minWidth: 640, fontSize: 'clamp(12px,2vw,16px)' }}>
                      <thead className="table-dark text-center">
                        <tr>
                          {deleting && (
                            <th style={{ width: 40 }}>
                              <input
                                type="checkbox"
                                checked={selectAll}
                                onChange={handleSelectAll}
                                aria-label="Select all"
                                style={{ width: 18, height: 18 }}
                              />
                            </th>
                          )}
                          <th>TANGGAL</th>
                          <th>JAM</th>
                          <th>STATUS</th>
                          <th>WAKTU HADIR</th>
                          <th style={{ width: '120px' }}>BUKTI</th>
                        </tr>
                      </thead>
                      <tbody>
                        {arsipList.map((item) => (
                          <tr key={item.id}>
                            {deleting && (
                              <td className="text-center">
                                <input
                                  type="checkbox"
                                  checked={selectedDelete.includes(item.id)}
                                  onChange={() => handleCheckboxChange(item.id)}
                                  aria-label={`Select tanggal ${item.tanggalKerja}`}
                                  style={{ width: 18, height: 18 }}
                                />
                              </td>
                            )}
                            <td>{item.tanggalKerja}</td>
                            <td>
                              {item.waktuKerja && item.waktuSelesai
                                ? `${item.waktuKerja} - ${item.waktuSelesai}`
                                : item.waktuKerja || '-'}
                            </td>
                            <td className="text-center">
                              {item.statusHadir ? 'Hadir' : 'Tidak Hadir'}
                            </td>
                            <td>
                              {item.waktuHadir || '-'}
                              {item.statusHadir && item.waktuTelat && (
                                <span className="text-danger ms-2">Telat {item.waktuTelat} mnt</span>
                              )}
                            </td>
                            <td className="text-center">
                              {item.statusHadir && item.photo && (
                                <button
                                  className="btn btn-outline-success btn-sm"
                                  style={{ fontSize: 'clamp(12px,2vw,15px)', minWidth: 80 }}
                                  onClick={() => handleOpenPhotoModal(selectedNama, item.tanggalKerja)}
                                >
                                  ⛶ Bukti
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>
      {showPhotoModal && (
        <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Foto Bukti Kehadiran</h5>
                <button type="button" className="btn-close" onClick={handleClosePhotoModal}></button>
              </div>
              <div className="modal-body text-center">
                {selectedPhoto ? (
                  <img
                    src={`data:image/jpeg;base64,${selectedPhoto}`}
                    alt="Attendance Photo"
                    style={{ maxWidth: '100%', maxHeight: '400px', borderRadius: 8 }}
                  />
                ) : (
                  <p>Tidak ada foto</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
      <style>{`
        @media (max-width: 700px) {
          .container {
            padding: 6vw 1vw !important;
            margin: 0 !important;
            max-width: 100vw !important;
            border-radius: 0 !important;
          }
          table {
            font-size: 13px !important;
          }
          .form-control, .form-select {
            font-size: 14px !important;
          }
          .btn {
            font-size: 14px !important;
            min-width: 70px !important;
          }
        }
      `}</style>
    </>
  );
};

export default ManajerArsipKehadiran;
