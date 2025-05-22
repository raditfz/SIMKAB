import React, { useState, useEffect } from 'react';
import { db, auth } from '../firebase';
import { collection, getDocs, doc, getDoc, query, where } from 'firebase/firestore';
import KehadiranTambah from '../modal/KehadiranTambah';
import { handleHadir, handleBatalkanHadir } from '../utils/KehadiranHadir';
import { handleHapus } from '../utils/KehadiranHapus';
import KehadiranTambahBatch from '../modal/KehadiranTambahBatch';
import { useNavigate } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import dayjs from 'dayjs';
import 'dayjs/locale/id';

dayjs.locale('id');

function isMobileDevice() {
  if (typeof window === 'undefined') return false;
  return /android|iphone|ipad|ipod|blackberry|windows phone|mobile/i.test(navigator.userAgent);
}

const KehadiranMobileView = ({
  kehadiranList,
  loading,
  handleHadir,
  handleBatalkanHadir,
  handleHapus,
  handleOpenPhotoModal,
  selectedMonth,
  selectedYear,
}) => (
  <div className="container my-3" style={{ width: "100%" }}>
    {loading ? (
      <div className="text-center my-4">
        <div className="spinner-border" role="status"></div>
        <p className="mt-2">Memuat data...</p>
      </div>
    ) : (
      <div className="d-flex flex-column gap-3" style={{ marginBottom: "100px" }}>
        {kehadiranList.length === 0 ? (
          <div className="text-center text-muted mt-5">
            Tidak ada jadwal kehadiran bulan {dayjs().month(Number(selectedMonth)-1).format('MMMM')} {selectedYear}
          </div>
        ) : kehadiranList.map(item => (
          <div key={item.id} className="card p-3 shadow-sm">
            <div className="d-flex align-items-center gap-3 mb-2">
              <div className="rounded-circle bg-secondary d-flex justify-content-center align-items-center" style={{ width: "44px", height: "44px" }}>
                <span className="text-white fw-bold" style={{ fontSize: 18 }}>{item.karyawanNama?.[0]?.toUpperCase() || "?"}</span>
              </div>
              <div style={{ minWidth: 0 }}>
                <h6 className="mb-0 text-uppercase text-truncate" style={{ maxWidth: "170px" }}>{item.karyawanNama}</h6>
                <span className="mb-0 text-muted small">{item.tanggalKerja}</span>
                <div className="mb-0 text-muted small">
                  Jam: {item.waktuKerja && item.waktuSelesai
                    ? `${item.waktuKerja} - ${item.waktuSelesai}`
                    : item.waktuKerja || "-"}
                </div>
              </div>
            </div>
            <div className="d-flex justify-content-between align-items-center mt-1">
              <span className={item.statusHadir ? "badge bg-success" : "badge bg-danger"}>
                {item.statusHadir ? "Hadir" : "Tidak Hadir"}
              </span>
              <div className="d-flex gap-1 flex-wrap">
                {item.statusHadir ? (
                  <button className="btn btn-outline-danger btn-sm" onClick={() => handleBatalkanHadir(item.karyawanId, item.tanggalKerja, item.karyawanNama)}>
                    ↻ Batal
                  </button>
                ) : (
                  <button className="btn btn-outline-success btn-sm" onClick={() => handleHadir(item.karyawanId, item.tanggalKerja, item.waktuKerja, item.karyawanNama)}>
                    ✓ Hadir
                  </button>
                )}
                <button className="btn btn-outline-dark btn-sm" onClick={() => handleHapus(item.karyawanId, item.tanggalKerja, item.karyawanNama)}>
                  ⨉
                </button>
                {item.statusHadir && (
                  <button className="btn btn-outline-success btn-sm" onClick={() => handleOpenPhotoModal(item.karyawanId, item.tanggalKerja)}>
                    ⛶ Bukti
                  </button>
                )}
              </div>
            </div>
            <div className="mt-1 small text-muted">
              {item.statusHadir && item.waktuHadir && (
                <>Waktu Hadir: <span className="fw-semibold">{item.waktuHadir}</span></>
              )}
            </div>
          </div>
        ))}
      </div>
    )}
  </div>
);

