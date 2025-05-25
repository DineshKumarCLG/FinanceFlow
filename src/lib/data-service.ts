
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
  deleteDoc
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
  companyId: string;
  createdAt: Timestamp;
}

export interface Notification {
  id: string;
  message: string;
  type: 'new_entry' | 'user_joined' | 'document_upload' | 'deleted_entry';
  timestamp: Timestamp;
  userId?: string;
  relatedId?: string;
  companyId: string;
}

const JOURNAL_COLLECTION = 'journalEntries';
const NOTIFICATION_COLLECTION = 'notifications';

export async function addNotification(
  message: string,
  type: Notification['type'],
  userId?: string,
  relatedId?: string,
  companyId?: string // Added companyId parameter
): Promise<void> {
  const currentUser = auth.currentUser;
  const activeCompanyId = companyId || "UNKNOWN_COMPANY"; // Fallback if not provided
  console.log(`DataService (addNotification): Attempting to add notification for company '${activeCompanyId}'. Message: ${message}`);
  try {
    await addDoc(collection(db, NOTIFICATION_COLLECTION), {
      message,
      type,
      userId: userId || (currentUser ? currentUser.uid : "SYSTEM"),
      relatedId: relatedId || null,
      companyId: activeCompanyId, // Use the provided or resolved companyId
      timestamp: serverTimestamp(),
    });
    console.log(`DataService (addNotification): Notification added successfully for company '${activeCompanyId}'.`);
  } catch (error) {
    console.error(`DataService (addNotification): Error adding notification to Firestore for company '${activeCompanyId}':`, error);
  }
}

export async function getNotifications(companyId: string): Promise<Notification[]> {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    console.warn("DataService (getNotifications): No authenticated user. Cannot fetch notifications.");
    return [];
  }
  if (!companyId) {
    console.warn("DataService (getNotifications): No companyId provided. Cannot fetch notifications.");
    return [];
  }
  console.log(`DataService: User '${currentUser.uid}' attempting to fetch notifications for company '${companyId}'...`);
  const startTime = Date.now();
  try {
    const q = query(
      collection(db, NOTIFICATION_COLLECTION),
      where("companyId", "==", companyId),
      orderBy("timestamp", "desc")
    );
    console.log(`DataService (getNotifications): Query for company '${companyId}':`, q);
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
    console.log(`DataService (getNotifications): Fetched ${notifications.length} notifications for company '${companyId}' in ${endTime - startTime}ms.`);
    return notifications;
  } catch (error) {
    const endTime = Date.now();
    console.error(`DataService (getNotifications): Error fetching notifications for company '${companyId}' (took ${endTime - startTime}ms):`, error);
    throw error;
  }
}

export async function getJournalEntries(companyId: string): Promise<JournalEntry[]> {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    console.warn("DataService (getJournalEntries): No authenticated user. Cannot fetch journal entries.");
    return [];
  }
  if (!companyId) {
    console.warn("DataService (getJournalEntries): No companyId provided. Cannot fetch journal entries.");
    return [];
  }
  console.log(`DataService: User '${currentUser.uid}' attempting to fetch journal entries for company '${companyId}'...`);
  const startTime = Date.now();
  try {
    // Querying all entries for the company, not filtering by creatorUserId here
    // Security rules should enforce company-level access.
    const q = query(
      collection(db, JOURNAL_COLLECTION),
      where("companyId", "==", companyId),
      orderBy("date", "desc"),
      orderBy("createdAt", "desc")
    );
    console.log(`DataService (getJournalEntries): Query for company '${companyId}':`, q);
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
    console.log(`DataService (getJournalEntries): Fetched ${entries.length} journal entries for company '${companyId}' in ${endTime - startTime}ms.`);
    return entries;
  } catch (error) {
    const endTime = Date.now();
    console.error(`DataService (getJournalEntries): Error fetching journal entries for company '${companyId}' (took ${endTime - startTime}ms):`, error);
    throw error;
  }
}

export async function addJournalEntry(
  newEntryData: Omit<JournalEntry, 'id' | 'creatorUserId' | 'companyId' | 'createdAt'>,
  companyId: string
): Promise<JournalEntry> {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    console.error("DataService (addJournalEntry): No authenticated user. Cannot add journal entry.");
    throw new Error("User not authenticated. Cannot add entry.");
  }
  if (!companyId) {
    console.error("DataService (addJournalEntry): No companyId provided. Cannot add journal entry.");
    throw new Error("No companyId specified. Cannot add entry.");
  }

  const entryToSave = {
    ...newEntryData,
    creatorUserId: currentUser.uid,
    companyId: companyId,
    createdAt: serverTimestamp() as Timestamp,
    tags: newEntryData.tags || [],
  };
  console.log(`DataService (addJournalEntry): Adding journal entry for company '${companyId}' by user '${currentUser.uid}'. Data:`, JSON.stringify(entryToSave, null, 2));

  try {
    const docRef = await addDoc(collection(db, JOURNAL_COLLECTION), entryToSave);
    const savedEntry: JournalEntry = {
      id: docRef.id,
      ...entryToSave,
      createdAt: Timestamp.now() // Approximate for immediate return
    };
    console.log(`DataService (addJournalEntry): Journal entry added successfully with ID ${docRef.id} for company '${companyId}'.`);

    const userName = currentUser.displayName || `User ...${currentUser.uid.slice(-6)}`;
    const shortDesc = savedEntry.description.length > 30 ? savedEntry.description.substring(0, 27) + "..." : savedEntry.description;
    const amountFormatted = savedEntry.amount.toLocaleString('en-IN', { style: 'currency', currency: 'INR' });
    addNotification(
      `${userName} added entry: '${shortDesc}' (${amountFormatted})`,
      'new_entry',
      currentUser.uid,
      savedEntry.id,
      companyId
    ).catch(err => console.error("DataService (addJournalEntry): Failed to add notification for single entry:", err));

    return savedEntry;
  } catch (error) {
    console.error(`DataService (addJournalEntry): Error adding journal entry to Firestore for company '${companyId}':`, error);
    throw error;
  }
}

