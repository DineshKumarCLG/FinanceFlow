
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
  companyId: string;
  createdAt: Timestamp | { seconds: number, nanoseconds: number };
}

export interface Notification {
  id: string;
  message: string;
  type: 'new_entry' | 'user_joined' | 'document_upload';
  timestamp: Timestamp | { seconds: number, nanoseconds: number };
  userId?: string;
  relatedId?: string;
  companyId: string;
}

const JOURNAL_COLLECTION = 'journalEntries';
const NOTIFICATION_COLLECTION = 'notifications';

export async function addNotification(
  message: string,
  type: Notification['type'],
  companyId: string,
  userId?: string,
  relatedId?: string
): Promise<void> {
  const currentUser = auth.currentUser;
  if (!companyId) {
    console.error("DataService: Error adding notification: companyId is required.");
    return;
  }
  const notificationData = {
    message,
    type,
    userId: userId || (currentUser ? currentUser.uid : 'SYSTEM'), // Fallback for system notifications if needed
    relatedId: relatedId || null,
    companyId: companyId, // This should be the active companyId from context
    timestamp: serverTimestamp(),
  };
  console.log(`DataService: Attempting to add notification for company '${companyId}' by user '${currentUser?.uid || 'SYSTEM'}'. Data:`, notificationData);
  try {
    await addDoc(collection(db, NOTIFICATION_COLLECTION), notificationData);
    console.log(`DataService: Successfully added notification for company '${companyId}'.`);
  } catch (error) {
    console.error(`DataService: Error adding notification to Firestore for company '${companyId}':`, error);
  }
}

export async function getNotifications(companyId: string): Promise<Notification[]> {
  const startTime = Date.now();
  const currentUser = auth.currentUser;
  if (!currentUser) {
     console.warn(`DataService: No authenticated user. Cannot fetch notifications for company '${companyId}'.`);
     return [];
  }
  if (!companyId) {
    console.warn("DataService: Cannot fetch notifications: companyId is missing.");
    return [];
  }
  console.log(`DataService: User '${currentUser.uid}' attempting to fetch notifications for company '${companyId}'...`);

  try {
    const q = query(
      collection(db, NOTIFICATION_COLLECTION),
      where("companyId", "==", companyId),
      orderBy("timestamp", "desc")
    );
    console.log(`DataService: Notifications query for company '${companyId}':`, q);
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
    console.log(`DataService: Fetched ${notifications.length} notifications for company '${companyId}' (User: ${currentUser.uid}) in ${endTime - startTime}ms.`);
    return notifications;
  } catch (error) {
    const endTime = Date.now();
    console.error(`DataService: Error fetching notifications for company '${companyId}' (User: ${currentUser.uid}) from Firestore (took ${endTime - startTime}ms):`, error);
    throw error; // Re-throw to be caught by UI
  }
}

export async function getJournalEntries(companyId: string): Promise<JournalEntry[]> {
  const startTime = Date.now();
  const currentUser = auth.currentUser;
  if (!currentUser) {
     console.warn(`DataService: No authenticated user. Cannot fetch journal entries for company '${companyId}'.`);
     return [];
  }
  if (!companyId) {
    console.warn("DataService: Cannot fetch journal entries: companyId is missing.");
    return [];
  }
  console.log(`DataService: User '${currentUser.uid}' attempting to fetch journal entries for company '${companyId}'...`);

  try {
    const q = query(
      collection(db, JOURNAL_COLLECTION),
      where("companyId", "==", companyId),
      orderBy("date", "desc"),
      orderBy("createdAt", "desc")
    );
    console.log(`DataService: Journal entries query for company '${companyId}':`, q);
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
    console.log(`DataService: Fetched ${entries.length} journal entries for company '${companyId}' (User: ${currentUser.uid}) in ${endTime - startTime}ms.`);
    return entries;
  } catch (error) {
    const endTime = Date.now();
    console.error(`DataService: Error fetching journal entries for company '${companyId}' (User: ${currentUser.uid}) from Firestore (took ${endTime - startTime}ms):`, error);
    throw error; // Re-throw to be caught by UI
  }
}

export async function addJournalEntry(
  companyId: string,
  newEntryData: Omit<JournalEntry, 'id' | 'creatorUserId' | 'companyId' | 'createdAt'>
): Promise<JournalEntry> {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    console.error("DataService: No authenticated user. Cannot add journal entry.");
    throw new Error("User not authenticated. Cannot add entry.");
  }
  if (!companyId) {
    console.error("DataService: Cannot add journal entry: companyId is required.");
    throw new Error("Company ID is required to add an entry.");
  }

  const entryToSave = {
    ...newEntryData,
    creatorUserId: currentUser.uid,
    companyId: companyId, // Ensure this is the active companyId from context
    createdAt: serverTimestamp() as Timestamp,
    tags: newEntryData.tags || [],
  };
  console.log(`DataService: User '${currentUser.uid}' attempting to add journal entry for company '${companyId}'. Data:`, entryToSave);

  try {
    const docRef = await addDoc(collection(db, JOURNAL_COLLECTION), entryToSave);
    console.log(`DataService: Successfully added journal entry with ID ${docRef.id} for company '${companyId}'.`);

    const savedEntry: JournalEntry = {
      id: docRef.id,
      ...entryToSave,
      createdAt: Timestamp.now()
    };

    const shortDesc = savedEntry.description.length > 30 ? savedEntry.description.substring(0, 27) + "..." : savedEntry.description;
    const amountFormatted = savedEntry.amount.toLocaleString('en-IN', { style: 'currency', currency: 'INR' });
    const userName = currentUser.displayName || `User ...${currentUser.uid.slice(-6)}`;
    addNotification(
      `${userName} added entry: '${shortDesc}' (${amountFormatted})`,
      'new_entry',
      companyId,
      currentUser.uid,
      savedEntry.id
    ).catch(err => console.error("DataService: Failed to add notification for single entry:", err));

    return savedEntry;

  } catch (error) {
    console.error(`DataService: Error adding journal entry to Firestore for company '${companyId}' (User: ${currentUser.uid}):`, error);
    throw error;
  }
}

