import React, { useState, useEffect } from 'react'
import { db } from '../firebase'
import { collection, getDocs, setDoc, doc, Timestamp } from 'firebase/firestore'
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  addDays,
  format,
  isSameMonth,
  isBefore,
  addMonths,
  subMonths
} from 'date-fns'
import { id } from 'date-fns/locale'

const KehadiranTambahBatch = ({ onClose, onSave }) => {
  const [karyawanList, setKaryawanList] = useState([])
  const [filteredOptions, setFilteredOptions] = useState([])
  const [searchKeyword, setSearchKeyword] = useState('')
  const [selectedKaryawan, setSelectedKaryawan] = useState(null)
  const [waktuKerja, setWaktuKerja] = useState('')
  const [workHours, setWorkHours] = useState('')
  const [workMinutes, setWorkMinutes] = useState('')
  const [selectedDates, setSelectedDates] = useState([])
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    ;(async () => {
      const snap = await getDocs(collection(db, 'dataKaryawan'))
      const data = snap.docs.map(d => ({
        id: d.id,
        name: d.data().namaKaryawan
      }))
      setKaryawanList(data)
      setFilteredOptions(data)
    })()
  }, [])

  const handleSearchNama = keyword => {
    setSearchKeyword(keyword)
    if (!keyword.trim()) {
      setFilteredOptions(karyawanList)
      setSelectedKaryawan(null)
      return
    }
    const lower = keyword.toLowerCase()
    setFilteredOptions(
      karyawanList.filter(opt => opt.name.toLowerCase().includes(lower))
    )
  }

  const handlePilihNama = name => {
    setSearchKeyword(name)
    const sel = karyawanList.find(opt => opt.name === name) || null
    setSelectedKaryawan(sel)
    setFilteredOptions([])
  }

  const handleDateToggle = date => {
    setSelectedDates(prev =>
      prev.includes(date) ? prev.filter(d => d !== date) : [...prev, date]
    )
  }

  const computeFinishTime = () => {
    if (!waktuKerja) return ''
    const [h0, m0] = waktuKerja.split(':').map(n => parseInt(n, 10))
    const added = (parseInt(workHours || '0', 10) * 60) + parseInt(workMinutes || '0', 10)
    const total = h0 * 60 + m0 + added
    const fh = Math.floor(total / 60) % 24
    const fm = total % 60
    const hh = String(fh).padStart(2, '0')
    const mm = String(fm).padStart(2, '0')
    return `${hh}:${mm}`
  }

  const finishTime = computeFinishTime()

  const handleSubmit = async e => {
    e.preventDefault()
    if (!selectedKaryawan || selectedDates.length === 0) {
      setError('Pilih karyawan dan setidaknya satu tanggal.')
      return
    }
    if (!waktuKerja || (!workHours && !workMinutes)) {
      setError('Lengkapi Waktu Kerja (jam/menit).')
      return
    }
    setLoading(true)
    setError(null)
    for (const tanggal of selectedDates) {
      const startDate = new Date(`${tanggal}T${waktuKerja}:00`)
      const totalMin =
        parseInt(workHours || '0', 10) * 60 +
        parseInt(workMinutes || '0', 10)
      const endDate = new Date(startDate.getTime() + totalMin * 60000)
      const ref = doc(db, 'dataKaryawan', selectedKaryawan.id, 'Kehadiran', tanggal)
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
        tanggalKerja: tanggal
      })
    }
    setLoading(false)
    onClose()
    onSave()
  }

  const Calendar = ({ selectedDates, onToggleDate, currentMonth, setCurrentMonth }) => {
    const today = new Date()
    const monthStart = startOfMonth(currentMonth)
    const monthEnd = endOfMonth(currentMonth)
    const startDate = startOfWeek(monthStart, { weekStartsOn: 1 })
    const renderHeader = () => (
      <div className="d-flex justify-content-between align-items-center mb-2">
        <button
          type="button"
          className="btn btn-outline-secondary btn-sm"
          onClick={() => setCurrentMonth(prev => subMonths(prev, 1))}
          disabled={isBefore(currentMonth, today)}
        >&lt;</button>
        <strong>{format(currentMonth, 'MMMM yyyy', { locale: id })}</strong>
        <button
          type="button"
          className="btn btn-outline-secondary btn-sm"
          onClick={() => setCurrentMonth(prev => addMonths(prev, 1))}
        >&gt;</button>
      </div>
    )
    const renderDays = () => (
      <div className="d-grid mb-1 text-center fw-bold" style={{ gridTemplateColumns: 'repeat(7,1fr)' }}>
        {['Sen','Sel','Rab','Kam','Jum','Sab','Min'].map(d => <div key={d}>{d}</div>)}
      </div>
    )
    const renderCells = () => {
      let rows = []
      let days = []
      let day = startDate
      while (day <= monthEnd || days.length % 7 !== 0) {
        for (let i = 0; i < 7; i++) {
          const dateStr = format(day, 'yyyy-MM-dd')
          const disabled = !isSameMonth(day, currentMonth) || isBefore(day, today)
          const selected = selectedDates.includes(dateStr)
          days.push(
            <div
              key={dateStr}
              className={`text-center p-2 border rounded ${
                disabled ? 'bg-light text-muted'
                : selected ? 'bg-primary text-white'
                : 'bg-white'
              }`}
              style={{
                cursor: disabled ? 'default' : 'pointer',
                aspectRatio: '1 / 0.5',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.9rem'
              }}
              onClick={() => !disabled && onToggleDate(dateStr)}
            >
              {format(day, 'd')}
            </div>
          )
          day = addDays(day, 1)
        }
        rows.push(
          <div key={day} className="d-grid mb-1" style={{ gridTemplateColumns: 'repeat(7,1fr)', gap: '4px' }}>
            {days}
          </div>
        )
        days = []
      }
      return <>{rows}</>
    }
    return (
      <div className="mb-3">
        <label className="form-label">Pilih Tanggal Kerja</label>
        <div className="border rounded p-3">
          {renderHeader()}
          {renderDays()}
          {renderCells()}
        </div>
      </div>
    )
  }

  return (
    <div className="container">
      <h4 className="mb-3">Tambah Kehadiran Batch</h4>
      {error && <div className="alert alert-danger">{error}</div>}
      <form onSubmit={handleSubmit}>
        <div className="mb-3 position-relative" style={{ minWidth: 200 }}>
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
            <ul className="list-group position-absolute w-100" style={{ zIndex: 1000, top: '100%' }}>
              {filteredOptions.slice(0,5).map(opt => (
                <li
                  key={opt.id}
                  className="list-group-item list-group-item-action"
                  onClick={() => handlePilihNama(opt.name)}
                  style={{ cursor:'pointer' }}
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
          <label className="form-label">Waktu Mulai Kerja</label>
          <input
            type="time"
            className="form-control"
            value={waktuKerja}
            onChange={e => setWaktuKerja(e.target.value)}
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
              placeholder="Jam"
              value={workHours}
              onChange={e => setWorkHours(e.target.value)}
            />
            <input
              type="number"
              className="form-control"
              style={{ width: '80px' }}
              placeholder="Menit"
              value={workMinutes}
              onChange={e => setWorkMinutes(e.target.value)}
            />
          </div>
          {finishTime && (
            <small className="text-muted">
              Waktu selesai: {finishTime}
            </small>
          )}
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
    </div>
  )
}

export default KehadiranTambahBatch