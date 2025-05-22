import React, { useEffect, useState } from "react";
import { db } from "../firebase";
import { doc, getDoc } from "firebase/firestore";
import { useNavigate } from "react-router-dom";

const LoginAuth = ({ children }) => {
  const [authChecking, setAuthChecking] = useState(true);
  const [authValid, setAuthValid] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const checkAuth = async () => {
      const userDataStr = localStorage.getItem("userData");
      if (!userDataStr) {
        setAuthChecking(false);
        setAuthValid(false);
        navigate("/LoginKaryawan");
        return;
      }
      const userData = JSON.parse(userDataStr);
      const { username, token, expiry } = userData;
      if (!username || !token || !expiry) {
        localStorage.removeItem("userData");
        setAuthChecking(false);
        setAuthValid(false);
        navigate("/LoginKaryawan");
        return;
      }
      if (Date.now() > expiry) {
        localStorage.removeItem("userData");
        setAuthChecking(false);
        setAuthValid(false);
        navigate("/LoginKaryawan");
        return;
      }
      try {
        const logRef = doc(db, "dataKaryawan", username, "Data", "Log");
        const logSnap = await getDoc(logRef);
        if (!logSnap.exists()) {
          localStorage.removeItem("userData");
          setAuthChecking(false);
          setAuthValid(false);
          navigate("/LoginKaryawan");
          return;
        }
        const logData = logSnap.data();
        if (!logData.Token || logData.Token !== token) {
          localStorage.removeItem("userData");
          setAuthChecking(false);
          setAuthValid(false);
          navigate("/LoginKaryawan");
          return;
        }
        setAuthValid(true);
      } catch {
        setAuthValid(false);
        localStorage.removeItem("userData");
        navigate("/LoginKaryawan");
      }
      setAuthChecking(false);
    };
    checkAuth();
    // eslint-disable-next-line
  }, []);

  if (authChecking) {
    return (
      <div className="container text-center mt-5">
        <div className="spinner-border text-primary" role="status"></div>
        <div>Memeriksa sesi login...</div>
      </div>
    );
  }
  if (!authValid) return null;
  return <>{children}</>;
};

export default LoginAuth;