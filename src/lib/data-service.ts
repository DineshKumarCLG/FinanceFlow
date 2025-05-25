
// src/lib/data-service.ts

export interface JournalEntry {
  id: string;
  date: string; // YYYY-MM-DD
  description: string;
  debitAccount: string;
  creditAccount: string;
  amount: number;
  tags?: string[];
}

const JOURNAL_STORAGE_KEY = 'financeflow_journal_entries_v1'; // Added versioning to key

// Function to get journal entries from localStorage
function getJournalEntriesFromStorage(): JournalEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    const stored = localStorage.getItem(JOURNAL_STORAGE_KEY);
    const parsed = stored ? JSON.parse(stored) : [];
    // Basic validation to ensure it's an array
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error("Error reading journal entries from localStorage:", error);
    return []; // Return empty array on error
  }
}

// Function to save journal entries to localStorage
function saveJournalEntriesToStorage(entries: JournalEntry[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(JOURNAL_STORAGE_KEY, JSON.stringify(entries));
  } catch (error) {
    console.error("Error saving journal entries to localStorage:", error);
  }
}

// --- Exported Service Functions ---

export async function getJournalEntries(): Promise<JournalEntry[]> {
  // Simulate async operation if needed, but localStorage is sync
  await new Promise(resolve => setTimeout(resolve, 0)); 
  return getJournalEntriesFromStorage();
}

export async function addJournalEntry(newEntryData: Omit<JournalEntry, 'id'>): Promise<JournalEntry> {
  const entries = getJournalEntriesFromStorage();
  const entry: JournalEntry = {
    ...newEntryData,
    id: Date.now().toString() + Math.random().toString(36).substring(2, 9), // More robust unique ID
    tags: newEntryData.tags || [],
  };
  entries.push(entry);
  saveJournalEntriesToStorage(entries);
  // Simulate async operation
  await new Promise(resolve => setTimeout(resolve, 0));
  return entry;
}

export async function addJournalEntries(newEntriesData: Omit<JournalEntry, 'id'>[]): Promise<JournalEntry[]> {
  const entries = getJournalEntriesFromStorage();
  const added: JournalEntry[] = [];
  newEntriesData.forEach(newData => {
    const entry: JournalEntry = {
      ...newData,
      id: Date.now().toString() + Math.random().toString(36).substring(2, 9) + newData.description.slice(0,5).replace(/\s/g, ''), // More robust unique ID
      tags: newData.tags || [],
    };
    entries.push(entry);
    added.push(entry);
  });
  saveJournalEntriesToStorage(entries);
  // Simulate async operation
  await new Promise(resolve => setTimeout(resolve, 0));
  return added;
}