export async function addJournalEntries(
  newEntriesData: Omit<JournalEntry, 'id' | 'creatorUserId' | 'companyId' | 'createdAt'>[],
  companyId: string
): Promise<JournalEntry[]> {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    console.error("DataService (addJournalEntries): No authenticated user. Cannot add journal entries.");
    throw new Error("User not authenticated. Cannot add entries.");
  }
   if (!companyId) {
    console.error("DataService (addJournalEntries): No companyId provided. Cannot add journal entries.");
    throw new Error("No companyId specified. Cannot add entries.");
  }

  const batch = writeBatch(db);
  const preparedEntries: JournalEntry[] = [];
  console.log(`DataService (addJournalEntries): Preparing to add ${newEntriesData.length} entries for company '${companyId}' by user '${currentUser.uid}'.`);

  newEntriesData.forEach(newData => {
    const docRef = doc(collection(db, JOURNAL_COLLECTION));
    const entryToSave = {
      ...newData,
      creatorUserId: currentUser.uid,
      companyId: companyId,
      createdAt: serverTimestamp() as Timestamp,
      tags: newData.tags || [],
    };
    console.log(`DataService (addJournalEntries): Staging entry for batch. Data:`, JSON.stringify(entryToSave, null, 2));
    batch.set(docRef, entryToSave);
    preparedEntries.push({
      id: docRef.id,
      ...entryToSave,
      createdAt: Timestamp.now()
    });
  });

  try {
    await batch.commit();
    console.log(`DataService (addJournalEntries): Batch of ${preparedEntries.length} journal entries committed successfully for company '${companyId}'.`);

    const processNotificationsInBackground = async () => {
      try {
        const userName = currentUser.displayName || `User ...${currentUser.uid.slice(-6)}`;
        const notificationPromises = preparedEntries.map(savedEntry => {
          const shortDesc = savedEntry.description.length > 30 ? savedEntry.description.substring(0, 27) + "..." : savedEntry.description;
          const amountFormatted = savedEntry.amount.toLocaleString('en-IN', { style: 'currency', currency: 'INR' });
          return addNotification(
            `${userName} added entry from document: '${shortDesc}' (${amountFormatted})`,
            'document_upload',
            currentUser.uid,
            savedEntry.id,
            companyId
          );
        });
        Promise.allSettled(notificationPromises).then(results => {
          results.forEach(result => {
            if (result.status === 'rejected') {
              console.error("DataService (addJournalEntries Background): Failed to add a notification for a batch entry:", result.reason);
            }
          });
        }).catch(err => console.error("DataService (addJournalEntries Background): Error in notification processing wrapper:", err));
      } catch (err) {
        console.error("DataService (addJournalEntries Background): Error setting up background notification processing:", err);
      }
    };
    processNotificationsInBackground();
    return preparedEntries;
  } catch (error) {
    console.error(`DataService (addJournalEntries): Error adding journal entries to Firestore in batch for company '${companyId}':`, error);
    throw error;
  }
}

export async function deleteJournalEntry(entryId: string, companyId: string): Promise<void> {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    console.error("DataService (deleteJournalEntry): No authenticated user. Cannot delete entry.");
    throw new Error("User not authenticated");
  }
  if (!companyId) {
    console.error("DataService (deleteJournalEntry): No companyId provided. Cannot delete entry.");
    throw new Error("No companyId specified for deletion.");
  }
  console.log(`DataService: User '${currentUser.uid}' attempting to delete journal entry '${entryId}' for company '${companyId}'...`);
  try {
    // Firestore rules will verify if this user can delete this entry based on companyId and creatorUserId.
    const entryRef = doc(db, JOURNAL_COLLECTION, entryId);
    // Optionally, you might want to fetch the entry first to get details for the notification,
    // but for deletion, the rules should be the primary gatekeeper.
    await deleteDoc(entryRef);
    console.log(`DataService (deleteJournalEntry): Journal entry '${entryId}' deleted successfully for company '${companyId}'.`);

    const userName = currentUser.displayName || `User ...${currentUser.uid.slice(-6)}`;
    addNotification(
      `${userName} deleted entry ID: ${entryId.slice(0,10)}...`,
      'deleted_entry',
      currentUser.uid,
      entryId,
      companyId
    ).catch(err => console.error("DataService (deleteJournalEntry): Failed to add notification for deleted entry:", err));

  } catch (error) {
    console.error(`DataService (deleteJournalEntry): Error deleting journal entry '${entryId}' for company '${companyId}':`, error);
    throw error;
  }
}

    