
// src/lib/data-service.ts
import { auth, db } from './firebase'; // Import Firebase instances
import { 
  collection, 
  addDoc, 
  getDocs, 
  query, 
  where, 
  orderBy,
  Timestamp, 
  serverTimestamp, 
  writeBatch,
  doc
} from 'firebase/firestore';

export interface JournalEntry {
  id: string; // Firestore document ID
  date: string; // YYYY-MM-DD string format
  description: string;
  debitAccount: string;
  creditAccount: string;
  amount: number;
  tags?: string[];
  creatorUserId: string; // Firebase user ID of the person who created the entry
  companyId: string; // ID of the company this entry belongs to
  createdAt: Timestamp; // Firestore Timestamp for ordering
}

export interface Notification {
  id: string;
  message: string;
  type: 'new_entry' | 'user_joined' | 'document_upload';
  timestamp: Timestamp;
  userId?: string; // User who performed the action
  relatedId?: string; // e.g., journal entry ID
  companyId: string;
}

const JOURNAL_COLLECTION = 'journalEntries';
const NOTIFICATION_COLLECTION = 'notifications';
const KENESIS_COMPANY_ID = 'KENESIS_GLOBAL_CORP'; 

// --- Notification Service Functions ---

export async function addNotification(
  message: string, 
  type: Notification['type'], 
  userId?: string,
  relatedId?: string
): Promise<void> {
  const currentUser = auth.currentUser;
  try {
    await addDoc(collection(db, NOTIFICATION_COLLECTION), {
      message,
      type,
      userId: userId || (currentUser ? currentUser.uid : null),
      relatedId: relatedId || null,
      companyId: KENESIS_COMPANY_ID,
      timestamp: serverTimestamp(),
    });
  } catch (error) {
    console.error("Error adding notification to Firestore:", error);
  }
}

export async function getNotifications(): Promise<Notification[]> {
  console.log("DataService: Fetching notifications...");
  const currentUser = auth.currentUser;
  if (!currentUser && KENESIS_COMPANY_ID !== 'KENESIS_GLOBAL_CORP') { 
    console.warn("User not authenticated or not authorized for notifications of this company.");
    return []; 
  }

  try {
    const q = query(
      collection(db, NOTIFICATION_COLLECTION),
      where("companyId", "==", KENESIS_COMPANY_ID),
      orderBy("timestamp", "desc")
    );
    const querySnapshot = await getDocs(q);
    const notifications: Notification[] = [];
    querySnapshot.forEach((docSnap) => { 
      const data = docSnap.data();
      notifications.push({
        id: docSnap.id,
        message: data.message,
        type: data.type,
        timestamp: data.timestamp,
        userId: data.userId,
        relatedId: data.relatedId,
        companyId: data.companyId,
      });
    });
    console.log(`DataService: Fetched ${notifications.length} notifications.`);
    return notifications;
  } catch (error) {
    console.error("Error fetching KENESIS notifications from Firestore:", error);
    throw error;
  }
}


// --- Journal Entry Service Functions ---

export async function getJournalEntries(): Promise<JournalEntry[]> {
  console.log("DataService: Fetching journal entries...");
  const startTime = Date.now();

  const currentUser = auth.currentUser;
  if (!currentUser && KENESIS_COMPANY_ID !== 'KENESIS_GLOBAL_CORP') {
    console.warn("No authenticated user found. Cannot fetch journal entries for this company unless it's global.");
    return []; 
  }
  if (!currentUser) {
     console.warn("No authenticated user found. Cannot fetch journal entries for KENESIS.");
     return [];
  }

  try {
    const q = query(
      collection(db, JOURNAL_COLLECTION), 
      where("companyId", "==", KENESIS_COMPANY_ID),
      orderBy("date", "desc"), 
      orderBy("createdAt", "desc") 
    );
    const querySnapshot = await getDocs(q);
    const entries: JournalEntry[] = [];
    querySnapshot.forEach((docSnap) => { 
      const data = docSnap.data();
      entries.push({
        id: docSnap.id,
        date: data.date,
        description: data.description,
        debitAccount: data.debitAccount,
        creditAccount: data.creditAccount,
        amount: data.amount,
        tags: data.tags || [],
        creatorUserId: data.creatorUserId,
        companyId: data.companyId,
        createdAt: data.createdAt,
      });
    });
    const endTime = Date.now();
    console.log(`DataService: Fetched ${entries.length} journal entries in ${endTime - startTime}ms.`);
    return entries;
  } catch (error) {
    const endTime = Date.now();
    console.error(`Error fetching KENESIS journal entries from Firestore (took ${endTime - startTime}ms):`, error);
    throw error;
  }
}

