import React, { useState } from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase.js';
import emailjs from 'emailjs-com';
import { useNavigate } from 'react-router-dom';

const ResetPassword = () => {
  const [isManagerReset, setIsManagerReset] = useState(false);
  const [username, setUsername] = useState('');
  const [token, setToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [message, setMessage] = useState('');
  const [isTokenSent, setIsTokenSent] = useState(false);
  const navigate = useNavigate();

  const generateToken = () => Math.floor(100000 + Math.random() * 900000).toString();

  const handleResetRequest = async () => {
      if (!username) return setMessage('Masukkan username terlebih dahulu.');
      const collectionName = isManagerReset ? 'akunManajer' : 'akunKaryawan';
      const querySnapshot = await getDocs(collection(db, collectionName));
      let userDoc = null;
      querySnapshot.forEach((doc) => {
        if (doc.data().username === username) userDoc = { id: doc.id, ...doc.data() };
      });
      if (!userDoc) return setMessage('Username tidak ditemukan.');
      const resetToken = generateToken();
      await updateDoc(doc(db, collectionName, userDoc.id), { token: resetToken });
      const emailParams = { user_email: userDoc.email, reset_token: resetToken };
      emailjs.send('service_kgqvpdk', 'template_p9he4mp', emailParams, 'pe-3ZlQlHW660Wwyt')
        .then(() => {
          setMessage('Token reset password telah dikirim ke email Anda.');
          setIsTokenSent(true);
        })
        .catch(() => setMessage('Gagal mengirim email. Coba lagi nanti.'));
  };

  const handlePasswordReset = async () => {
      if (!token || !newPassword) return setMessage('Masukkan token dan password baru.');
      // --- Ganti nama koleksi sesuai permintaan Anda ---
      const collectionName = isManagerReset ? 'akunManajer' : 'akunKaryawan';
      const querySnapshot = await getDocs(collection(db, collectionName));
      let userDoc = null;
      querySnapshot.forEach((doc) => {
        if (doc.data().username === username && doc.data().token === token) {
          userDoc = { id: doc.id, ...doc.data() };
        }
      });
      if (!userDoc) return setMessage('Token salah atau username tidak sesuai.');
      await updateDoc(doc(db, collectionName, userDoc.id), { password: newPassword, token: null });
      setMessage('Password berhasil diperbarui. Mengalihkan ke halaman login...');
      setTimeout(() => navigate('/login'), 2000);
  };

  return (
    <div className="container mt-5">
      <div className="row justify-content-center">
        <div className="col-md-6 col-lg-4">
          <div className="card">
            <div className="card-body p-4">
              <h3 className="text-center mb-4">Reset Password</h3>
              <div className="form-check mb-3">
                <input 
                  type="checkbox" 
                  className="form-check-input" 
                  id="managerResetCheckbox" 
                  checked={isManagerReset}
                  onChange={(e) => setIsManagerReset(e.target.checked)}
                />
                <label className="form-check-label" htmlFor="managerResetCheckbox">
                  Reset Akun Manager
                </label>
              </div>
              {!isTokenSent ? (
                <>
                  <div className="mb-3">
                    <label htmlFor="username" className="form-label">Username</label>
                    <input
                      type="text"
                      className="form-control"
                      id="username"
                      placeholder="Masukkan username"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                    />
                  </div>
                  <div className="d-grid gap-2">
                    <button type="button" className="btn btn-primary" onClick={handleResetRequest}>
                      Kirim Reset Password
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="mb-3">
                    <label htmlFor="token" className="form-label">Token</label>
                    <input
                      type="text"
                      className="form-control"
                      id="token"
                      placeholder="Masukkan token dari email"
                      value={token}
                      onChange={(e) => setToken(e.target.value)}
                    />
                  </div>
                  <div className="mb-3">
                    <label htmlFor="newPassword" className="form-label">Password Baru</label>
                    <input
                      type="password"
                      className="form-control"
                      id="newPassword"
                      placeholder="Masukkan password baru"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                    />
                  </div>
                  <div className="d-grid gap-2">
                    <button type="button" className="btn btn-success" onClick={handlePasswordReset}>
                      Reset Password
                    </button>
                  </div>
                </>
              )}
              <div className="d-grid gap-2 mt-2">
                <button className="btn btn-secondary" onClick={() => navigate('/')}>
                  Kembali ke Login
                </button>
              </div>
              {message && <p className="mt-3 text-center text-danger">{message}</p>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
