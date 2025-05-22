// ManajerKehadiranHadir.jsx
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';

export const handleHadir = async (karyawanId, tanggalKerja, waktuKerja, onUpdate) => {
  try {
    const now = new Date();
    const formattedWaktuHadir = now.toTimeString().split(' ')[0];
    const kerjaDate = new Date(`${tanggalKerja}T${waktuKerja}`);
    const hadirDate = new Date(`${tanggalKerja}T${formattedWaktuHadir}`);

    let diffMinutes = 0;
    if (hadirDate > kerjaDate) {
      diffMinutes = Math.floor((hadirDate - kerjaDate) / 60000);
    }

    const docRef = doc(db, 'dataKaryawan', karyawanId, 'Kehadiran', tanggalKerja);
    await updateDoc(docRef, {
      statusHadir: true,
      waktuHadir: formattedWaktuHadir,
      waktuTelat: diffMinutes,
    });

    if (onUpdate) onUpdate();
  } catch (error) {
    console.error('Error updating kehadiran: ', error);
  }
};

export const handleBatalkanHadir = async (karyawanId, tanggalKerja, onUpdate) => {
  try {
    const docRef = doc(db, 'dataKaryawan', karyawanId, 'Kehadiran', tanggalKerja);
    await updateDoc(docRef, {
      photo: null,
      statusHadir: false,
      waktuHadir: null,
      waktuTelat: 0,
    });

    if (onUpdate) onUpdate();
  } catch (error) {
    console.error('Error reverting kehadiran status: ', error);
  }
};