import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "../firebase";

export const hitungGajiTotalSementara = async (employeeId, paymentId) => {
  if (!employeeId || !paymentId) {
    throw new Error("Parameter tidak lengkap");
  }
  try {
    const penggajianDocRef = doc(db, `dataKaryawan/${employeeId}/Penggajian/${paymentId}`);
    const penggajianSnap = await getDoc(penggajianDocRef);

    if (!penggajianSnap.exists()) throw new Error("Data penggajian tidak ditemukan");

    const data = penggajianSnap.data();
    const totalPotongan = data.totalPotongan || 0;

    // Jika hanya ingin mengambil totalPotongan sebagai gajiTotalSementara
    const gajiTotalSementara = totalPotongan;

    // Optional: update ke Firestore (jika ingin disimpan)
    await updateDoc(penggajianDocRef, { gajiTotalSementara });

    return { gajiTotalSementara };
  } catch (err) {
    console.error("Gagal menghitung gajiTotalSementara:", err);
    throw err;
  }
};
