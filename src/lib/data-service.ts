
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

const JOURNAL_COLLECTION = 'journalEntries';
const KENESIS_COMPANY_ID = 'KENESIS_GLOBAL_CORP'; // Define a constant ID for KENESIS

// --- Exported Service Functions ---

export async function getJournalEntries(): Promise<JournalEntry[]> {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    // If no user is logged in, they can't see any company data.
    console.warn("No authenticated user found. Cannot fetch journal entries for KENESIS.");
    return []; 
  }

  // All authenticated users can see KENESIS data.
  // In a multi-company app, you'd check if currentUser is part of KENESIS_COMPANY_ID.
  try {
    const q = query(
      collection(db, JOURNAL_COLLECTION), 
      where("companyId", "==", KENESIS_COMPANY_ID), // Filter by KENESIS company ID
      orderBy("date", "desc"), 
      orderBy("createdAt", "desc") 
    );
    const querySnapshot = await getDocs(q);
    const entries: JournalEntry[] = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      entries.push({
        id: doc.id,
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
      companyId: KENESIS_COMPANY_ID, // Associate with KENESIS
      createdAt: serverTimestamp() as Timestamp,
      tags: newEntryData.tags || [],
    };
    const docRef = await addDoc(collection(db, JOURNAL_COLLECTION), entryToSave);
    
    // Construct the return object, assuming serverTimestamp resolves correctly for createdAt
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
      createdAt: Timestamp.now() // Placeholder if serverTimestamp is tricky client-side, ideally fetch doc
    };
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
  const addedEntries: JournalEntry[] = [];

  try {
    newEntriesData.forEach(newData => {
      const docRef = doc(collection(db, JOURNAL_COLLECTION)); 
      const entryToSave = {
        ...newData,
        creatorUserId: currentUser.uid,
        companyId: KENESIS_COMPANY_ID, // Associate with KENESIS
        createdAt: serverTimestamp() as Timestamp,
        tags: newData.tags || [],
      };
      batch.set(docRef, entryToSave);
      
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
        createdAt: Timestamp.now() // Placeholder
      };
      addedEntries.push(savedEntry);
    });

    await batch.commit();
    return addedEntries;
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