const KehadiranDesktopView = ({
  kehadiranList,
  loading,
  handleHadir,
  handleBatalkanHadir,
  handleHapus,
  handleOpenPhotoModal,
  selectedMonth,
  selectedYear,
}) => (
  <>
    {loading ? (
      <div className="text-center">
        <div className="spinner-border" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    ) : (
      <div className="table-responsive">
        <table className="table table-bordered table-hover align-middle">
          <thead className="table-dark text-center">
            <tr>
              <th>NAMA</th>
              <th>TANGGAL</th>
              <th>JAM</th>
              <th>STATUS</th>
              <th style={{ width: '250px' }}>WAKTU HADIR</th>
              <th style={{ width: '18%' }}>AKSI</th>
            </tr>
          </thead>
          <tbody>
            {kehadiranList.length === 0 ? (
              <tr>
                <td colSpan="6" className="text-center text-muted py-4">
                  Tidak ada jadwal kehadiran bulan {dayjs().month(Number(selectedMonth)-1).format('MMMM')} {selectedYear}
                </td>
              </tr>
            ) : kehadiranList.map((item) => (
              <tr
                key={item.id}
                style={{ backgroundColor: item.statusHadir ? '#e0f7e9' : '#f7f7f7' }}
              >
                <td className="text-uppercase fw-bold">{item.karyawanNama}</td>
                <td>{item.tanggalKerja}</td>
                <td>
                  {item.waktuKerja && item.waktuSelesai
                    ? `${item.waktuKerja} - ${item.waktuSelesai}`
                    : item.waktuKerja || '-'}
                </td>
                <td>{item.statusHadir ? 'Hadir' : 'Tidak Hadir'}</td>
                <td>
                  <div className="d-flex align-items-center flex-wrap gap-2">
                    <span>
                      {item.waktuHadir || '-'}
                      {item.statusHadir && item.waktuTelat && (
                        <span className="text-danger ms-2">Telat {item.waktuTelat} menit</span>
                      )}
                    </span>
                    {item.statusHadir && (
                      <button
                        className="btn btn-outline-success btn-sm"
                        onClick={() => handleOpenPhotoModal(item.karyawanId, item.tanggalKerja)}
                      >
                        ⛶ Bukti
                      </button>
                    )}
                  </div>
                </td>
                <td>
                  <div className="d-flex gap-1 flex-wrap justify-content-center">
                    {item.statusHadir ? (
                      <button
                        className="btn btn-danger btn-sm"
                        onClick={() =>
                          handleBatalkanHadir(item.karyawanId, item.tanggalKerja, item.karyawanNama)
                        }
                      >
                        ↻ Batal
                      </button>
                    ) : (
                      <button
                        className="btn btn-success btn-sm"
                        onClick={() =>
                          handleHadir(
                            item.karyawanId,
                            item.tanggalKerja,
                            item.waktuKerja,
                            item.karyawanNama
                          )
                        }
                      >
                        ✓ Hadir
                      </button>
                    )}
                    <button
                      className="btn btn-dark btn-sm"
                      onClick={() =>
                        handleHapus(item.karyawanId, item.tanggalKerja, item.karyawanNama)
                      }
                    >
                      ⨉ Hapus
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )}
  </>
);

const ManajerKehadiran = () => {
  const today = dayjs();
  const [kehadiranList, setKehadiranList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [namaOptions, setNamaOptions] = useState([]);
  const [filteredOptions, setFilteredOptions] = useState([]);
  const [selectedNama, setSelectedNama] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState(today.format('MM'));
  const [selectedYear, setSelectedYear] = useState(today.format('YYYY'));
  const [loadingAuth, setLoadingAuth] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
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
    fetchKehadiranByNama(nama, selectedMonth, selectedYear);
    setFilteredOptions([]);
  };

  const fetchKehadiranByNama = async (nama, bulan, tahun) => {
    setLoading(true);
    try {
      const karyawanSnapshot = await getDocs(collection(db, 'dataKaryawan'));
      const found = karyawanSnapshot.docs.find(doc => {
        const data = doc.data();
        return data.namaKaryawan?.toLowerCase() === nama.toLowerCase().trim();
      });
      if (!found) {
        setKehadiranList([]);
        setLoading(false);
        return;
      }
      const karyawanId = found.id;
      const namaKaryawan = found.data().namaKaryawan;
      const kehadiranRef = collection(db, 'dataKaryawan', karyawanId, 'Kehadiran');
      const tanggalAwal = `${tahun}-${bulan}-01`;
      const tanggalAkhir = dayjs(`${tahun}-${bulan}-01`).endOf('month').format('YYYY-MM-DD');
      const q = query(
        kehadiranRef,
        where("tanggalKerja", ">=", tanggalAwal),
        where("tanggalKerja", "<=", tanggalAkhir)
      );
      const kehadiranSnapshot = await getDocs(q);
      const kehadiranData = kehadiranSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: `${karyawanId}_${doc.id}`,
          docId: doc.id,
          karyawanId,
          karyawanNama: namaKaryawan,
          tanggalKerja: data.tanggalKerja,
          waktuKerja: data.waktuKerja,
          waktuSelesai: data.waktuSelesai,
          statusHadir: data.statusHadir,
          waktuHadir: data.waktuHadir,
          waktuTelat: data.waktuTelat,
        };
      });
      setKehadiranList(kehadiranData);
    } catch (err) {}
    setLoading(false);
  };

  const handleOpenModal = () => setShowModal(true);
  const handleCloseModal = () => setShowModal(false);
  const handleOpenBatchModal = () => setShowBatchModal(true);
  const handleCloseBatchModal = () => setShowBatchModal(false);

  const handleOpenPhotoModal = async (karyawanId, tanggalKerja) => {
    try {
      const ref = doc(db, 'dataKaryawan', karyawanId, 'Kehadiran', tanggalKerja);
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
      <div className="container my-2 mb-5 py-2 bg-white">
        <h3 className="text-center mb-4 fw-bold mt-2">DAFTAR KEHADIRAN KARYAWAN</h3>
        <div className="text-center mb-4 d-flex justify-content-center gap-2 flex-wrap">
          <button className="btn btn-success" onClick={handleOpenModal}>
            + Tambah Jadwal
          </button>
          <button className="btn btn-success" onClick={handleOpenBatchModal}>
            + Jadwal Batch
          </button>
        </div>
        <div className="mb-3 text-center d-flex justify-content-center position-relative gap-2 flex-wrap">
          <div style={{ width: '30%', position: 'relative', minWidth: 200 }}>
            <input
              type="text"
              className="form-control"
              placeholder="Ketik nama karyawan..."
              value={searchKeyword}
              onChange={(e) => handleSearchNama(e.target.value)}
            />
            {searchKeyword.trim() !== '' && filteredOptions.length > 0 && (
              <ul
                className="list-group position-absolute w-100"
                style={{ zIndex: 1000, top: '100%', left: 0 }}
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
          <div style={{ minWidth: 120 }}>
            <select
              className="form-select"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
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
          <div style={{ minWidth: 100 }}>
            <select
              className="form-select"
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
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
            onClick={() => {
              if (selectedNama) {
                fetchKehadiranByNama(selectedNama, selectedMonth, selectedYear);
              }
            }}
          >
            Tampilkan
          </button>
        </div>
        {isMobileDevice() ? (
          <KehadiranMobileView
            kehadiranList={kehadiranList}
            loading={loading}
            handleHadir={handleHadir}
            handleBatalkanHadir={handleBatalkanHadir}
            handleHapus={handleHapus}
            handleOpenPhotoModal={handleOpenPhotoModal}
            selectedMonth={selectedMonth}
            selectedYear={selectedYear}
          />
        ) : (
          <KehadiranDesktopView
            kehadiranList={kehadiranList}
            loading={loading}
            handleHadir={handleHadir}
            handleBatalkanHadir={handleBatalkanHadir}
            handleHapus={handleHapus}
            handleOpenPhotoModal={handleOpenPhotoModal}
            selectedMonth={selectedMonth}
            selectedYear={selectedYear}
          />
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
                    style={{ maxWidth: '100%', maxHeight: '400px' }}
                  />
                ) : (
                  <p>Tidak ada foto</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
      {showModal && (
        <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-lg modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-body p-4">
                <KehadiranTambah onClose={handleCloseModal} />
              </div>
            </div>
          </div>
        </div>
      )}
      {showBatchModal && (
        <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-lg modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-body p-4">
                <KehadiranTambahBatch onClose={handleCloseBatchModal} />
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ManajerKehadiran;
