import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, getDocs, setDoc, doc } from 'firebase/firestore';

const KehadiranTambah = ({ onClose }) => {
  const [formData, setFormData] = useState({
    namaKaryawan: '',
    tanggalKerja: '',
    waktuKerja: '',
    waktuSelesai: '',
  });
  const [karyawanList, setKaryawanList] = useState([]);
  const [filteredOptions, setFilteredOptions] = useState([]);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [selectedKaryawan, setSelectedKaryawan] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchKaryawan = async () => {
      try {
        const karyawanCollection = collection(db, 'dataKaryawan');
        const karyawanSnapshot = await getDocs(karyawanCollection);
        const data = karyawanSnapshot.docs.map(docSnap => {
          const docData = docSnap.data();
          return {
            id: docSnap.id,
            name: docData.namaKaryawan || docData.nama || docData.name || "Nama tidak tersedia"
          };
        });
        setKaryawanList(data);
        setFilteredOptions(data);
      } catch (err) {
        console.error('Error fetching karyawan: ', err);
      }
    };
    fetchKaryawan();
  }, []);

  const handleSearchNama = (keyword) => {
    setSearchKeyword(keyword);
    setFormData((prev) => ({ ...prev, namaKaryawan: keyword }));
    if (!keyword.trim()) {
      setFilteredOptions(karyawanList);
      setSelectedKaryawan(null);
      return;
    }
    const lower = keyword.toLowerCase();
    const filtered = karyawanList.filter(opt =>
      opt.name.toLowerCase().includes(lower)
    );
    setFilteredOptions(filtered);
    setSelectedKaryawan(null);
  };

  const handlePilihNama = (nama) => {
    setSearchKeyword(nama);
    setFormData((prev) => ({ ...prev, namaKaryawan: nama }));
    const selected = karyawanList.find(opt => opt.name === nama);
    setSelectedKaryawan(selected || null);
    setFilteredOptions([]);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedKaryawan) {
      setError('Silakan pilih nama karyawan dari daftar');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const tanggalDocId = formData.tanggalKerja;
      const kehadiranRef = doc(
        db,
        'dataKaryawan',
        selectedKaryawan.id,
        'Kehadiran',
        tanggalDocId
      );
      await setDoc(kehadiranRef, {
        namaKaryawan: selectedKaryawan.name,
        tanggalKerja: formData.tanggalKerja,
        waktuKerja: formData.waktuKerja,
        waktuSelesai: formData.waktuSelesai,
        statusHadir: false,
        waktuHadir: '',
        waktuTelat: '',
      });

      setFormData({
        namaKaryawan: '',
        tanggalKerja: '',
        waktuKerja: '',
        waktuSelesai: '',
      });
      setSearchKeyword('');
      setSelectedKaryawan(null);
      onClose();
    } catch (err) {
      console.error('Error adding kehadiran: ', err);
      setError('Gagal menambahkan kehadiran');
    }

    setLoading(false);
  };

  return (
    <div className="container">
      <h4 className="mb-3">Tambah Kehadiran</h4>
      {error && <div className="alert alert-danger">{error}</div>}

      {karyawanList.length === 0 ? (
        <div className="alert alert-info">Memuat data karyawan...</div>
      ) : (
        <form onSubmit={handleSubmit}>
          <div className="mb-3 position-relative" style={{ minWidth: 200 }}>
            <label htmlFor="namaKaryawan" className="form-label">Nama Karyawan</label>
            <input
              type="text"
              className="form-control"
              id="namaKaryawan"
              name="namaKaryawan"
              autoComplete="off"
              placeholder="Ketik nama karyawan..."
              value={searchKeyword}
              onChange={(e) => handleSearchNama(e.target.value)}
              required
            />
            {searchKeyword.trim() !== '' && filteredOptions.length > 0 && (
              <ul
                className="list-group position-absolute w-100"
                style={{ zIndex: 1000, top: '100%' }}
              >
                {filteredOptions.slice(0, 5).map((opt) => (
                  <li
                    key={opt.id}
                    className="list-group-item list-group-item-action"
                    onClick={() => handlePilihNama(opt.name)}
                    style={{ cursor: 'pointer' }}
                  >
                    {opt.name}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="mb-3">
            <label htmlFor="tanggalKerja" className="form-label">Tanggal Kerja</label>
            <input
              type="date"
              className="form-control"
              id="tanggalKerja"
              name="tanggalKerja"
              value={formData.tanggalKerja}
              onChange={handleChange}
              required
            />
          </div>

          <div className="mb-3">
            <label htmlFor="waktuKerja" className="form-label">Waktu Mulai Kerja</label>
            <input
              type="time"
              className="form-control"
              id="waktuKerja"
              name="waktuKerja"
              value={formData.waktuKerja}
              onChange={handleChange}
              required
            />
          </div>

          <div className="mb-3">
            <label htmlFor="waktuSelesai" className="form-label">Waktu Selesai Kerja</label>
            <input
              type="time"
              className="form-control"
              id="waktuSelesai"
              name="waktuSelesai"
              value={formData.waktuSelesai}
              onChange={handleChange}
              required
            />
          </div>

          <div className="d-flex justify-content-end gap-2">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Batal
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Menyimpan...' : 'Simpan Kehadiran'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
};

export default KehadiranTambah;
