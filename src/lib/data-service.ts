
// src/lib/data-service.ts
import { auth, db } from './firebase'; // Import Firebase instances
import { 
  collection, 
  addDoc, 
  getDocs, 
  query, 
  where, 
  orderBy,
  Timestamp, // Import Timestamp
  serverTimestamp, // For server-side timestamping if needed
  writeBatch,
  doc
} from 'firebase/firestore';

export interface JournalEntry {
  id: string; // Firestore document ID
  date: string; // YYYY-MM-DD string format for consistency with existing UI
  description: string;
  debitAccount: string;
  creditAccount: string;
  amount: number;
  tags?: string[];
  userId?: string; // To associate with a Firebase user
  createdAt?: Timestamp; // Firestore Timestamp for ordering
}

const JOURNAL_COLLECTION = 'journalEntries';

// --- Exported Service Functions ---

export async function getJournalEntries(): Promise<JournalEntry[]> {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    console.warn("No authenticated user found. Cannot fetch journal entries.");
    return []; // Or throw new Error("User not authenticated");
  }

  try {
    const q = query(
      collection(db, JOURNAL_COLLECTION), 
      where("userId", "==", currentUser.uid),
      orderBy("date", "desc"), // Keep YYYY-MM-DD string sort, or use createdAt (Timestamp)
      orderBy("createdAt", "desc") // Secondary sort by Firestore timestamp for consistency
    );
    const querySnapshot = await getDocs(q);
    const entries: JournalEntry[] = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      entries.push({
        id: doc.id,
        date: data.date, // Assuming date is stored as YYYY-MM-DD string
        description: data.description,
        debitAccount: data.debitAccount,
        creditAccount: data.creditAccount,
        amount: data.amount,
        tags: data.tags || [],
        userId: data.userId,
        createdAt: data.createdAt, // Keep as Firestore Timestamp
      });
    });
    return entries;
  } catch (error) {
    console.error("Error fetching journal entries from Firestore:", error);
    throw error; // Re-throw or handle as appropriate
  }
}

export async function addJournalEntry(newEntryData: Omit<JournalEntry, 'id' | 'userId' | 'createdAt'>): Promise<JournalEntry> {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    console.error("No authenticated user. Cannot add journal entry.");
    throw new Error("User not authenticated. Cannot add entry.");
  }

  try {
    const entryToSave = {
      ...newEntryData,
      userId: currentUser.uid,
      createdAt: serverTimestamp() as Timestamp, // Use serverTimestamp for reliable ordering
      tags: newEntryData.tags || [],
    };
    const docRef = await addDoc(collection(db, JOURNAL_COLLECTION), entryToSave);
    return {
      id: docRef.id,
      ...entryToSave,
    } as JournalEntry; // Cast because serverTimestamp returns aFieldValue
  } catch (error) {
    console.error("Error adding journal entry to Firestore:", error);
    throw error;
  }
}

export async function addJournalEntries(newEntriesData: Omit<JournalEntry, 'id' | 'userId' | 'createdAt'>[]): Promise<JournalEntry[]> {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    console.error("No authenticated user. Cannot add journal entries.");
    throw new Error("User not authenticated. Cannot add entries.");
  }

  const batch = writeBatch(db);
  const addedEntries: JournalEntry[] = [];

  try {
    newEntriesData.forEach(newData => {
      const docRef = doc(collection(db, JOURNAL_COLLECTION)); // Create a new doc ref for each entry
      const entryToSave = {
        ...newData,
        userId: currentUser.uid,
        createdAt: serverTimestamp() as Timestamp,
        tags: newData.tags || [],
      };
      batch.set(docRef, entryToSave);
      addedEntries.push({ 
        id: docRef.id, 
        ...entryToSave,
      } as JournalEntry); // Store locally to return, id will be correct
    });

    await batch.commit();
    return addedEntries;
  } catch (error) {
    console.error("Error adding journal entries to Firestore in batch:", error);
    throw error;
  }
}
