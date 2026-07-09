import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  updateDoc, 
  query, 
  where, 
  orderBy, 
  getDocs, 
  onSnapshot, 
  addDoc, 
  Timestamp, 
  limit 
} from "firebase/firestore";
import { db, auth } from "./firebase";
import { Driver, Ride, RideStatus, ChatMessage } from "./types";

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// ---------------- DRIVER SERVICES ----------------

export async function saveDriverProfile(uid: string, profile: Omit<Driver, 'uid' | 'online' | 'status' | 'rating' | 'totalRides' | 'earnings' | 'currentRideId' | 'updatedAt'>) {
  const path = `drivers/${uid}`;
  try {
    const driverDoc = doc(db, "drivers", uid);
    
    let defaultData: {
      online: boolean;
      status: 'idle' | 'busy';
      rating: number;
      totalRides: number;
      earnings: number;
      currentRideId: string | null;
    } = {
      online: false,
      status: 'idle',
      rating: 4.9,
      totalRides: 0,
      earnings: 0,
      currentRideId: null,
    };

    let existingSnap = null;
    try {
      existingSnap = await getDoc(driverDoc);
    } catch (docErr: any) {
      console.warn("Could not get existing driver doc (offline fallback active):", docErr);
      // Try to recover existing data from localStorage cache if possible
      try {
        const cached = localStorage.getItem(`driver_profile_${uid}`);
        if (cached) {
          const parsed = JSON.parse(cached);
          defaultData = {
            online: parsed.online ?? false,
            status: parsed.status ?? 'idle',
            rating: parsed.rating ?? 4.9,
            totalRides: parsed.totalRides ?? 0,
            earnings: parsed.earnings ?? 0,
            currentRideId: parsed.currentRideId ?? null,
          };
        }
      } catch (e) {}
    }

    if (existingSnap && existingSnap.exists()) {
      const data = existingSnap.data() as Driver;
      defaultData = {
        online: data.online ?? false,
        status: data.status ?? 'idle',
        rating: data.rating ?? 4.9,
        totalRides: data.totalRides ?? 0,
        earnings: data.earnings ?? 0,
        currentRideId: data.currentRideId ?? null,
      };
    }

    const driverData: Driver = {
      uid,
      ...profile,
      ...defaultData,
      updatedAt: Timestamp.now()
    };

    try {
      await setDoc(driverDoc, driverData);
    } catch (setErr: any) {
      const errMsg = String(setErr?.message || setErr).toLowerCase();
      if (
        errMsg.includes("offline") || 
        errMsg.includes("network") || 
        errMsg.includes("failed-precondition") ||
        errMsg.includes("failed to get document")
      ) {
        console.warn("Client is offline. Saving profile to localStorage cache only.", setErr);
        try {
          localStorage.setItem(`driver_profile_${uid}`, JSON.stringify(driverData));
        } catch (e) {}
        return driverData;
      }
      throw setErr;
    }

    // Sync to administrative "motoristas" collection for backend/admin-panel compatibility
    try {
      const motoristaDoc = doc(db, "motoristas", uid);
      const motoristaData = {
        uid,
        id: uid,
        name: driverData.name,
        nome: driverData.name,
        email: driverData.email,
        phone: driverData.phone,
        telefone: driverData.phone,
        motoModel: driverData.motoModel,
        modelo: driverData.motoModel,
        modeloMoto: driverData.motoModel,
        motoColor: driverData.motoColor,
        cor: driverData.motoColor,
        corMoto: driverData.motoColor,
        motoPlate: driverData.motoPlate,
        placa: driverData.motoPlate,
        placaMoto: driverData.motoPlate,
        online: driverData.online,
        statusOnline: driverData.online,
        status: driverData.status,
        rating: driverData.rating,
        totalRides: driverData.totalRides,
        earnings: driverData.earnings,
        updatedAt: Timestamp.now(),
        ultimaAtualizacao: Timestamp.now()
      };
      await setDoc(motoristaDoc, motoristaData, { merge: true });
    } catch (adminErr) {
      console.warn("Failed to sync driver profile to administrative motoristas collection:", adminErr);
    }

    // Cache locally as well
    try {
      localStorage.setItem(`driver_profile_${uid}`, JSON.stringify(driverData));
    } catch (e) {}

    return driverData;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function getDriverProfile(uid: string): Promise<Driver | null> {
  const path = `drivers/${uid}`;
  try {
    const driverDoc = doc(db, "drivers", uid);
    const snap = await getDoc(driverDoc);
    if (snap.exists()) {
      const data = snap.data() as Driver;
      
      // Sync to administrative "motoristas" collection for backend/admin-panel compatibility
      try {
        const motoristaDoc = doc(db, "motoristas", uid);
        const motoristaData = {
          uid,
          id: uid,
          name: data.name,
          nome: data.name,
          email: data.email,
          phone: data.phone,
          telefone: data.phone,
          motoModel: data.motoModel,
          modelo: data.motoModel,
          modeloMoto: data.motoModel,
          motoColor: data.motoColor,
          cor: data.motoColor,
          corMoto: data.motoColor,
          motoPlate: data.motoPlate,
          placa: data.motoPlate,
          placaMoto: data.motoPlate,
          online: data.online ?? false,
          statusOnline: data.online ?? false,
          status: data.status || 'idle',
          rating: data.rating || 4.9,
          totalRides: data.totalRides || 0,
          earnings: data.earnings || 0,
          updatedAt: Timestamp.now(),
          ultimaAtualizacao: Timestamp.now()
        };
        await setDoc(motoristaDoc, motoristaData, { merge: true });
      } catch (adminErr) {
        console.warn("Failed to sync driver profile to administrative motoristas collection:", adminErr);
      }

      // Update cache
      try {
        localStorage.setItem(`driver_profile_${uid}`, JSON.stringify(data));
      } catch (e) {}
      return data;
    }
    return null;
  } catch (error: any) {
    const errMsg = String(error?.message || error).toLowerCase();
    if (
      errMsg.includes("offline") || 
      errMsg.includes("network") || 
      errMsg.includes("failed-precondition") ||
      errMsg.includes("failed to get document")
    ) {
      console.warn("Client is offline or network error. Trying to retrieve cached profile from localStorage.");
      try {
        const cached = localStorage.getItem(`driver_profile_${uid}`);
        if (cached) {
          return JSON.parse(cached) as Driver;
        }
      } catch (e) {
        console.warn("Failed to load profile from localStorage:", e);
      }
      return null;
    }
    handleFirestoreError(error, OperationType.GET, path);
  }
}

export async function findDriverByEmail(email: string): Promise<any | null> {
  if (!email) return null;
  const lowercaseEmail = email.toLowerCase().trim();
  const collections = ["drivers", "driver", "motoristas", "motorista", "users", "user"];
  const emailFields = ["email", "emailMotorista", "login", "usuario", "usuarioEmail", "userEmail"];

  for (const colName of collections) {
    try {
      const colRef = collection(db, colName);
      
      // Try exact email and lowercase email for each candidate field
      for (const field of emailFields) {
        const q1 = query(colRef, where(field, "==", email), limit(1));
        const snap1 = await getDocs(q1);
        if (!snap1.empty) {
          return { id: snap1.docs[0].id, ...snap1.docs[0].data() };
        }

        const q2 = query(colRef, where(field, "==", lowercaseEmail), limit(1));
        const snap2 = await getDocs(q2);
        if (!snap2.empty) {
          return { id: snap2.docs[0].id, ...snap2.docs[0].data() };
        }
      }
    } catch (colErr) {
      // Quietly continue if a specific collection doesn't exist or is inaccessible
      console.warn(`Collection ${colName} lookup skipped:`, colErr);
    }
  }

  return null;
}

export async function updateDriverStatus(uid: string, online: boolean, status: 'idle' | 'busy' = 'idle') {
  const path = `drivers/${uid}`;
  try {
    const driverDoc = doc(db, "drivers", uid);
    await updateDoc(driverDoc, {
      online,
      status,
      updatedAt: Timestamp.now()
    });

    // Sync online/offline presence inside motoristas_online
    const onlineDoc = doc(db, "motoristas_online", uid);
    await setDoc(onlineDoc, {
      motoristaId: uid,
      statusOnline: online,
      online: online,
      ultimaAtualizacao: Timestamp.now()
    }, { merge: true });

    // Sync inside motoristas collection as well for administrative site tracking
    try {
      const motoristaDoc = doc(db, "motoristas", uid);
      await setDoc(motoristaDoc, {
        online,
        statusOnline: online,
        status,
        updatedAt: Timestamp.now(),
        ultimaAtualizacao: Timestamp.now()
      }, { merge: true });
    } catch (e) {}
  } catch (error: any) {
    const errMsg = String(error?.message || error).toLowerCase();
    if (
      errMsg.includes("offline") || 
      errMsg.includes("network") || 
      errMsg.includes("failed-precondition") ||
      errMsg.includes("failed to get document")
    ) {
      console.warn("Client is offline during updateDriverStatus. Status updated locally only.");
      return;
    }
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}



// ---------------- RIDE SERVICES ----------------

export function subscribeToWaitingRides(callback: (rides: Ride[]) => void, onError: (error: any) => void) {
  const path = "rides";
  const ridesQuery = query(
    collection(db, "rides"),
    where("status", "in", ["procurando_motorista", "waiting", "pending"]),
    orderBy("createdAt", "desc")
  );

  return onSnapshot(ridesQuery, (snapshot) => {
    const ridesList: Ride[] = [];
    snapshot.forEach((doc) => {
      ridesList.push({ id: doc.id, ...doc.data() } as Ride);
    });
    callback(ridesList);
  }, (error) => {
    console.warn("Retrying waiting rides subscription without orderby...");
    const fallbackQuery = query(
      collection(db, "rides"),
      where("status", "in", ["procurando_motorista", "waiting", "pending"])
    );
    onSnapshot(fallbackQuery, (snapshot) => {
      const ridesList: Ride[] = [];
      snapshot.forEach((doc) => {
        ridesList.push({ id: doc.id, ...doc.data() } as Ride);
      });
      callback(ridesList);
    }, (err) => {
      onError(err);
    });
  });
}

export function subscribeToPendingRides(callback: (rides: Ride[]) => void, onError: (error: any) => void) {
  const path = "rides";
  const ridesQuery = query(
    collection(db, "rides"),
    where("status", "==", "pending"),
    orderBy("createdAt", "desc")
  );

  return onSnapshot(ridesQuery, (snapshot) => {
    const ridesList: Ride[] = [];
    snapshot.forEach((doc) => {
      ridesList.push({ id: doc.id, ...doc.data() } as Ride);
    });
    callback(ridesList);
  }, (error) => {
    // If it's index-related, firestore might need an index. Let's fallback to un-ordered query if it fails.
    console.warn("Retrying pending rides subscription without orderby...");
    const fallbackQuery = query(
      collection(db, "rides"),
      where("status", "==", "pending")
    );
    onSnapshot(fallbackQuery, (snapshot) => {
      const ridesList: Ride[] = [];
      snapshot.forEach((doc) => {
        ridesList.push({ id: doc.id, ...doc.data() } as Ride);
      });
      callback(ridesList);
    }, (err) => {
      handleFirestoreError(err, OperationType.GET, path);
    });
  });
}

export async function updateDriverLocation(
  driverId: string, 
  latitude: number, 
  longitude: number,
  address?: {
    street: string;
    number: string;
    neighborhood: string;
    city: string;
    state: string;
    zipCode: string;
    formattedAddress: string;
  },
  isOnline: boolean = false
) {
  const path = `drivers/${driverId}`;
  try {
    const driverDoc = doc(db, "drivers", driverId);
    
    const locationData: any = {
      latitude,
      longitude,
      updatedAt: Timestamp.now()
    };
    
    if (address) {
      locationData.address = address;
    }

    await updateDoc(driverDoc, {
      location: locationData
    });

    // Also update a separate sub-collection document for exact match paths in rules
    const locDoc = doc(db, "drivers", driverId, "location", "current");
    await setDoc(locDoc, locationData, { merge: true });

    // Update real-time motoristas_online collection
    const onlineDoc = doc(db, "motoristas_online", driverId);
    const onlineData: any = {
      motoristaId: driverId,
      latitude,
      longitude,
      statusOnline: isOnline,
      online: isOnline,
      ultimaAtualizacao: Timestamp.now()
    };
    if (address) {
      onlineData.address = address;
    }
    await setDoc(onlineDoc, onlineData, { merge: true });

    // Sync direct location data to motoristas collection so admin dashboard maps can fetch it easily
    try {
      const motoristaDoc = doc(db, "motoristas", driverId);
      const motoristaLocationUpdate: any = {
        latitude,
        longitude,
        lat: latitude,
        lng: longitude,
        online: isOnline,
        statusOnline: isOnline,
        location: locationData,
        updatedAt: Timestamp.now(),
        ultimaAtualizacao: Timestamp.now()
      };
      if (address) {
        motoristaLocationUpdate.address = address;
        motoristaLocationUpdate.endereco = address.formattedAddress;
      }
      await setDoc(motoristaDoc, motoristaLocationUpdate, { merge: true });
    } catch (e) {}
  } catch (error: any) {
    const errMsg = String(error?.message || error).toLowerCase();
    if (
      errMsg.includes("offline") || 
      errMsg.includes("network") || 
      errMsg.includes("failed-precondition") ||
      errMsg.includes("failed to get document")
    ) {
      console.warn("Client is offline during updateDriverLocation, skipping remote update.");
      return;
    }
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function updateWalletBalance(driverId: string, amount: number) {
  const path = `wallets/${driverId}`;
  try {
    const walletDoc = doc(db, "wallets", driverId);
    const snap = await getDoc(walletDoc);
    let balance = 0;
    if (snap.exists()) {
      const data = snap.data();
      balance = data.balance ?? 0;
    }
    balance += amount;
    await setDoc(walletDoc, {
      balance,
      updatedAt: Timestamp.now()
    }, { merge: true });
    return balance;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function updateCarteiraMotorista(driverId: string, ridePrice: number) {
  const path = `carteira_motorista/${driverId}`;
  try {
    const carteiraDoc = doc(db, "carteira_motorista", driverId);
    const snap = await getDoc(carteiraDoc);
    
    let saldo = 0;
    let ganhosTotais = 0;
    let corridasRealizadas = 0;
    
    if (snap.exists()) {
      const data = snap.data();
      saldo = data.saldo ?? 0;
      ganhosTotais = data.ganhosTotais ?? 0;
      corridasRealizadas = data.corridasRealizadas ?? 0;
    }
    
    saldo += ridePrice;
    ganhosTotais += ridePrice;
    corridasRealizadas += 1;
    
    await setDoc(carteiraDoc, {
      motoristaId: driverId,
      saldo,
      ganhosTotais,
      corridasRealizadas,
      ultimaAtualizacao: Timestamp.now()
    }, { merge: true });
    
    return { saldo, ganhosTotais, corridasRealizadas };
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export function subscribeToWallet(driverId: string, callback: (balance: number) => void) {
  const path = `wallets/${driverId}`;
  return onSnapshot(doc(db, "wallets", driverId), (snapshot) => {
    if (snapshot.exists()) {
      callback(snapshot.data().balance ?? 0);
    } else {
      callback(0);
    }
  }, (error) => {
    // If document doesn't exist yet, return 0 instead of throwing immediately
    callback(0);
  });
}

export function subscribeToActiveRide(rideId: string, callback: (ride: Ride | null) => void) {
  const path = `rides/${rideId}`;
  return onSnapshot(doc(db, "rides", rideId), (snapshot) => {
    if (snapshot.exists()) {
      callback({ id: snapshot.id, ...snapshot.data() } as Ride);
    } else {
      callback(null);
    }
  }, (error) => {
    handleFirestoreError(error, OperationType.GET, path);
  });
}

export async function acceptRide(rideId: string, driver: Driver) {
  const ridePath = `rides/${rideId}`;
  try {
    // Update ride to motorista_a_caminho status with all requested fields
    await updateDoc(doc(db, "rides", rideId), {
      status: 'motorista_a_caminho' as RideStatus,
      driverId: driver.uid,
      driverName: driver.name,
      motoristaId: driver.uid,
      motoristaNome: driver.name,
      acceptedAt: Timestamp.now(),
      horarioAceite: Timestamp.now()
    });

    // Update driver status to busy
    await updateDoc(doc(db, "drivers", driver.uid), {
      status: 'busy',
      currentRideId: rideId,
      updatedAt: Timestamp.now()
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, ridePath);
  }
}

export async function updateRideStatus(rideId: string, driverId: string, status: RideStatus, ridePrice: number = 0) {
  const ridePath = `rides/${rideId}`;
  try {
    const updates: any = { status };
    
    // Support Portuguese attributes and statuses transparently
    if (status === 'motorista_chegou' || status === 'arrived') {
      updates.status = 'motorista_chegou';
      updates.arrivedAt = Timestamp.now();
    } else if (status === 'iniciada' || status === 'in_progress') {
      updates.status = 'iniciada';
      updates.startedAt = Timestamp.now();
    } else if (status === 'finalizada' || status === 'completed' || status === 'finished') {
      updates.status = 'finalizada';
      updates.completedAt = Timestamp.now();
      updates.horarioFinalizacao = Timestamp.now();
      updates.valorFinal = ridePrice;
      updates.distanciaReal = 0; // Distancia real calculation
    }

    await updateDoc(doc(db, "rides", rideId), updates);

    // If completed, finished, finalizada or cancelled, release the driver and update wallet
    if (status === 'completed' || status === 'finished' || status === 'finalizada' || status === 'cancelled') {
      const driverDoc = doc(db, "drivers", driverId);
      const driverSnap = await getDoc(driverDoc);
      
      let newEarnings = 0;
      let newTotalRides = 0;
      
      if (driverSnap.exists()) {
        const dData = driverSnap.data() as Driver;
        const won = (status === 'cancelled') ? 0 : ridePrice;
        newEarnings = (dData.earnings || 0) + won;
        newTotalRides = (dData.totalRides || 0) + ((status === 'cancelled') ? 0 : 1);
      }

      await updateDoc(driverDoc, {
        status: 'idle',
        currentRideId: null,
        earnings: newEarnings,
        totalRides: newTotalRides,
        updatedAt: Timestamp.now()
      });

      // Update external wallet balance and carteira_motorista on finished/completed/finalizada
      if ((status === 'completed' || status === 'finished' || status === 'finalizada') && ridePrice > 0) {
        await updateWalletBalance(driverId, ridePrice);
        await updateCarteiraMotorista(driverId, ridePrice);
      }
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, ridePath);
  }
}

export async function loadDriverRideHistory(driverId: string): Promise<Ride[]> {
  const path = "rides";
  try {
    const historyQuery = query(
      collection(db, "rides"),
      where("driverId", "==", driverId),
      orderBy("createdAt", "desc"),
      limit(20)
    );
    const snap = await getDocs(historyQuery);
    const list: Ride[] = [];
    snap.forEach((doc) => {
      list.push({ id: doc.id, ...doc.data() } as Ride);
    });
    return list;
  } catch (error) {
    // If it fails (maybe index required), fallback to client-side filter
    try {
      const fallbackQuery = query(
        collection(db, "rides"),
        where("driverId", "==", driverId)
      );
      const snap = await getDocs(fallbackQuery);
      const list: Ride[] = [];
      snap.forEach((doc) => {
        list.push({ id: doc.id, ...doc.data() } as Ride);
      });
      return list.sort((a, b) => {
        const timeA = a.createdAt instanceof Timestamp ? a.createdAt.toMillis() : new Date(a.createdAt).getTime();
        const timeB = b.createdAt instanceof Timestamp ? b.createdAt.toMillis() : new Date(b.createdAt).getTime();
        return timeB - timeA;
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.LIST, path);
    }
  }
}

// ---------------- CHAT SERVICES ----------------

export function subscribeToChatMessages(rideId: string, callback: (messages: ChatMessage[]) => void) {
  const path = "chats";
  const chatQuery = query(
    collection(db, "chats"),
    where("rideId", "==", rideId),
    orderBy("createdAt", "asc")
  );

  return onSnapshot(chatQuery, (snapshot) => {
    const list: ChatMessage[] = [];
    snapshot.forEach((doc) => {
      list.push({ id: doc.id, ...doc.data() } as ChatMessage);
    });
    callback(list);
  }, (error) => {
    // Fallback without orderBy
    const fallbackQuery = query(
      collection(db, "chats"),
      where("rideId", "==", rideId)
    );
    onSnapshot(fallbackQuery, (snapshot) => {
      const list: ChatMessage[] = [];
      snapshot.forEach((doc) => {
        list.push({ id: doc.id, ...doc.data() } as ChatMessage);
      });
      callback(list.sort((a, b) => {
        const timeA = a.createdAt instanceof Timestamp ? a.createdAt.toMillis() : new Date(a.createdAt).getTime();
        const timeB = b.createdAt instanceof Timestamp ? b.createdAt.toMillis() : new Date(b.createdAt).getTime();
        return timeA - timeB;
      }));
    }, (err) => {
      handleFirestoreError(err, OperationType.GET, path);
    });
  });
}

export async function sendChatMessage(rideId: string, sender: 'driver' | 'passenger', text: string) {
  const path = "chats";
  try {
    await addDoc(collection(db, "chats"), {
      rideId,
      sender,
      text,
      createdAt: Timestamp.now()
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

// ---------------- REAL-TIME RIDE SERVICES ----------------

export async function createPassengerRide(rideData: {
  passengerName: string;
  passengerPhone: string;
  pickupAddress: string;
  dropoffAddress: string;
  price: number;
  distance: number;
  pickupCoords: { lat: number; lng: number };
  dropoffCoords: { lat: number; lng: number };
}) {
  const path = "rides";
  try {
    const fullRideData = {
      ...rideData,
      status: "pending" as RideStatus,
      driverId: null,
      driverName: null,
      createdAt: Timestamp.now()
    };
    const docRef = await addDoc(collection(db, "rides"), fullRideData);
    return { id: docRef.id, ...fullRideData };
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

