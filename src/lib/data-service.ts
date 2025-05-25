
// src/lib/data-service.ts
import { auth, db } from './firebase';
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
  doc,
  deleteDoc,
} from 'firebase/firestore';

export interface JournalEntry {
  id: string;
  date: string;
  description: string;
  debitAccount: string;
  creditAccount: string;
  amount: number;
  tags?: string[];
  creatorUserId: string;
  companyId: string; // Now mandatory for scoping
  createdAt: Timestamp | { seconds: number, nanoseconds: number };
}

export interface Notification {
  id: string;
  message: string;
  type: 'new_entry' | 'user_joined' | 'document_upload';
  timestamp: Timestamp | { seconds: number, nanoseconds: number };
  userId?: string;
  relatedId?: string;
  companyId: string; // Now mandatory for scoping
}

const JOURNAL_COLLECTION = 'journalEntries';
const NOTIFICATION_COLLECTION = 'notifications';
// const KENESIS_COMPANY_ID = 'KENESIS_GLOBAL_CORP'; // No longer hardcoded

export async function addNotification(
  message: string,
  type: Notification['type'],
  companyId: string, // Require companyId
  userId?: string,
  relatedId?: string
): Promise<void> {
  const currentUser = auth.currentUser;
  if (!companyId) {
    console.error("Error adding notification: companyId is required.");
    return;
  }
  try {
    await addDoc(collection(db, NOTIFICATION_COLLECTION), {
      message,
      type,
      userId: userId || (currentUser ? currentUser.uid : null),
      relatedId: relatedId || null,
      companyId: companyId, // Use provided companyId
      timestamp: serverTimestamp(),
    });
  } catch (error) {
    console.error("Error adding notification to Firestore:", error);
  }
}

