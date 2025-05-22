import React, { useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { Navigate } from 'react-router-dom';
import { auth, db } from '../firebase';
import { doc, getDoc } from 'firebase/firestore';

const RequireAuth = ({ children, role: requiredRole }) => {
  const [checking, setChecking] = useState(true);
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const userDoc = await getDoc(doc(db, 'SIMKAB', user.uid));
        const userRole = userDoc.exists() ? userDoc.data().role : null;
        if (!requiredRole || userRole === requiredRole) {
          setAuthorized(true);
        } else {
          setAuthorized(false);
        }
      } else {
        setAuthorized(false);
      }
      setChecking(false);
    });
    return () => unsubscribe();
  }, [requiredRole]);

  if (checking) return <div className="text-center mt-5">Memuat...</div>;
  if (!authorized) return <Navigate to="/login" replace />;
  return children;
};

export default RequireAuth;
