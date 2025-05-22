import React, { useState } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { useNavigate } from 'react-router-dom';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginMessage, setLoginMessage] = useState('');
  const [loginSuccess, setLoginSuccess] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginMessage('');
    setLoginSuccess(false);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      const docRef = doc(db, 'SIMKAB', user.uid);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const profile = docSnap.data();
        setLoginSuccess(true);
        setLoginMessage("Login Berhasil");
        setTimeout(() => {
          if (profile.role === 'manajer') {
            navigate('/HomeManajer');
          } else {
            navigate('/HomeKaryawan');
          }
        }, 1000);
      } else {
        setLoginSuccess(false);
        setLoginMessage("Data profil tidak ditemukan.");
      }
    } catch (error) {
      setLoginSuccess(false);
      setLoginMessage("Login gagal. Email atau password salah.");
    }
  };

  return (
    <div className="container mt-5">
      <div className="row justify-content-center">
        <div className="col-md-6 col-lg-4">
          <div className="card border-1">
            <div className="card-body p-4">
              <h2 className="text-center mb-2 fw-bold text-primary">SIMKAB</h2>
              <h5 className="text-center mb-4">LOGIN</h5>
              {loginMessage && (
                <div className={`alert ${loginSuccess ? 'alert-success' : 'alert-danger'} py-2`} role="alert">
                  {loginMessage}
                </div>
              )}
              <form onSubmit={handleLogin}>
                <div className="mb-3">
                  <label htmlFor="email" className="form-label">Email</label>
                  <input
                    type="email"
                    className="form-control"
                    id="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="username"
                  />
                </div>
                <div className="mb-3">
                  <label htmlFor="password" className="form-label">Password</label>
                  <input
                    type="password"
                    className="form-control"
                    id="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                  />
                </div>
                <div className="d-grid gap-2">
                  <button type="submit" className="btn btn-primary" disabled={loginSuccess}>
                    Login
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => navigate('/LoginKaryawan')}
                  >
                    Halaman Login Karyawan
                  </button>
                  <button
                    type="button"
                    className="btn"
                    style={{ color: 'red' }}
                    onClick={() => navigate('/ResetPassword')}
                  >
                    Reset Password
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
