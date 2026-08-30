import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  updateProfile 
} from 'firebase/auth';
import { getFirestore, doc, getDocFromServer, setDoc } from 'firebase/firestore';
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import firebaseConfig from '../../firebase-applet-config.json';

export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, (firebaseConfig as any).firestoreDatabaseId);
export const auth = getAuth(app);
export const storage = getStorage(app, (firebaseConfig as any).storageBucket);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

/**
 * Upload a media file/blob to Cloud Storage or Server Upload with public URL return
 */
export async function uploadMediaToCloudStorage(
  fileOrBlob: Blob | File,
  storagePath: string,
  contentType?: string
): Promise<{ downloadUrl: string; fullPath: string; size: number }> {
  const mime = contentType || fileOrBlob.type || 'application/octet-stream';
  const size = fileOrBlob.size;

  // Try direct Firebase Cloud Storage first with a strict timeout to prevent hanging
  try {
    const uploadPromise = (async () => {
      const sRef = storageRef(storage, storagePath);
      const snapshot = await uploadBytes(sRef, fileOrBlob, {
        contentType: mime
      });
      const downloadUrl = await getDownloadURL(snapshot.ref);
      return {
        downloadUrl,
        fullPath: storagePath,
        size
      };
    })();

    const timeoutPromise = new Promise<{ downloadUrl: string; fullPath: string; size: number }>((_, reject) => {
      setTimeout(() => reject(new Error('Firebase storage upload timed out (2.5s)')), 2500);
    });

    return await Promise.race([uploadPromise, timeoutPromise]);
  } catch (storageErr) {
    console.warn('Firebase direct storage upload fallback to API proxy:', storageErr);
  }

  // Fallback to server media upload endpoint for seamless reliability
  const reader = new FileReader();
  const fileData = await new Promise<string>((resolve, reject) => {
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(fileOrBlob);
  });

  const payload = {
    fileData,
    fileName: (fileOrBlob as File).name || 'media_file',
    path: storagePath,
    mimeType: mime,
    userId: auth.currentUser?.uid
  };

  const res = await fetch('/api/storage/upload', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Upload failed (${res.status}): ${errText}`);
  }

  const data = await res.json();
  return {
    downloadUrl: data.downloadUrl || data.url,
    fullPath: data.fullPath || storagePath,
    size: data.size || size
  };
}

export async function signInWithGoogle() {
  const result = await signInWithPopup(auth, googleProvider);
  return result.user;
}

export async function registerWithEmail(email: string, pass: string, name: string) {
  const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
  if (userCredential.user) {
    await updateProfile(userCredential.user, { displayName: name });
  }
  return userCredential.user;
}

export async function loginWithEmail(email: string, pass: string) {
  const userCredential = await signInWithEmailAndPassword(auth, email, pass);
  return userCredential.user;
}

export async function saveUserConsent(userId: string) {
  try {
    const userRef = doc(db, 'users', userId);
    await setDoc(userRef, {
      termsAccepted: true,
      termsAcceptedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }, { merge: true });
  } catch (err) {
    console.warn('Could not save user consent to Firestore:', err);
  }
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export async function testFirestoreConnection() {
  try {
    if (auth.currentUser) {
      await getDocFromServer(doc(db, 'users', auth.currentUser.uid));
    }
  } catch (error) {
    // Silent catch for initial connection check
  }
}

export function cleanObject<T>(obj: T, visited = new WeakSet()): T {
  if (obj === null || obj === undefined || typeof obj !== 'object') {
    return obj;
  }
  
  if (visited.has(obj)) {
    return undefined as unknown as T;
  }
  visited.add(obj);

  if (Array.isArray(obj)) {
    return obj.map(item => cleanObject(item, visited)) as unknown as T;
  }
  const cleaned: any = {};
  for (const key of Object.keys(obj)) {
    const val = (obj as any)[key];
    if (val !== undefined) {
      cleaned[key] = cleanObject(val, visited);
    }
  }
  return cleaned;
}

