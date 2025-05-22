import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, getDocs, setDoc, doc } from 'firebase/firestore';
import { startOfMonth, endOfMonth, startOfWeek, addDays, format, isSameMonth, isBefore, isAfter, addMonths, subMonths } from 'date-fns';
import { id } from 'date-fns/locale';

const KehadiranTambahBatch = ({ onClose }) => {
  const [karyawanList, setKaryawanList] = useState([]);
  const [filteredOptions, setFilteredOptions] = useState([]);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [selectedKaryawan, setSelectedKaryawan] = useState(null);
  const [waktuKerja, setWaktuKerja] = useState('');
  const [waktuSelesai, setWaktuSelesai] = useState('');
  const [selectedDates, setSelectedDates] = useState([]);
  const [currentMonth, setCurrentMonth] = useState(new Date());
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
    const selected = karyawanList.find(opt => opt.name === nama);
    setSelectedKaryawan(selected || null);
    setFilteredOptions([]);
  };

  const handleDateToggle = (date) => {
    setSelectedDates((prev) =>
      prev.includes(date)
        ? prev.filter((d) => d !== date)
        : [...prev, date]
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!selectedKaryawan || selectedDates.length === 0) {
      setError('Pastikan nama karyawan dan minimal satu tanggal dipilih.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      for (const tanggal of selectedDates) {
        const kehadiranRef = doc(
          db,
          'dataKaryawan',
          selectedKaryawan.id,
          'Kehadiran',
          tanggal
        );

        await setDoc(kehadiranRef, {
          namaKaryawan: selectedKaryawan.name,
          tanggalKerja: tanggal,
          waktuKerja: waktuKerja,
          waktuSelesai: waktuSelesai,
          statusHadir: false,
          waktuHadir: '',
          waktuTelat: '',
        });
      }

      setSearchKeyword('');
      setSelectedKaryawan(null);
      setWaktuKerja('');
      setWaktuSelesai('');
      setSelectedDates([]);
      onClose();
    } catch (err) {
      console.error('Error adding batch kehadiran: ', err);
      setError('Gagal menambahkan kehadiran.');
    }

    setLoading(false);
  };

  const Calendar = ({ selectedDates, onToggleDate, currentMonth, setCurrentMonth }) => {
    const today = new Date();

    const renderHeader = () => (
      <div className="d-flex justify-content-between align-items-center mb-2">
        <button
          type="button"
          className="btn btn-outline-secondary btn-sm"
          onClick={() => setCurrentMonth(prev => subMonths(prev, 1))}
          disabled={isBeforeMonth(currentMonth, today)}
        >
          &lt;
        </button>
        <strong>{format(currentMonth, 'MMMM yyyy', { locale: id })}</strong>
        <button
          type="button"
          className="btn btn-outline-secondary btn-sm"
          onClick={() => setCurrentMonth(prev => addMonths(prev, 1))}
        >
          &gt;
        </button>
      </div>
    );

    const isBeforeMonth = (date1, date2) => {
      return date1.getFullYear() === date2.getFullYear()
        ? date1.getMonth() < date2.getMonth()
        : date1.getFullYear() < date2.getFullYear();
    };

    const renderDays = () => {
      const days = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];
      return (
        <div className="d-grid mb-1 text-center fw-bold" style={{ gridTemplateColumns: 'repeat(7, 1fr)' }}>
          {days.map((day) => (
            <div key={day}>{day}</div>
          ))}
        </div>
      );
    };

    const renderCells = () => {
      const monthStart = startOfMonth(currentMonth);
      const monthEnd = endOfMonth(currentMonth);
      const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
      const rows = [];
      let days = [];
      let day = startDate;

      while (day <= monthEnd || days.length % 7 !== 0) {
        for (let i = 0; i < 7; i++) {
          const dateStr = format(day, 'yyyy-MM-dd');
          const disabled = !isSameMonth(day, currentMonth) || isBefore(day, today);
          const selected = selectedDates.includes(dateStr);

          days.push(
            <div
              key={dateStr}
              className={`text-center p-2 border rounded ${disabled ? 'bg-light text-muted' : selected ? 'bg-primary text-white' : 'bg-white'}`}
              style={{
                cursor: disabled ? 'default' : 'pointer',
                width: '100%',
                aspectRatio: '1 / 0.5',
                fontSize: '0.9rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              onClick={() => {
                if (!disabled) onToggleDate(dateStr);
              }}
            >
              {format(day, 'd')}
            </div>
          );
          day = addDays(day, 1);
        }

        rows.push(
          <div className="d-grid mb-1" key={day} style={{ gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px' }}>
            {days}
          </div>
        );
        days = [];
      }

      return <div>{rows}</div>;
    };

    return (
      <div className="mb-3">
        <label className="form-label">Pilih Tanggal Kerja</label>
        <div className="border rounded p-3">
          {renderHeader()}
          {renderDays()}
          {renderCells()}
        </div>
      </div>
    );
  };

  return (
    <div className="container">
      <h4 className="mb-3">Tambah Kehadiran Batch</h4>
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

          <Calendar
            selectedDates={selectedDates}
            onToggleDate={handleDateToggle}
            currentMonth={currentMonth}
            setCurrentMonth={setCurrentMonth}
          />

          <div className="mb-3">
            <label htmlFor="waktuKerja" className="form-label">Waktu Mulai Kerja</label>
            <input
              type="time"
              className="form-control"
              id="waktuKerja"
              name="waktuKerja"
              value={waktuKerja}
              onChange={(e) => setWaktuKerja(e.target.value)}
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
              value={waktuSelesai}
              onChange={(e) => setWaktuSelesai(e.target.value)}
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

export default KehadiranTambahBatch;
