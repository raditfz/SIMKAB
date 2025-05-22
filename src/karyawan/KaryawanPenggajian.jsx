import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import 'bootstrap/dist/css/bootstrap.min.css';

const PenggajianKaryawan = () => {
  const navigate = useNavigate();
  const [dataGaji, setDataGaji] = useState([]);
  const [username, setUsername] = useState('');

  useEffect(() => {
    const localData = localStorage.getItem('userData');
    if (localData) {
      const parsed = JSON.parse(localData);
      setUsername(parsed.username);
    }
  }, []);

  useEffect(() => {
    const fetchGaji = async () => {
      if (!username) return;
      const gajiRef = collection(db, 'dataKaryawan', username, 'Penggajian');
      const querySnapshot = await getDocs(gajiRef);
      const data = [];

      querySnapshot.forEach((docSnap) => {
        const [tanggalMulai, tanggalPembayaran] = docSnap.id.split('_');
        const docData = docSnap.data();
        data.push({
          id: docSnap.id,
          tanggalMulai,
          tanggalPembayaran,
          statusPembayaran: docData.statusPembayaran,
          gajiTotal: docData.statusPembayaran ? docData.gajiTotal : null,
        });
      });

      data.sort((a, b) => new Date(b.tanggalMulai) - new Date(a.tanggalMulai));
      setDataGaji(data);
    };
    fetchGaji();
  }, [username]);

  return (
    <div className="d-flex justify-content-center" style={{ backgroundColor: '#e0e0e0', minHeight: '100vh' }}>
      <div className="w-100 p-3" style={{ maxWidth: '500px', width: '90%', backgroundColor: 'white' }}>
        <div className="text-start mb-4">
          <button type="button" className="btn btn-primary" onClick={() => navigate('/HomeKaryawan')}>
            Home
          </button>
        </div>
        <h3 className="text-center mb-3">PENGGAJIAN</h3>
        {dataGaji.length === 0 ? (
          <p className="text-muted text-center">Tidak ada data penggajian.</p>
        ) : (
          dataGaji.map((item) => (
            <div className="card mb-3" key={item.id}>
              <div className="card-body">
                <div className="mb-2 fw-bold">
                  {item.tanggalMulai} - {item.tanggalPembayaran}
                </div>
                <div className="d-flex justify-content-between">
                  <span className={item.statusPembayaran ? 'text-success' : 'text-danger'}>
                    {item.statusPembayaran ? 'Sudah Dibayar' : 'Belum Dibayar'}
                  </span>
                  {item.statusPembayaran && (
                    <span className="fw-semibold">Rp {item.gajiTotal.toLocaleString()}</span>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default PenggajianKaryawan;
