import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { doc, getDoc, collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import 'bootstrap/dist/css/bootstrap.min.css';
import defaultPhoto from '../assets/icon-profil.jpg';

async function checkKaryawanAuth() {
  const userDataStr = localStorage.getItem('userData');
  if (!userDataStr) return null;
  const { username, token, expiry } = JSON.parse(userDataStr);
  if (!username || !token || !expiry) return null;
  if (Date.now() > expiry) {
    localStorage.removeItem('userData');
    return null;
  }
  const logRef = doc(db, 'dataKaryawan', username, 'Data', 'Log');
  const logSnap = await getDoc(logRef);
  if (!logSnap.exists() || logSnap.data().Token !== token) {
    localStorage.removeItem('userData');
    return null;
  }
  return username;
}

const KaryawanDashboard = () => {
  const navigate = useNavigate();
  const [username, setUsername] = useState(null);
  const [profileData, setProfileData] = useState(null);
  const [waktuKerjaHariIni, setWaktuKerjaHariIni] = useState(null);
  const [tanggalPembayaranBulanIni, setTanggalPembayaranBulanIni] = useState(null);

  useEffect(() => {
    async function cekSesi() {
      const uname = await checkKaryawanAuth();
      if (!uname) {
        navigate('/login-karyawan');
      } else {
        setUsername(uname);
      }
    }
    cekSesi();
  }, [navigate]);

  useEffect(() => {
    if (!username) return;
    async function fetchProfile() {
      const profileRef = doc(db, 'dataKaryawan', username);
      const profileSnap = await getDoc(profileRef);
      setProfileData(profileSnap.exists() ? profileSnap.data() : null);
    }
    fetchProfile();
  }, [username]);

  useEffect(() => {
    if (!username) return;
    async function fetchWaktuKerja() {
      const today = new Date();
      const yyyy = today.getFullYear();
      const mm = String(today.getMonth() + 1).padStart(2, '0');
      const dd = String(today.getDate()).padStart(2, '0');
      const todayStr = `${yyyy}-${mm}-${dd}`;
      try {
        const hadirRef = doc(db, 'dataKaryawan', username, 'Kehadiran', todayStr);
        const hadirSnap = await getDoc(hadirRef);
        if (hadirSnap.exists()) {
          const data = hadirSnap.data();
          setWaktuKerjaHariIni(`${data.waktuKerja || '-'} - ${data.waktuSelesai || '-'}`);
        } else {
          setWaktuKerjaHariIni('Tidak ada data');
        }
      } catch {
        setWaktuKerjaHariIni('Gagal memuat data');
      }
    }
    fetchWaktuKerja();
  }, [username]);

  useEffect(() => {
    if (!username) return;
    async function fetchGajiBulanIni() {
      const now = new Date().toISOString().split('T')[0];
      try {
        const snap = await getDocs(collection(db, 'PenggajianKaryawan'));
        let tgl = null;
        snap.forEach(docSnap => {
          const [start, end, uname] = docSnap.id.split('_');
          if (uname === username && now >= start && now <= end) {
            tgl = end;
          }
        });
        setTanggalPembayaranBulanIni(tgl || 'Tidak tersedia');
      } catch {
        setTanggalPembayaranBulanIni('Gagal memuat');
      }
    }
    fetchGajiBulanIni();
  }, [username]);

  if (!username || !profileData) {
    return (
      <div className="d-flex justify-content-center align-items-center vh-100">
        <div className="spinner-border text-primary" role="status"></div>
      </div>
    );
  }

  return (
    <div className="d-flex justify-content-center" style={{ backgroundColor: '#e0e0e0', minHeight: '100vh' }}>
      <div className="w-100 p-3" style={{ maxWidth: '500px', width: '90%', backgroundColor: 'white' }}>
        <div className="text-center mb-4">
          <h2 className="text-start h6 mb-3">SIMKAB</h2>
        </div>
        <div className="mb-2 py-3">
          <div className="card-body">
            <div className="row g-3 align-items-center">
              <div className="col-3 text-center">
                <img
                  src={profileData.fotoKaryawan || defaultPhoto}
                  alt="Foto Karyawan"
                  className="rounded-circle border border-2 border-primary"
                  style={{ width: '70px', height: '70px', objectFit: 'cover' }}
                />
              </div>
              <div className="col-8">
                <h5 className="mb-1 text-uppercase">{profileData.namaKaryawan}</h5>
                <p className="mb-0 text-primary">Posisi: {profileData.posisiKaryawan}</p>
                <p className="mb-0 text-primary">Gaji: Rp {profileData.gajiKaryawan?.toLocaleString('id-ID') || '-'}</p>
              </div>
            </div>
          </div>
        </div>
        <div className="text-center mb-4">
          <div className="container">
            <div className="row">
              <div className="col-6">
                <div className="card">
                  <div className="card-body small">
                    <h6 className="card-title">Jadwal Hari Ini:</h6>
                    <p className="card-text">{waktuKerjaHariIni}</p>
                  </div>
                </div>
              </div>
              <div className="col-6">
                <div className="card">
                  <div className="card-body small">
                    <h6 className="card-title">Tanggal Gajian:</h6>
                    <p className="card-text">{tanggalPembayaranBulanIni}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="text-center">
          <button
            className="btn btn-outline-primary w-100 text-start mb-3"
            onClick={() => navigate('/JadwalKaryawan')}
          >
            <div className="d-flex justify-content-between align-items-center w-100">
              <span>Jadwal Kehadiran</span>
              <span>{'>'}</span>
            </div>
          </button>
          <button
            className="btn btn-outline-primary w-100 text-start mb-3"
            onClick={() => navigate('/PenggajianKaryawan')}
          >
            <div className="d-flex justify-content-between align-items-center w-100">
              <span>Penggajian</span>
              <span>{'>'}</span>
            </div>
          </button>
        </div>
        <div className="text-center mt-2">
          <button
            className="btn btn-danger w-50 mb-3"
            onClick={() => {
              localStorage.removeItem('userData');
              navigate('/login');
            }}
          >
            Logout
          </button>
        </div>
      </div>
    </div>
  );
};

export default KaryawanDashboard;