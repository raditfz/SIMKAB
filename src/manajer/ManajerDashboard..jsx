import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, where, doc, getDoc } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { useNavigate } from 'react-router-dom';
import { onAuthStateChanged, signOut } from 'firebase/auth';

const ManajerDashboard = () => {
  const [managerData, setManagerData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState('');
  const [totalJadwalHariIni, setTotalJadwalHariIni] = useState(0);
  const [jumlahHadirHariIni, setJumlahHadirHariIni] = useState(0);
  const [listKehadiranHariIni, setListKehadiranHariIni] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        navigate('/login');
        return;
      }
      const docRef = doc(db, 'SIMKAB', user.uid);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists() && docSnap.data().role === 'manajer') {
        setManagerData({ ...docSnap.data(), uid: user.uid });
        setLoading(false);
      } else {
        await signOut(auth);
        navigate('/login');
      }
    });
    return () => unsub();
  }, [navigate]);

  useEffect(() => {
    const today = new Date();
    setCurrentDate(
      today.toLocaleDateString('id-ID', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        timeZone: 'Asia/Jakarta',
      })
    );
  }, []);

  useEffect(() => {
    if (!managerData) return;

    const fetchJadwalHariIni = async () => {
      try {
        const today = new Date();
        const yyyy = today.getFullYear();
        const mm = String(today.getMonth() + 1).padStart(2, '0');
        const dd = String(today.getDate()).padStart(2, '0');
        const todayString = `${yyyy}-${mm}-${dd}`;

        const karyawanSnapshot = await getDocs(collection(db, 'dataKaryawan'));
        const allPromises = karyawanSnapshot.docs.map(async (karyawanDoc) => {
          const karyawanId = karyawanDoc.id;
          const namaKaryawan = karyawanDoc.data().namaKaryawan || '';
          const kehadiranRef = collection(db, 'dataKaryawan', karyawanId, 'Kehadiran');
          const q = query(kehadiranRef, where('tanggalKerja', '==', todayString));
          const kehadiranSnapshot = await getDocs(q);
          return kehadiranSnapshot.docs.map(docSnap => {
            const data = docSnap.data();
            // gunakan field timestamp baru
            const mulaiTs = data.mulaiKerja?.toDate();
            const selesaiTs = data.selesaiKerja?.toDate();
            const waktuKerja = mulaiTs
              ? mulaiTs.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
              : null;
            const waktuSelesai = selesaiTs
              ? selesaiTs.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
              : null;
            return {
              id: `${karyawanId}_${docSnap.id}`,
              karyawanNama: namaKaryawan,
              tanggalKerja: data.tanggalKerja,
              waktuKerja,
              waktuSelesai,
              statusHadir: data.statusHadir,
            };
          });
        });

        const allJadwalArrays = await Promise.all(allPromises);
        const semuaJadwalHariIni = allJadwalArrays.flat();

        setTotalJadwalHariIni(semuaJadwalHariIni.length);
        setJumlahHadirHariIni(semuaJadwalHariIni.filter(item => item.statusHadir).length);
        setListKehadiranHariIni(semuaJadwalHariIni);
      } catch (error) {
        setTotalJadwalHariIni(0);
        setJumlahHadirHariIni(0);
        setListKehadiranHariIni([]);
      }
    };

    fetchJadwalHariIni();
  }, [managerData]);

  const handleLogout = async () => {
    await signOut(auth);
    navigate('/login');
  };

  if (loading) {
    return (
      <div className="container mt-5 text-center">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
        <p className="mt-2">Memuat data...</p>
      </div>
    );
  }

  return (
    <div className="container mt-4">
      {/* Salam manager */}
      <div className="row mb-4">
        <div className="col-12">
          <div className="card text-white bg-primary mb-4">
            <div className="card-body">
              <p className="card-text mb-1">Selamat Datang,</p>
              <h2 className="fw-bold">{managerData?.nama || '-'}</h2>
            </div>
          </div>
        </div>
      </div>

      {/* Tanggal dan grafik */}
      <div className="row mb-4">
        <div className="col-md-6 mb-3">
          <div className="card h-100">
            <div className="card-body">
              <h5 className="card-title">Tanggal Hari Ini</h5>
              <h3 className="fw-bold">{currentDate}</h3>
            </div>
          </div>
        </div>
        <div className="col-md-6">
          <div className="card h-100">
            <div className="card-body">
              <h5 className="card-title">Grafik Kehadiran Hari Ini</h5>
              <p>Hadir {jumlahHadirHariIni} / {totalJadwalHariIni}</p>
              <div className="progress" style={{ height: '20px' }}>
                <div
                  className="progress-bar bg-success"
                  role="progressbar"
                  style={{
                    width: totalJadwalHariIni > 0
                      ? `${(jumlahHadirHariIni / totalJadwalHariIni) * 100}%`
                      : '0%',
                  }}
                  aria-valuenow={jumlahHadirHariIni}
                  aria-valuemin="0"
                  aria-valuemax={totalJadwalHariIni}
                >
                  {totalJadwalHariIni > 0
                    ? Math.round((jumlahHadirHariIni / totalJadwalHariIni) * 100)
                    : 0}%
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Daftar kehadiran hari ini */}
      {listKehadiranHariIni.length > 0 && (
        <div className="mb-5">
          <h5 className="fw-bold mb-3">Daftar Jadwal Kehadiran Hari Ini</h5>
          <div className="row">
            {listKehadiranHariIni.map(item => (
              <div key={item.id} className="col-lg-4 col-md-6 mb-3">
                <div className="card border-secondary h-100">
                  <div className="card-body">
                    <h6 className="fw-bold text-uppercase">{item.karyawanNama}</h6>
                    <p className="mb-0">
                      <span className="fw-semibold">Jam: </span>
                      {item.waktuKerja && item.waktuSelesai
                        ? `${item.waktuKerja} - ${item.waktuSelesai}`
                        : item.waktuKerja || '-'}
                    </p>
                    <p className="mb-1">
                      <span className="fw-semibold">Status: </span>
                      {item.statusHadir ? 'Hadir' : 'Tidak Hadir'}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Logout */}
      <div className="text-center mb-5">
        <button className="btn btn-danger" onClick={handleLogout}>
          Logout
        </button>
      </div>
    </div>
  );
};

export default ManajerDashboard;
