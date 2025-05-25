
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
const KENESIS_COMPANY_ID = 'KENESIS_GLOBAL_CORP'; // Define a constant ID for KENESIS

// --- Notification Service Functions ---

export async function addNotification(
  message: string, 
  type: Notification['type'], 
  userId?: string,
  relatedId?: string
): Promise<void> {
  const currentUser = auth.currentUser; // Re-check auth status if necessary or rely on calling context
  try {
    await addDoc(collection(db, NOTIFICATION_COLLECTION), {
      message,
      type,
      userId: userId || (currentUser ? currentUser.uid : null), // Ensure userId is captured if available
      relatedId: relatedId || null,
      companyId: KENESIS_COMPANY_ID,
      timestamp: serverTimestamp(),
    });
  } catch (error) {
    console.error("Error adding notification to Firestore:", error);
    // Optionally, re-throw or handle more gracefully
  }
}

export async function getNotifications(): Promise<Notification[]> {
  const currentUser = auth.currentUser;
  if (!currentUser && KENESIS_COMPANY_ID !== 'KENESIS_GLOBAL_CORP') { // Example: only restrict if not global company
    // Or handle as per your app's auth policy for viewing global notifications
    console.warn("User not authenticated or not authorized for notifications of this company.");
    return []; 
  }

  try {
    const q = query(
      collection(db, NOTIFICATION_COLLECTION),
      where("companyId", "==", KENESIS_COMPANY_ID),
      orderBy("timestamp", "desc")
      // limit(20) // Optionally limit the number of notifications fetched
    );
    const querySnapshot = await getDocs(q);
    const notifications: Notification[] = [];
    querySnapshot.forEach((docSnap) => { // Renamed doc to docSnap to avoid conflict
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
    return notifications;
  } catch (error) {
    console.error("Error fetching KENESIS notifications from Firestore:", error);
    throw error;
  }
}


// --- Journal Entry Service Functions ---

export async function getJournalEntries(): Promise<JournalEntry[]> {
  const currentUser = auth.currentUser;
  if (!currentUser && KENESIS_COMPANY_ID !== 'KENESIS_GLOBAL_CORP') {
    console.warn("No authenticated user found. Cannot fetch journal entries for this company unless it's global.");
    return []; 
  }
  // For a global company like KENESIS, we might allow fetching even without specific user check,
  // or enforce that a user must be logged in anyway. For now, let's assume logged-in users see KENESIS data.
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
    querySnapshot.forEach((docSnap) => { // Renamed doc to docSnap
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
    return entries;
  } catch (error) {
    console.error("Error fetching KENESIS journal entries from Firestore:", error);
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
      createdAt: Timestamp.now() // Client-side placeholder, Firestore has server timestamp
    };

    // Add notification for the new entry
    const shortDesc = savedEntry.description.length > 30 ? savedEntry.description.substring(0, 27) + "..." : savedEntry.description;
    const amountFormatted = savedEntry.amount.toLocaleString('en-IN', { style: 'currency', currency: 'INR' });
    // Fire and forget for single entry notification too for consistency, or await if preferred for single entries
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
    await batch.commit(); // Commit all journal entries first

    // Process notifications in the background (fire-and-forget)
    const processNotificationsInBackground = async () => {
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

      // Use Promise.allSettled to ensure all notification attempts are made,
      // even if some fail, without stopping others or throwing an error for the whole process.
      const notificationResults = await Promise.allSettled(notificationPromises);
      notificationResults.forEach(result => {
        if (result.status === 'rejected') {
          console.error("Background: Failed to add a notification for a batch entry:", result.reason);
        }
      });
    };
    
    // Start processing notifications but don't wait for it to complete here
    processNotificationsInBackground().catch(err => {
        // Catch any errors from the async wrapper itself, though individual errors inside are handled
        console.error("Error in overall background notification processing:", err);
    });
    
    return preparedEntries; 
  } catch (error) {
    console.error("Error adding KENESIS journal entries to Firestore in batch:", error);
    throw error;
  }
}

// Helper type for user profile if you decide to create a users collection
export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  companyIds: string[]; // List of company IDs the user belongs to, e.g., [KENESIS_COMPANY_ID]
}
