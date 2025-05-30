import React, { useState, useEffect } from 'react'
import { db } from '../firebase'
import { collection, getDocs, setDoc, doc, Timestamp } from 'firebase/firestore'

const KehadiranTambah = ({ onClose, onSave }) => {
  const [formData, setFormData] = useState({
    namaKaryawan: '',
    tanggalKerja: '',
    waktuKerja: '',
    workHours: '',
    workMinutes: ''
  })
  const [karyawanList, setKaryawanList] = useState([])
  const [filteredOptions, setFilteredOptions] = useState([])
  const [searchKeyword, setSearchKeyword] = useState('')
  const [selectedKaryawan, setSelectedKaryawan] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    const fetchKaryawan = async () => {
      const snap = await getDocs(collection(db, 'dataKaryawan'))
      const data = snap.docs.map(d => ({
        id: d.id,
        name: d.data().namaKaryawan || 'Nama tidak tersedia'
      }))
      setKaryawanList(data)
      setFilteredOptions(data)
    }
    fetchKaryawan()
  }, [])

  const handleSearchNama = keyword => {
    setSearchKeyword(keyword)
    setFormData(prev => ({ ...prev, namaKaryawan: keyword }))
    if (!keyword.trim()) {
      setFilteredOptions(karyawanList)
      setSelectedKaryawan(null)
      return
    }
    const lower = keyword.toLowerCase()
    setFilteredOptions(
      karyawanList.filter(opt => opt.name.toLowerCase().includes(lower))
    )
    setSelectedKaryawan(null)
  }

  const handlePilihNama = name => {
    setSearchKeyword(name)
    setFormData(prev => ({ ...prev, namaKaryawan: name }))
    const sel = karyawanList.find(opt => opt.name === name) || null
    setSelectedKaryawan(sel)
    setFilteredOptions([])
  }

  const handleChange = e => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async e => {
    e.preventDefault()
    if (!selectedKaryawan) {
      setError('Silakan pilih nama karyawan dari daftar')
      return
    }
    const { tanggalKerja, waktuKerja, workHours, workMinutes } = formData
    if (!tanggalKerja || !waktuKerja || (!workHours && !workMinutes)) {
      setError('Lengkapi semua field sebelum menyimpan')
      return
    }
    setLoading(true)
    setError(null)
    const startDate = new Date(`${tanggalKerja}T${waktuKerja}:00`)
    const totalMin =
      parseInt(workHours || '0', 10) * 60 +
      parseInt(workMinutes || '0', 10)
    const endDate = new Date(startDate.getTime() + totalMin * 60000)
    const ref = doc(
      db,
      'dataKaryawan',
      selectedKaryawan.id,
      'Kehadiran',
      tanggalKerja
    )
    await setDoc(ref, {
      namaKaryawan: selectedKaryawan.name,
      statusHadir: false,
      mulaiKerja: Timestamp.fromDate(startDate),
      selesaiKerja: Timestamp.fromDate(endDate),
      totalJam: totalMin,
      hadir: null,
      pulang: null,
      totalJamKerja: 0,
      lembur: 0,
      waktuTelat: 0,
      tanggalKerja
    })
    setLoading(false)
    onClose()
    onSave()
  }

  const computeFinish = () => {
    const { tanggalKerja, waktuKerja, workHours, workMinutes } = formData
    if (!tanggalKerja || !waktuKerja) return ''
    const h = parseInt(workHours || '0', 10)
    const m = parseInt(workMinutes || '0', 10)
    const start = new Date(`${tanggalKerja}T${waktuKerja}:00`)
    const end = new Date(start.getTime() + (h * 60 + m) * 60000)
    const hh = String(end.getHours()).padStart(2, '0')
    const mm = String(end.getMinutes()).padStart(2, '0')
    return `${hh}:${mm}`
  }

  const finishTime = computeFinish()

  return (
    <div className="container">
      <h4 className="mb-3">Tambah Kehadiran</h4>
      {error && <div className="alert alert-danger">{error}</div>}
      {karyawanList.length === 0 ? (
        <div className="alert alert-info">Memuat data karyawan...</div>
      ) : (
        <form onSubmit={handleSubmit}>
          <div
            className="mb-3 position-relative"
            style={{ minWidth: 200 }}
          >
            <label className="form-label">Nama Karyawan</label>
            <input
              type="text"
              className="form-control"
              placeholder="Ketik nama karyawan..."
              value={searchKeyword}
              onChange={e => handleSearchNama(e.target.value)}
              required
            />
            {searchKeyword.trim() && filteredOptions.length > 0 && (
              <ul
                className="list-group position-absolute w-100"
                style={{ zIndex: 1000, top: '100%' }}
              >
                {filteredOptions.slice(0, 5).map(opt => (
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
            <label className="form-label">Tanggal Kerja</label>
            <input
              type="date"
              className="form-control"
              name="tanggalKerja"
              value={formData.tanggalKerja}
              onChange={handleChange}
              required
            />
          </div>
          <div className="mb-3">
            <label className="form-label">Waktu Mulai Kerja</label>
            <input
              type="time"
              className="form-control"
              name="waktuKerja"
              value={formData.waktuKerja}
              onChange={handleChange}
              required
            />
          </div>
          <div className="mb-3">
            <label className="form-label">Waktu Kerja</label>
            <div className="d-flex gap-2">
              <input
                type="number"
                className="form-control"
                style={{ width: '80px' }}
                name="workHours"
                placeholder="Jam"
                value={formData.workHours}
                onChange={handleChange}
              />
              <input
                type="number"
                className="form-control"
                style={{ width: '80px' }}
                name="workMinutes"
                placeholder="Menit"
                value={formData.workMinutes}
                onChange={handleChange}
              />
            </div>
            {finishTime && (
              <small className="text-muted">
                Waktu selesai: {finishTime}
              </small>
            )}
          </div>
          <div className="d-flex justify-content-end gap-2">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
            >
              Batal
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
            >
              {loading ? 'Menyimpan...' : 'Simpan Kehadiran'}
            </button>
          </div>
        </form>
      )}
    </div>
  )
}

export default KehadiranTambah