export async function addJournalEntry(newEntryData: Omit<JournalEntry, 'id' | 'creatorUserId' | 'companyId' | 'createdAt'>): Promise<JournalEntry> {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    console.error("No authenticated user. Cannot add journal entry for KENESIS.");
    throw new Error("User not authenticated. Cannot add entry for KENESIS.");
  }

  try {
    const entryToSave = {
      ...newEntryData,
      creatorUserId: currentUser.uid,
      companyId: KENESIS_COMPANY_ID, 
      createdAt: serverTimestamp() as Timestamp,
      tags: newEntryData.tags || [],
    };
    const docRef = await addDoc(collection(db, JOURNAL_COLLECTION), entryToSave);
    
    const savedEntry: JournalEntry = {
      id: docRef.id,
      date: entryToSave.date,
      description: entryToSave.description,
      debitAccount: entryToSave.debitAccount,
      creditAccount: entryToSave.creditAccount,
      amount: entryToSave.amount,
      tags: entryToSave.tags,
      creatorUserId: entryToSave.creatorUserId,
      companyId: entryToSave.companyId,
      createdAt: Timestamp.now() 
    };

    const shortDesc = savedEntry.description.length > 30 ? savedEntry.description.substring(0, 27) + "..." : savedEntry.description;
    const amountFormatted = savedEntry.amount.toLocaleString('en-IN', { style: 'currency', currency: 'INR' });
    addNotification(
      `User ...${currentUser.uid.slice(-6)} added entry: '${shortDesc}' (${amountFormatted})`, 
      'new_entry', 
      currentUser.uid,
      savedEntry.id
    ).catch(err => console.error("Failed to add notification for single entry:", err));

    return savedEntry;

  } catch (error) {
    console.error("Error adding journal entry to Firestore for KENESIS:", error);
    throw error;
  }
}

export async function addJournalEntries(newEntriesData: Omit<JournalEntry, 'id' | 'creatorUserId' | 'companyId' | 'createdAt'>[]): Promise<JournalEntry[]> {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    console.error("No authenticated user. Cannot add journal entries for KENESIS.");
    throw new Error("User not authenticated. Cannot add entries for KENESIS.");
  }

  const batch = writeBatch(db);
  const preparedEntries: JournalEntry[] = [];

  newEntriesData.forEach(newData => {
    const docRef = doc(collection(db, JOURNAL_COLLECTION)); 
    const entryToSave = {
      ...newData,
      creatorUserId: currentUser.uid,
      companyId: KENESIS_COMPANY_ID,
      createdAt: serverTimestamp() as Timestamp,
      tags: newData.tags || [],
    };
    batch.set(docRef, entryToSave);

    preparedEntries.push({
      id: docRef.id,
      date: newData.date,
      description: newData.description,
      debitAccount: newData.debitAccount,
      creditAccount: newData.creditAccount,
      amount: newData.amount,
      tags: newData.tags || [],
      creatorUserId: currentUser.uid,
      companyId: KENESIS_COMPANY_ID,
      createdAt: Timestamp.now() 
    });
  });

  try {
    await batch.commit(); 
    
    // Process notifications in the background (fire-and-forget)
    // Do not await this promise chain here to make the UI responsive faster
    const processNotificationsInBackground = async () => {
      try {
        const notificationPromises = preparedEntries.map(savedEntry => {
          const shortDesc = savedEntry.description.length > 30 ? savedEntry.description.substring(0, 27) + "..." : savedEntry.description;
          const amountFormatted = savedEntry.amount.toLocaleString('en-IN', { style: 'currency', currency: 'INR' });
          return addNotification(
            `User ...${currentUser.uid.slice(-6)} added entry from document: '${shortDesc}' (${amountFormatted})`,
            'document_upload', 
            currentUser.uid,
            savedEntry.id
          );
        });
        
        const results = await Promise.allSettled(notificationPromises);
        results.forEach(result => {
          if (result.status === 'rejected') {
            console.error("Background: Failed to add a notification for a batch entry:", result.reason);
          }
        });
      } catch (err) {
        console.error("Error in background notification processing wrapper:", err);
      }
    };
    
    processNotificationsInBackground(); // Fire and forget
    
    return preparedEntries; 
  } catch (error) {
    console.error("Error adding KENESIS journal entries to Firestore in batch:", error);
    throw error;
  }
}

export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  companyIds: string[]; 
}