export async function addJournalEntries(
  companyId: string,
  newEntriesData: Omit<JournalEntry, 'id' | 'creatorUserId' | 'companyId' | 'createdAt'>[]
): Promise<JournalEntry[]> {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    console.error("DataService: No authenticated user. Cannot add journal entries.");
    throw new Error("User not authenticated. Cannot add entries.");
  }
  if (!companyId) {
    console.error("DataService: Cannot add journal entries: companyId is required.");
    throw new Error("Company ID is required to add entries.");
  }
  console.log(`DataService: User '${currentUser.uid}' attempting to add ${newEntriesData.length} journal entries in batch for company '${companyId}'.`);

  const batch = writeBatch(db);
  const preparedEntries: JournalEntry[] = [];

  newEntriesData.forEach(newData => {
    const docRef = doc(collection(db, JOURNAL_COLLECTION));
    const entryToSave = {
      ...newData,
      creatorUserId: currentUser.uid,
      companyId: companyId,
      createdAt: serverTimestamp() as Timestamp,
      tags: newData.tags || [],
    };
    // console.log(`DataService: Preparing batch entry for company '${companyId}':`, entryToSave); // Can be very verbose
    batch.set(docRef, entryToSave);
    preparedEntries.push({
      id: docRef.id,
      ...entryToSave,
      createdAt: Timestamp.now()
    });
  });

  try {
    await batch.commit();
    console.log(`DataService: Successfully committed batch of ${preparedEntries.length} journal entries for company '${companyId}' (User: ${currentUser.uid}).`);

    // Run notification creation in the background, don't await
    const processNotificationsInBackground = async () => {
      try {
        const notificationPromises = preparedEntries.map(savedEntry => {
          const shortDesc = savedEntry.description.length > 30 ? savedEntry.description.substring(0, 27) + "..." : savedEntry.description;
          const amountFormatted = savedEntry.amount.toLocaleString('en-IN', { style: 'currency', currency: 'INR' });
          const userName = currentUser.displayName || `User ...${currentUser.uid.slice(-6)}`;
          return addNotification(
            `${userName} added entry from document: '${shortDesc}' (${amountFormatted})`,
            'document_upload',
            companyId,
            currentUser.uid,
            savedEntry.id
          );
        });
        // We are not awaiting these promises to prevent blocking the UI.
        // Errors will be logged by addNotification itself.
        Promise.allSettled(notificationPromises).then(results => {
           results.forEach(result => {
            if (result.status === 'rejected') {
              console.error("DataService (Background Notification): Failed to add a notification for a batch entry:", result.reason);
            }
          });
        }).catch(err => console.error("DataService (Background Notification Wrapper): Error processing notifications:", err));
      } catch (err) {
        console.error("DataService (Background Notification Setup): Error setting up background notification processing:", err);
      }
    };
    processNotificationsInBackground();

    return preparedEntries;
  } catch (error) {
    console.error(`DataService: Error adding journal entries to Firestore for company '${companyId}' (User: ${currentUser.uid}) in batch:`, error);
    throw error;
  }
}

export async function deleteJournalEntry(companyId: string, entryId: string): Promise<void> {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    console.error("DataService: No authenticated user. Cannot delete journal entry.");
    throw new Error("User not authenticated. Cannot delete entry.");
  }
   if (!companyId) {
    console.error("DataService: Cannot delete journal entry: companyId is required.");
    throw new Error("Company ID is required to delete an entry.");
  }
  console.log(`DataService: User '${currentUser.uid}' attempting to delete journal entry ID '${entryId}' for company '${companyId}'.`);

  try {
    const entryRef = doc(db, JOURNAL_COLLECTION, entryId);
    await deleteDoc(entryRef);
    console.log(`DataService: Successfully deleted journal entry ${entryId} for company ${companyId}`);

    const userName = currentUser.displayName || `User ...${currentUser.uid.slice(-6)}`;
    addNotification(
      `${userName} deleted journal entry ID: ${entryId.slice(0,8)}...`,
      'new_entry', // Or a new 'entry_deleted' type
      companyId,
      currentUser.uid,
      entryId
    ).catch(err => console.error("DataService: Failed to add notification for entry deletion:", err));

  } catch (error) {
    console.error(`DataService: Error deleting journal entry ${entryId} from Firestore for company ${companyId} (User: ${currentUser.uid}):`, error);
    throw error;
  }
}

export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
}