export async function getNotifications(companyId: string): Promise<Notification[]> {
  console.log(`DataService: Fetching notifications for company ${companyId}...`);
  const startTime = Date.now();
  const currentUser = auth.currentUser;
  if (!currentUser) {
     console.warn(`No authenticated user found. Cannot fetch notifications for company ${companyId}.`);
     return [];
  }
  if (!companyId) {
    console.warn("Cannot fetch notifications: companyId is missing.");
    return [];
  }

  try {
    const q = query(
      collection(db, NOTIFICATION_COLLECTION),
      where("companyId", "==", companyId), // Filter by companyId
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
    const endTime = Date.now();
    console.log(`DataService: Fetched ${notifications.length} notifications for company ${companyId} in ${endTime - startTime}ms.`);
    return notifications;
  } catch (error) {
    const endTime = Date.now();
    console.error(`Error fetching notifications for company ${companyId} from Firestore (took ${endTime - startTime}ms):`, error);
    throw error;
  }
}

export async function getJournalEntries(companyId: string): Promise<JournalEntry[]> {
  console.log(`DataService: Fetching journal entries for company ${companyId}...`);
  const startTime = Date.now();
  const currentUser = auth.currentUser;
  if (!currentUser) {
     console.warn(`No authenticated user found. Cannot fetch journal entries for company ${companyId}.`);
     return [];
  }
  if (!companyId) {
    console.warn("Cannot fetch journal entries: companyId is missing.");
    return [];
  }

  try {
    const q = query(
      collection(db, JOURNAL_COLLECTION),
      where("companyId", "==", companyId), // Filter by companyId
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
    console.log(`DataService: Fetched ${entries.length} journal entries for company ${companyId} in ${endTime - startTime}ms.`);
    return entries;
  } catch (error) {
    const endTime = Date.now();
    console.error(`Error fetching journal entries for company ${companyId} from Firestore (took ${endTime - startTime}ms):`, error);
    throw error;
  }
}

export async function addJournalEntry(
  companyId: string, // Require companyId
  newEntryData: Omit<JournalEntry, 'id' | 'creatorUserId' | 'companyId' | 'createdAt'>
): Promise<JournalEntry> {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    console.error("No authenticated user. Cannot add journal entry.");
    throw new Error("User not authenticated. Cannot add entry.");
  }
  if (!companyId) {
    console.error("Cannot add journal entry: companyId is required.");
    throw new Error("Company ID is required to add an entry.");
  }

  try {
    const entryToSave = {
      ...newEntryData,
      creatorUserId: currentUser.uid,
      companyId: companyId, // Use provided companyId
      createdAt: serverTimestamp() as Timestamp,
      tags: newEntryData.tags || [],
    };
    const docRef = await addDoc(collection(db, JOURNAL_COLLECTION), entryToSave);

    const savedEntry: JournalEntry = {
      id: docRef.id,
      ...entryToSave,
      createdAt: Timestamp.now() // Approximate for immediate use
    };
    
    const shortDesc = savedEntry.description.length > 30 ? savedEntry.description.substring(0, 27) + "..." : savedEntry.description;
    const amountFormatted = savedEntry.amount.toLocaleString('en-IN', { style: 'currency', currency: 'INR' });
    const userName = currentUser.displayName || `User ...${currentUser.uid.slice(-6)}`;
    addNotification(
      `${userName} added entry: '${shortDesc}' (${amountFormatted})`,
      'new_entry',
      companyId, // Pass companyId
      currentUser.uid,
      savedEntry.id
    ).catch(err => console.error("Failed to add notification for single entry:", err));

    return savedEntry;

  } catch (error) {
    console.error(`Error adding journal entry to Firestore for company ${companyId}:`, error);
    throw error;
  }
}

export async function addJournalEntries(
  companyId: string, // Require companyId
  newEntriesData: Omit<JournalEntry, 'id' | 'creatorUserId' | 'companyId' | 'createdAt'>[]
): Promise<JournalEntry[]> {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    console.error("No authenticated user. Cannot add journal entries.");
    throw new Error("User not authenticated. Cannot add entries.");
  }
  if (!companyId) {
    console.error("Cannot add journal entries: companyId is required.");
    throw new Error("Company ID is required to add entries.");
  }

  const batch = writeBatch(db);
  const preparedEntries: JournalEntry[] = [];

  newEntriesData.forEach(newData => {
    const docRef = doc(collection(db, JOURNAL_COLLECTION));
    const entryToSave = {
      ...newData,
      creatorUserId: currentUser.uid,
      companyId: companyId, // Use provided companyId
      createdAt: serverTimestamp() as Timestamp,
      tags: newData.tags || [],
    };
    batch.set(docRef, entryToSave);
    preparedEntries.push({
      id: docRef.id,
      ...entryToSave,
      createdAt: Timestamp.now()
    });
  });

  try {
    await batch.commit();

    const processNotificationsInBackground = async () => {
      try {
        const notificationPromises = preparedEntries.map(savedEntry => {
          const shortDesc = savedEntry.description.length > 30 ? savedEntry.description.substring(0, 27) + "..." : savedEntry.description;
          const amountFormatted = savedEntry.amount.toLocaleString('en-IN', { style: 'currency', currency: 'INR' });
          const userName = currentUser.displayName || `User ...${currentUser.uid.slice(-6)}`;
          return addNotification(
            `${userName} added entry from document: '${shortDesc}' (${amountFormatted})`,
            'document_upload',
            companyId, // Pass companyId
            currentUser.uid,
            savedEntry.id
          );
        });
        Promise.allSettled(notificationPromises).then(results => {
          results.forEach(result => {
            if (result.status === 'rejected') {
              console.error("Background: Failed to add a notification for a batch entry:", result.reason);
            }
          });
        }).catch(err => console.error("Error in background notification processing wrapper itself:", err));
      } catch (err) {
        console.error("Error setting up background notification processing:", err);
      }
    };
    processNotificationsInBackground();
    return preparedEntries;
  } catch (error) {
    console.error(`Error adding journal entries to Firestore for company ${companyId} in batch:`, error);
    throw error;
  }
}

export async function deleteJournalEntry(companyId: string, entryId: string): Promise<void> {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    console.error("No authenticated user. Cannot delete journal entry.");
    throw new Error("User not authenticated. Cannot delete entry.");
  }
   if (!companyId) {
    console.error("Cannot delete journal entry: companyId is required.");
    throw new Error("Company ID is required to delete an entry.");
  }

  try {
    // Potentially verify if the entry indeed belongs to the companyId before deleting,
    // though Firestore rules should be the primary enforcer.
    const entryRef = doc(db, JOURNAL_COLLECTION, entryId);
    await deleteDoc(entryRef);
    console.log(`DataService: Deleted journal entry ${entryId} for company ${companyId}`);
    
    const userName = currentUser.displayName || `User ...${currentUser.uid.slice(-6)}`;
    addNotification(
      `${userName} deleted journal entry ID: ${entryId.slice(0,8)}...`,
      'new_entry', // or 'entry_deleted'
      companyId, // Pass companyId
      currentUser.uid,
      entryId
    ).catch(err => console.error("Failed to add notification for entry deletion:", err));

  } catch (error) {
    console.error(`Error deleting journal entry ${entryId} from Firestore for company ${companyId}:`, error);
    throw error;
  }
}

export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  // companyIds: string[]; // Consider how to manage user's association with companies
}
