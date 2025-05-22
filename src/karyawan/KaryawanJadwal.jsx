import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { doc, getDoc, collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import 'bootstrap/dist/css/bootstrap.min.css';

const JadwalKaryawan = () => {
  const navigate = useNavigate();
  const [username, setUsername] = useState(null);
  const [profileData, setProfileData] = useState(null);
  const [jadwal, setJadwal] = useState([]);
  const [selectedPhoto, setSelectedPhoto] = useState(null);

  // Ambil username dari localStorage
  useEffect(() => {
    const userDataStr = localStorage.getItem("userData");
    if (userDataStr) {
      const userData = JSON.parse(userDataStr);
      if (userData.username) setUsername(userData.username);
    }
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      if (!username) return;
      try {
        // Ambil data profil
        const profileRef = doc(db, 'dataKaryawan', username);
        const profileSnap = await getDoc(profileRef);
        if (profileSnap.exists()) setProfileData(profileSnap.data());

        // Ambil data dari subkoleksi Kehadiran
        const kehadiranRef = collection(db, 'dataKaryawan', username, 'Kehadiran');
        const kehadiranSnap = await getDocs(kehadiranRef);
        const jadwalData = [];

        kehadiranSnap.forEach((doc) => {
          jadwalData.push({ id: doc.id, ...doc.data() });
        });

        jadwalData.sort((a, b) => new Date(b.tanggalKerja) - new Date(a.tanggalKerja));
        setJadwal(jadwalData);
      } catch (error) {
        console.error("Gagal mengambil data:", error);
      }
    };
    fetchData();
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
        <div className="text-start mb-4">
          <button type="button" className="btn btn-primary" onClick={() => navigate('/HomeKaryawan')}>Home</button>
        </div>
        <div className="card-body">
          <h5 className="text-center text-uppercase mb-3">Jadwal Kehadiran</h5>
          {jadwal.length === 0 ? (
            <p className="text-muted">Tidak ada data kehadiran.</p>
          ) : (
            <div className="d-flex flex-column gap-3">
              {jadwal.map((item) => (
                <div className="card shadow-sm" key={item.id}>
                  <div className="card-body">
                    <div className="d-flex justify-content-between align-items-center mb-2">
                      <h4 className="card-subtitle fw-bold text-dark mb-0">{item.tanggalKerja}</h4>
                      <button
                        className="btn btn-sm btn-outline-primary"
                        onClick={() => setSelectedPhoto(item.photo)}
                      >
                        Lihat Bukti
                      </button>
                    </div>
                    <p className="mb-1"><strong>⎙ Status:</strong> {item.statusHadir ? 'Hadir' : 'Tidak Hadir'}</p>
                    <p className="mb-1"><strong>▢ Waktu:</strong> {item.waktuKerja || '-'} - {item.waktuSelesai || '-'}</p>
                    {item.statusHadir && (
                      <div className="mb-1 d-flex flex-wrap align-items-center gap-2">
                        <p className="mb-0"><strong>▣ Hadir:</strong> {item.waktuHadir || '-'}</p>
                        {item.waktuTelat > 0 && (
                          <p className="mb-0 text-danger"><strong>Telat:</strong> {item.waktuTelat} menit</p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default JadwalKaryawan;
