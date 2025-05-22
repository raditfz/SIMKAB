import React, { useState } from "react";
import { db } from "../firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { useNavigate } from "react-router-dom";

function randomToken(length = 8) {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < length; i++) result += chars.charAt(Math.floor(Math.random() * chars.length));
  return result;
}

const LoginPageKaryawan = () => {
  const [username, setUsername] = useState("");
  const [passwordInput, setPasswordInput] = useState("");
  const [loginMessage, setLoginMessage] = useState("");
  const [loginSuccess, setLoginSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginMessage("");
    setLoginSuccess(false);
    setLoading(true);

    try {
      const profilRef = doc(db, "dataKaryawan", username, "Data", "Profil");
      const profilSnap = await getDoc(profilRef);

      if (!profilSnap.exists()) {
        setLoginMessage("Username tidak ditemukan.");
        setLoading(false);
        return;
      }
      const profil = profilSnap.data();
      if (!profil.Password || profil.Password !== passwordInput) {
        setLoginMessage("Password salah.");
        setLoading(false);
        return;
      }

      const token = randomToken(8);
      const expiry = Date.now() + 1000 * 60 * 20;
      const logRef = doc(db, "dataKaryawan", username, "Data", "Log");
      await setDoc(logRef, { Token: token }, { merge: true });

      // Ambil kembali token dari firestore (pastikan yang terbaru)
      const logSnap = await getDoc(logRef);
      let saveToken = token;
      if (logSnap.exists()) {
        const logData = logSnap.data();
        if (logData.Token) saveToken = logData.Token;
      }

      localStorage.setItem(
        "userData",
        JSON.stringify({
          username,
          token: saveToken,
          expiry,
        })
      );

      setLoginSuccess(true);
      setLoginMessage("Login berhasil.");
      setTimeout(() => {
        navigate("/HomeKaryawan");
      }, 1200);
    } catch (error) {
      setLoginMessage("Terjadi kesalahan. Silakan coba lagi.");
    }
    setLoading(false);
  };

  return (
    <div className="container mt-5">
      <div className="row justify-content-center">
        <div className="col-md-6 col-lg-4">
          <div className="card border-1">
            <div className="card-body p-4">
              <h2 className="text-center mb-2 fw-bold text-primary">SIMKAB</h2>
              <h5 className="text-center mb-4">LOGIN KARYAWAN</h5>
              {loginMessage && (
                <div className={`alert ${loginSuccess ? "alert-success" : "alert-danger"} py-2`} role="alert">
                  {loginMessage}
                </div>
              )}
              <form onSubmit={handleLogin}>
                <div className="mb-3">
                  <label htmlFor="username" className="form-label">Username</label>
                  <input
                    type="text"
                    className="form-control"
                    id="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
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
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    required
                    autoComplete="current-password"
                  />
                </div>
                <div className="d-grid gap-2">
                  <button type="submit" className="btn btn-primary" disabled={loading || loginSuccess}>
                    {loading ? "Memproses..." : "Login"}
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => navigate('/login')}
                  >
                    Halaman Login Manajer
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

export default LoginPageKaryawan;
