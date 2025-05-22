// ManajerKehadiranHapus.jsx
import { doc, getDoc, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';

export const handleHapus = async (karyawanId, tanggalKerja, onUpdate) => {
  try {
    const srcRef = doc(db, 'dataKaryawan', karyawanId, 'Kehadiran', tanggalKerja);
    const destRef = doc(db, 'dataKaryawan', karyawanId, 'arsipKehadiran', tanggalKerja);

    const snapshot = await getDoc(srcRef);
    if (snapshot.exists()) {
      const data = snapshot.data();
      await setDoc(destRef, data);
      await deleteDoc(srcRef);
    }

    if (onUpdate) onUpdate();
  } catch (error) {
    console.error('Error archiving kehadiran: ', error);
  }
};
