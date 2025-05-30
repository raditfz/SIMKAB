import React, { useState, useEffect } from 'react'
import { db } from '../firebase'
import {
  collection,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
  setDoc,
  getDoc,
  query,
  where,
  Timestamp
} from 'firebase/firestore'
import KehadiranTambah from '../modal/KehadiranTambah'
import KehadiranTambahBatch from '../modal/KehadiranTambahBatch'
import dayjs from 'dayjs'
import 'dayjs/locale/id'

dayjs.locale('id')

const monthNames = [
  'Januari','Februari','Maret','April','Mei','Juni',
  'Juli','Agustus','September','Oktober','November','Desember'
]

function isMobileDevice() {
  if (typeof window === 'undefined') return false
  return /android|iphone|ipad|ipod|blackberry|windows phone|mobile/i.test(navigator.userAgent)
}

const formatWorkTime = minutes => {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return h > 0
    ? `${h} Jam ${m}m (${minutes}m)`
    : `${m}m (${minutes}m)`
}

const ManajerKehadiran = () => {
  const today = dayjs()
  const [kehadiranList, setKehadiranList] = useState([])
  const [loading, setLoading] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [showBatchModal, setShowBatchModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editData, setEditData] = useState(null)
  const [searchKeyword, setSearchKeyword] = useState('')
  const [filteredOptions, setFilteredOptions] = useState([])
  const [namaOptions, setNamaOptions] = useState([])
  const [selectedNama, setSelectedNama] = useState('')
  const [selectedMonth, setSelectedMonth] = useState(today.month() + 1)
  const [selectedYear, setSelectedYear] = useState(today.year())
  const [showImageModal, setShowImageModal] = useState(false)
  const [imageSrc, setImageSrc] = useState('')
  const [imageTitle, setImageTitle] = useState('')
  const [deleteMode, setDeleteMode] = useState(false)
  const [checkedIds, setCheckedIds] = useState({})

  useEffect(() => {
    ;(async () => {
      const snap = await getDocs(collection(db, 'dataKaryawan'))
      setNamaOptions(snap.docs.map(d => d.data().namaKaryawan))
    })()
  }, [])

  const fetchTable = async () => {
    if (!selectedNama) return
    setLoading(true)
    const all = await getDocs(collection(db, 'dataKaryawan'))
    const found = all.docs.find(
      d => d.data().namaKaryawan.toLowerCase() === selectedNama.toLowerCase().trim()
    )
    if (!found) {
      setKehadiranList([])
      setLoading(false)
      return
    }
    const karyawanId = found.id
    const m = String(selectedMonth).padStart(2, '0')
    const start = `${selectedYear}-${m}-01`
    const end = `${selectedYear}-${m}-${dayjs(start).daysInMonth()}`
    const q = query(
      collection(db, 'dataKaryawan', karyawanId, 'Kehadiran'),
      where('tanggalKerja', '>=', start),
      where('tanggalKerja', '<=', end)
    )
    const snap = await getDocs(q)
    const data = snap.docs.map(d => {
      const dt = d.data()
      const mulai = dt.mulaiKerja?.toDate()
      const selesai = dt.selesaiKerja?.toDate()
      const hadir = dt.hadir?.toDate()
      const pulang = dt.pulang?.toDate()
      const totalJamKerja =
        dt.totalJamKerja ?? (hadir && pulang ? Math.ceil((pulang - hadir) / 60000) : 0)
      const waktuTelat =
        dt.waktuTelat ?? (hadir && hadir > mulai ? Math.ceil((hadir - mulai) / 60000) : 0)
      const lembur =
        dt.lembur ?? Math.max(0, totalJamKerja - Math.ceil((selesai - mulai) / 60000))
      return {
        id: d.id,
        karyawanId,
        namaKaryawan: found.data().namaKaryawan,
        tanggalKerja: dt.tanggalKerja,
        mulaiKerja: mulai,
        selesaiKerja: selesai,
        hadir,
        pulang,
        statusHadir: dt.statusHadir,
        totalJamKerja,
        waktuTelat,
        lembur,
        fotoHadir: dt.fotoHadir || null,
        fotoPulang: dt.fotoPulang || null
      }
    })
    setKehadiranList(data)
    setCheckedIds({})
    setLoading(false)
  }

  const handleSearchNama = val => {
    setSearchKeyword(val)
    setFilteredOptions(
      namaOptions.filter(n =>
        n.toLowerCase().includes(val.toLowerCase())
      )
    )
  }

  const onPilihNama = nama => {
    setSelectedNama(nama)
    setSearchKeyword(nama)
    setFilteredOptions([])
  }

  const onHadir = async item => {
    const ref = doc(
      db,
      'dataKaryawan',
      item.karyawanId,
      'Kehadiran',
      item.tanggalKerja
    )
    const now = new Date()
    await updateDoc(ref, {
      hadir: Timestamp.fromDate(now),
      statusHadir: true,
      waktuTelat: Math.max(
        0,
        Math.ceil((now - item.mulaiKerja) / 60000)
      )
    })
    fetchTable()
  }

  const onPulang = async item => {
    const ref = doc(
      db,
      'dataKaryawan',
      item.karyawanId,
      'Kehadiran',
      item.tanggalKerja
    )
    const now = new Date()
    const kerja = Math.ceil((now - item.hadir) / 60000)
    const scheduled = Math.ceil(
      (item.selesaiKerja - item.mulaiKerja) / 60000
    )
    const lembur = Math.max(0, kerja - scheduled)
    await updateDoc(ref, {
      pulang: Timestamp.fromDate(now),
      totalJamKerja: kerja,
      lembur
    })
    fetchTable()
  }

  const openEditModal = item => {
    const selisih = item.selesaiKerja && item.mulaiKerja ? (item.selesaiKerja - item.mulaiKerja) : 0
    const jam = Math.floor(selisih / (1000 * 60 * 60))
    const menit = Math.floor((selisih / (1000 * 60)) % 60)
    setEditData({
      ...item,
      mulaiKerjaInput: dayjs(item.mulaiKerja).format('HH:mm'),
      totalJamInput: jam,
      totalMenitInput: menit,
      selesaiKerjaPreview: item.selesaiKerja ? dayjs(item.selesaiKerja).format('YYYY-MM-DD HH:mm') : '',
      hadirInput: item.hadir ? dayjs(item.hadir).format('HH:mm') : '',
      pulangInput: item.pulang ? dayjs(item.pulang).format('HH:mm') : '',
      statusHadir: !!item.statusHadir
    })
    setShowEditModal(true)
  }

  const handleEditChange = e => {
    const { name, value, type, checked } = e.target
    setEditData(prev => {
      let next = { ...prev, [name]: type === 'checkbox' ? checked : value }
      if (['mulaiKerjaInput', 'totalJamInput', 'totalMenitInput'].includes(name)) {
        const jam = parseInt(name === 'totalJamInput' ? value : prev.totalJamInput || 0, 10)
        const menit = parseInt(name === 'totalMenitInput' ? value : prev.totalMenitInput || 0, 10)
        const mulai = prev.mulaiKerjaInput || ''
        const tgl = prev.tanggalKerja || ''
        if (tgl && mulai) {
          const start = dayjs(`${tgl}T${name === 'mulaiKerjaInput' ? value : mulai}`)
          const end = start.add(jam, 'hour').add(menit, 'minute')
          next.selesaiKerjaPreview = end.format('YYYY-MM-DD HH:mm')
        }
      }
      return next
    })
  }

  const handleEditSubmit = async e => {
    e.preventDefault()
    const ref = doc(
      db,
      'dataKaryawan',
      editData.karyawanId,
      'Kehadiran',
      editData.tanggalKerja
    )
    const tanggalKerja = editData.tanggalKerja
    const baseDate = dayjs(`${tanggalKerja}T${editData.mulaiKerjaInput}`)
    const jam = parseInt(editData.totalJamInput || 0, 10)
    const menit = parseInt(editData.totalMenitInput || 0, 10)
    const selesaiKerja = baseDate.add(jam, 'hour').add(menit, 'minute')
    const combineTime = (t) => {
      if (!t) return null
      const [h, m] = t.split(':')
      return Timestamp.fromDate(
        baseDate.hour(h).minute(m).second(0).toDate()
      )
    }
    await updateDoc(ref, {
      mulaiKerja: Timestamp.fromDate(baseDate.toDate()),
      selesaiKerja: Timestamp.fromDate(selesaiKerja.toDate()),
      hadir: editData.hadirInput ? combineTime(editData.hadirInput) : null,
      pulang: editData.pulangInput ? combineTime(editData.pulangInput) : null,
      statusHadir: !!editData.statusHadir,
      totalJamKerja: jam * 60 + menit,
      waktuTelat: Number(editData.waktuTelat) || 0,
      lembur: Number(editData.lembur) || 0
    })
    setShowEditModal(false)
    setEditData(null)
    fetchTable()
  }

  const handleCheck = (id) => {
    setCheckedIds(prev => ({
      ...prev,
      [id]: !prev[id]
    }))
  }

  const handleCheckAll = e => {
    const checked = e.target.checked
    const newChecked = {}
    if (checked) {
      kehadiranList.forEach(item => { newChecked[item.id] = true })
    }
    setCheckedIds(newChecked)
  }

  const handleBatchDelete = async () => {
    const toDelete = kehadiranList.filter(item => checkedIds[item.id])
    for (const item of toDelete) {
      const srcRef = doc(db, 'dataKaryawan', item.karyawanId, 'Kehadiran', item.tanggalKerja)
      const destRef = doc(db, 'dataKaryawan', item.karyawanId, 'arsipKehadiran', item.tanggalKerja)
      const snapshot = await getDoc(srcRef)
      if (snapshot.exists()) {
        const data = snapshot.data()
        await setDoc(destRef, data)
        await deleteDoc(srcRef)
      }
    }
    setDeleteMode(false)
    setCheckedIds({})
    fetchTable()
  }

  if (loading)
    return (
      <div className="container mt-5 text-center">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
        <p className="mt-2">Memuat...</p>
      </div>
    )

  return (
    <>
      <div className="container my-3 py-2 bg-white">
        <h3 className="text-center mb-4">DAFTAR KEHADIRAN KARYAWAN</h3>
        <div className="d-flex justify-content-center gap-2 mb-3">
          <button className="btn btn-success" onClick={() => setShowModal(true)}>
            Tambah Jadwal
          </button>
          <button className="btn btn-success" onClick={() => setShowBatchModal(true)}>
            Jadwal Batch
          </button>
          <button
            className={deleteMode ? 'btn btn-secondary' : 'btn btn-danger'}
            onClick={() => {
              setDeleteMode(!deleteMode)
              setCheckedIds({})
            }}
            style={{marginLeft: 6}}
          >
            {deleteMode ? 'Batal Hapus' : 'Hapus'}
          </button>
          {deleteMode && (
            <button
              className="btn btn-danger"
              style={{marginLeft: 6}}
              disabled={Object.values(checkedIds).filter(v => v).length === 0}
              onClick={handleBatchDelete}
            >
              Hapus Terpilih
            </button>
          )}
        </div>
        <div className="d-flex justify-content-center align-items-end gap-2 mb-4 flex-wrap">
          <div className="position-relative" style={{ minWidth: 250 }}>
            <input
              type="text"
              className="form-control"
              placeholder="Cari nama karyawan..."
              value={searchKeyword}
              onChange={e => handleSearchNama(e.target.value)}
            />
            {searchKeyword && filteredOptions.length > 0 && (
              <ul className="list-group position-absolute w-100" style={{ zIndex: 1055, top: '100%' }}>
                {filteredOptions.slice(0, 5).map(opt => (
                  <li
                    key={opt}
                    className="list-group-item"
                    onClick={() => onPilihNama(opt)}
                    style={{ cursor: 'pointer' }}
                  >
                    {opt}
                  </li>
                ))}
              </ul>
            )}
          </div>
          <select
            className="form-select"
            style={{ width: 150 }}
            value={selectedMonth}
            onChange={e => setSelectedMonth(Number(e.target.value))}
          >
            {monthNames.map((name, i) => (
              <option key={i} value={i + 1}>{name}</option>
            ))}
          </select>
          <select
            className="form-select"
            style={{ width: 100 }}
            value={selectedYear}
            onChange={e => setSelectedYear(Number(e.target.value))}
          >
            {Array.from({ length: 5 }, (_, i) => today.year() - 2 + i).map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
          <button className="btn btn-primary" onClick={fetchTable}>Tampilkan</button>
        </div>

        {!isMobileDevice() && (
          <div className="table-responsive">
            <table className="table table-striped table-bordered text-center">
              <thead className="table-dark">
                <tr>
                  {deleteMode && (
                    <th style={{width: 30}}>
                      <input
                        type="checkbox"
                        checked={Object.keys(checkedIds).length === kehadiranList.length && kehadiranList.length > 0}
                        onChange={handleCheckAll}
                      />
                    </th>
                  )}
                  <th>NAMA</th>
                  <th>TANGGAL KERJA</th>
                  <th>JAM KERJA</th>
                  <th>HADIR</th>
                  <th>PULANG</th>
                  <th>TOTAL JAM KERJA</th>
                  <th>LEMBUR</th>
                  <th>TELAT</th>
                  <th>AKSI</th>
                </tr>
              </thead>
              <tbody>
                {kehadiranList.map(item => (
                  <tr key={item.id}>
                    {deleteMode && (
                      <td>
                        <input
                          type="checkbox"
                          checked={!!checkedIds[item.id]}
                          onChange={() => handleCheck(item.id)}
                        />
                      </td>
                    )}
                    <td>{item.namaKaryawan}</td>
                    <td>{item.tanggalKerja}</td>
                    <td>
                      {dayjs(item.mulaiKerja).format('HH:mm')} - {dayjs(item.selesaiKerja).format('HH:mm')}
                    </td>
                    <td>
                      {item.hadir
                        ? dayjs(item.hadir).format('HH:mm')
                        : '-'}
                      {item.fotoHadir && (
                        <button
                          className="btn btn-sm btn-light ms-1"
                          onClick={() => {
                            setImageSrc(item.fotoHadir)
                            setImageTitle('Foto Hadir')
                            setShowImageModal(true)
                          }}
                        >⛶</button>
                      )}
                    </td>
                    <td>
                      {item.pulang
                        ? dayjs(item.pulang).format('HH:mm')
                        : '-'}
                      {item.fotoPulang && (
                        <button
                          className="btn btn-sm btn-light ms-1"
                          onClick={() => {
                            setImageSrc(item.fotoPulang)
                            setImageTitle('Foto Pulang')
                            setShowImageModal(true)
                          }}
                        >⛶</button>
                      )}
                    </td>
                    <td>{formatWorkTime(item.totalJamKerja)}</td>
                    <td>{item.lembur}m</td>
                    <td>{item.waktuTelat}m</td>
                    <td>
                      {!deleteMode && (
                        <>
                          {!item.statusHadir && (
                            <button className="btn btn-success btn-sm" onClick={() => onHadir(item)}>Hadir</button>
                          )}
                          {item.statusHadir && !item.pulang && (
                            <button className="btn btn-warning btn-sm ms-1" onClick={() => onPulang(item)}>Pulang</button>
                          )}
                          <button className="btn btn-info btn-sm ms-1" onClick={() => openEditModal(item)}>Edit</button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {isMobileDevice() &&
          kehadiranList.map(item => (
            <div key={item.id} className="card p-3 shadow-sm mb-3">
              <div className="d-flex align-items-center">
                {deleteMode && (
                  <input
                    type="checkbox"
                    className="me-2"
                    checked={!!checkedIds[item.id]}
                    onChange={() => handleCheck(item.id)}
                  />
                )}
                <h5 className="mb-0">{item.namaKaryawan}</h5>
              </div>
              <p>Tanggal: {item.tanggalKerja}</p>
              <p>
                Jadwal: {dayjs(item.mulaiKerja).format('HH:mm')} - {dayjs(item.selesaiKerja).format('HH:mm')}
              </p>
              <div className="small text-muted">
                {item.hadir && (
                  <>Hadir: {dayjs(item.hadir).format('HH:mm')}
                    {item.fotoHadir && (
                      <button
                        className="btn btn-sm btn-light ms-1"
                        onClick={() => {
                          setImageSrc(item.fotoHadir)
                          setImageTitle('Foto Hadir')
                          setShowImageModal(true)
                        }}
                      >⛶</button>
                    )}{' '}
                  </>
                )}
                {item.pulang && (
                  <>Pulang: {dayjs(item.pulang).format('HH:mm')}
                    {item.fotoPulang && (
                      <button
                        className="btn btn-sm btn-light ms-1"
                        onClick={() => {
                          setImageSrc(item.fotoPulang)
                          setImageTitle('Foto Pulang')
                          setShowImageModal(true)
                        }}
                      >⛶</button>
                    )}
                  </>
                )}
              </div>
              <div className="mt-2 d-flex gap-2">
                {!deleteMode && (
                  <>
                    {!item.statusHadir && (
                      <button className="btn btn-success btn-sm" onClick={() => onHadir(item)}>Hadir</button>
                    )}
                    {item.statusHadir && !item.pulang && (
                      <button className="btn btn-warning btn-sm" onClick={() => onPulang(item)}>Pulang</button>
                    )}
                    <button className="btn btn-info btn-sm" onClick={() => openEditModal(item)}>Edit</button>
                  </>
                )}
              </div>
            </div>
          ))}
      </div>

      {showModal && (
        <>
          <div className="modal-backdrop fade show" style={{ zIndex: 1050 }} />
          <div className="modal fade show" style={{ display: 'block', zIndex: 1060 }} tabIndex="-1" role="dialog">
            <div className="modal-dialog" role="document">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title">Tambah Kehadiran</h5>
                  <button type="button" className="btn-close" onClick={() => setShowModal(false)} />
                </div>
                <div className="modal-body">
                  <KehadiranTambah onClose={() => setShowModal(false)} onSave={fetchTable} />
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {showBatchModal && (
        <>
          <div className="modal-backdrop fade show" style={{ zIndex: 1050 }} />
          <div className="modal fade show" style={{ display: 'block', zIndex: 1060 }} tabIndex="-1" role="dialog">
            <div className="modal-dialog modal-lg" role="document">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title">Tambah Kehadiran Batch</h5>
                  <button type="button" className="btn-close" onClick={() => setShowBatchModal(false)} />
                </div>
                <div className="modal-body">
                  <KehadiranTambahBatch onClose={() => setShowBatchModal(false)} onSave={fetchTable} />
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {showEditModal && editData && (
        <>
          <div className="modal-backdrop fade show" style={{ zIndex: 1050 }} />
          <div className="modal fade show" style={{ display: 'block', zIndex: 1060 }} tabIndex="-1" role="dialog">
            <div className="modal-dialog" role="document">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title">Edit Kehadiran</h5>
                  <button type="button" className="btn-close" onClick={() => setShowEditModal(false)} />
                </div>
                <div className="modal-body">
                  <form onSubmit={handleEditSubmit}>
                    <div className="mb-2">
                      <label className="form-label">Nama Karyawan</label>
                      <input className="form-control" value={editData.namaKaryawan} disabled />
                    </div>
                    <div className="mb-2">
                      <label className="form-label">Tanggal Kerja</label>
                      <input className="form-control" value={editData.tanggalKerja} disabled />
                    </div>
                    <div className="mb-2">
                      <label className="form-label">Mulai Kerja</label>
                      <input
                        type="time"
                        className="form-control"
                        name="mulaiKerjaInput"
                        value={editData.mulaiKerjaInput}
                        onChange={handleEditChange}
                        required
                      />
                    </div>
                    <div className="mb-2">
                      <label className="form-label">Total Jam Kerja</label>
                      <div className="d-flex gap-2">
                        <input
                          type="number"
                          className="form-control"
                          style={{ width: '80px' }}
                          name="totalJamInput"
                          placeholder="Jam"
                          value={editData.totalJamInput || ''}
                          onChange={handleEditChange}
                        />
                        <input
                          type="number"
                          className="form-control"
                          style={{ width: '80px' }}
                          name="totalMenitInput"
                          placeholder="Menit"
                          value={editData.totalMenitInput || ''}
                          onChange={handleEditChange}
                        />
                      </div>
                      {editData.selesaiKerjaPreview && (
                        <small className="text-muted">Waktu selesai: {editData.selesaiKerjaPreview}</small>
                      )}
                    </div>
                    <div className="mb-2">
                      <label className="form-label">Jam Hadir (opsional)</label>
                      <input
                        type="time"
                        className="form-control"
                        name="hadirInput"
                        value={editData.hadirInput}
                        onChange={handleEditChange}
                      />
                    </div>
                    <div className="mb-2">
                      <label className="form-label">Jam Pulang (opsional)</label>
                      <input
                        type="time"
                        className="form-control"
                        name="pulangInput"
                        value={editData.pulangInput}
                        onChange={handleEditChange}
                      />
                    </div>
                    <div className="mb-2">
                      <label className="form-label">Lembur (menit)</label>
                      <input
                        type="number"
                        className="form-control"
                        name="lembur"
                        value={editData.lembur}
                        onChange={handleEditChange}
                        required
                      />
                    </div>
                    <div className="mb-2">
                      <label className="form-label">Waktu Telat (menit)</label>
                      <input
                        type="number"
                        className="form-control"
                        name="waktuTelat"
                        value={editData.waktuTelat}
                        onChange={handleEditChange}
                        required
                      />
                    </div>
                    <div className="form-check mb-2">
                      <input
                        type="checkbox"
                        className="form-check-input"
                        id="statusHadir"
                        name="statusHadir"
                        checked={!!editData.statusHadir}
                        onChange={handleEditChange}
                      />
                      <label className="form-check-label" htmlFor="statusHadir">
                        Status Hadir
                      </label>
                    </div>
                    <div className="d-flex justify-content-end gap-2">
                      <button type="button" className="btn btn-secondary" onClick={() => setShowEditModal(false)}>
                        Batal
                      </button>
                      <button type="submit" className="btn btn-primary">Simpan Perubahan</button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {showImageModal && (
        <>
          <div className="modal-backdrop fade show" style={{ zIndex: 1050 }} />
          <div className="modal fade show" style={{ display: 'block', zIndex: 1060 }} tabIndex="-1" role="dialog">
            <div className="modal-dialog modal-dialog-centered" role="document">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title">{imageTitle}</h5>
                  <button type="button" className="btn-close" onClick={() => setShowImageModal(false)} />
                </div>
                <div className="modal-body text-center">
                  <img src={imageSrc} alt={imageTitle} className="img-fluid" />
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  )
}

export default ManajerKehadiran
