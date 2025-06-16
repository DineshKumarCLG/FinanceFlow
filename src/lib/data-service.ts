
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
  // getDoc, // Potentially needed for update/get single invoice
  // updateDoc, // Potentially needed for update invoice
} from 'firebase/firestore';

export interface JournalEntry {
  id: string;
  date: string;
  description: string;
  debitAccount: string;
  creditAccount: string;
  amount: number; // This should be the total transaction amount including tax
  tags?: string[];
  creatorUserId: string;
  companyId: string;
  createdAt: Timestamp | { seconds: number, nanoseconds: number };

  // GST Related Fields
  taxableAmount?: number; // Amount before tax
  gstType?: 'igst' | 'cgst-sgst' | 'vat' | 'none'; // Type of GST/VAT
  gstRate?: number; // Overall rate, e.g., 18 for 18%
  igstAmount?: number;
  cgstAmount?: number;
  sgstAmount?: number;
  vatAmount?: number; // For generic non-Indian GST/VAT
  hsnSacCode?: string;
  partyGstin?: string; // GSTIN of the other party
  isInterState?: boolean; // For Indian GST to determine IGST vs CGST/SGST
}

export interface Notification {
  id: string;
  message: string;
  type: 'new_entry' | 'user_joined' | 'document_upload' | 'invoice_created';
  timestamp: Timestamp | { seconds: number, nanoseconds: number };
  userId?: string;
  relatedId?: string;
  companyId: string;
}

export interface InvoiceLineItem {
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number; // quantity * unitPrice
  hsnSacCode?: string;
  gstRate?: number; // Percentage
  gstAmount?: number;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  invoiceDate: string; // YYYY-MM-DD
  dueDate?: string; // YYYY-MM-DD
  customerName: string;
  customerGstin?: string;
  customerEmail?: string;
  billingAddress?: string;
  shippingAddress?: string;
  // lineItems: InvoiceLineItem[]; // For future enhancement
  itemsSummary?: string; // For initial AI extraction if line items are not structured
  subTotal: number; // Sum of line item amounts before tax
  totalGstAmount: number;
  totalAmount: number; // subTotal + totalGstAmount
  notes?: string;
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'void';
  companyId: string;
  creatorUserId: string;
  createdAt: Timestamp | { seconds: number, nanoseconds: number };
  updatedAt?: Timestamp | { seconds: number, nanoseconds: number };
}


const JOURNAL_COLLECTION = 'journalEntries';
const NOTIFICATION_COLLECTION = 'notifications';
const INVOICE_COLLECTION = 'invoices';


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
    userId: userId || (currentUser ? currentUser.uid : 'SYSTEM'),
    relatedId: relatedId || null,
    companyId: companyId,
    timestamp: serverTimestamp(),
  };
  try {
    await addDoc(collection(db, NOTIFICATION_COLLECTION), notificationData);
  } catch (error) {
    console.error(`DataService: Error adding notification to Firestore for company '${companyId}':`, error);
  }
}

export async function getNotifications(companyId: string): Promise<Notification[]> {
  const currentUser = auth.currentUser;
  if (!currentUser) {
     return [];
  }
  if (!companyId) {
    return [];
  }
  try {
    const q = query(
      collection(db, NOTIFICATION_COLLECTION),
      where("companyId", "==", companyId),
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
    return notifications;
  } catch (error) {
    console.error(`DataService: Error fetching notifications for company '${companyId}' (User: ${currentUser.uid}) from Firestore:`, error);
    throw error;
  }
}

export async function getJournalEntries(companyId: string): Promise<JournalEntry[]> {
  const currentUser = auth.currentUser;
  if (!currentUser) {
     return [];
  }
  if (!companyId) {
    return [];
  }
  try {
    const q = query(
      collection(db, JOURNAL_COLLECTION),
      where("companyId", "==", companyId),
      orderBy("date", "desc"),
      orderBy("createdAt", "desc")
    );
    const querySnapshot = await getDocs(q);
    const entries: JournalEntry[] = [];
    querySnapshot.forEach((docSnap) => {
      const data = docSnap.data();
      entries.push({
        id: docSnap.id,
        // Non-GST fields
        date: data.date,
        description: data.description,
        debitAccount: data.debitAccount,
        creditAccount: data.creditAccount,
        amount: data.amount,
        tags: data.tags || [],
        creatorUserId: data.creatorUserId,
        companyId: data.companyId,
        createdAt: data.createdAt,
        // GST fields
        taxableAmount: data.taxableAmount,
        gstType: data.gstType,
        gstRate: data.gstRate,
        igstAmount: data.igstAmount,
        cgstAmount: data.cgstAmount,
        sgstAmount: data.sgstAmount,
        vatAmount: data.vatAmount,
        hsnSacCode: data.hsnSacCode,
        partyGstin: data.partyGstin,
        isInterState: data.isInterState,
      });
    });
    return entries;
  } catch (error) {
    console.error(`DataService: Error fetching journal entries for company '${companyId}' (User: ${currentUser.uid}) from Firestore:`, error);
    throw error;
  }
}

// Base type for adding new entries, excluding server-generated fields
type NewEntryDataBase = Omit<JournalEntry, 'id' | 'creatorUserId' | 'companyId' | 'createdAt'>;

export async function addJournalEntry(
  companyId: string,
  newEntryData: NewEntryDataBase
): Promise<JournalEntry> {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    throw new Error("User not authenticated. Cannot add entry.");
  }
  if (!companyId) {
    throw new Error("Company ID is required to add an entry.");
  }

  const entryToSave = {
    date: newEntryData.date,
    description: newEntryData.description,
    debitAccount: newEntryData.debitAccount,
    creditAccount: newEntryData.creditAccount,
    amount: newEntryData.amount, // Total amount
    tags: newEntryData.tags || [],
    creatorUserId: currentUser.uid,
    companyId: companyId,
    createdAt: serverTimestamp() as Timestamp,
    // GST fields
    taxableAmount: newEntryData.taxableAmount,
    gstType: newEntryData.gstType,
    gstRate: newEntryData.gstRate,
    igstAmount: newEntryData.igstAmount,
    cgstAmount: newEntryData.cgstAmount,
    sgstAmount: newEntryData.sgstAmount,
    vatAmount: newEntryData.vatAmount,
    hsnSacCode: newEntryData.hsnSacCode,
    partyGstin: newEntryData.partyGstin,
    isInterState: newEntryData.isInterState,
  };

  try {
    const docRef = await addDoc(collection(db, JOURNAL_COLLECTION), entryToSave);
    const savedEntry: JournalEntry = {
      id: docRef.id,
      ...entryToSave,
      createdAt: Timestamp.now() // Use client-side timestamp for immediate return
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
  newEntriesData: NewEntryDataBase[]
): Promise<JournalEntry[]> {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    throw new Error("User not authenticated. Cannot add entries.");
  }
  if (!companyId) {
    throw new Error("Company ID is required to add entries.");
  }

  const batch = writeBatch(db);
  const preparedEntries: JournalEntry[] = [];
  const currentTime = Timestamp.now(); // For optimistic response

  newEntriesData.forEach(newData => {
    const docRef = doc(collection(db, JOURNAL_COLLECTION));
    const entryToSave = {
      date: newData.date,
      description: newData.description,
      debitAccount: newData.debitAccount,
      creditAccount: newData.creditAccount,
      amount: newData.amount, // Total amount
      tags: newData.tags || [],
      creatorUserId: currentUser.uid,
      companyId: companyId,
      createdAt: serverTimestamp() as Timestamp,
      // GST fields
      taxableAmount: newData.taxableAmount,
      gstType: newData.gstType,
      gstRate: newData.gstRate,
      igstAmount: newData.igstAmount,
      cgstAmount: newData.cgstAmount,
      sgstAmount: newData.sgstAmount,
      vatAmount: newData.vatAmount,
      hsnSacCode: newData.hsnSacCode,
      partyGstin: newData.partyGstin,
      isInterState: newData.isInterState,
    };
    batch.set(docRef, entryToSave);
    preparedEntries.push({
      id: docRef.id,
      ...entryToSave,
      createdAt: currentTime // Optimistic timestamp
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
            companyId,
            currentUser.uid,
            savedEntry.id
          );
        });
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
    throw new Error("User not authenticated. Cannot delete entry.");
  }
   if (!companyId) {
    throw new Error("Company ID is required to delete an entry.");
  }
  try {
    const entryRef = doc(db, JOURNAL_COLLECTION, entryId);
    await deleteDoc(entryRef);
    const userName = currentUser.displayName || `User ...${currentUser.uid.slice(-6)}`;
    addNotification(
      `${userName} deleted journal entry ID: ${entryId.slice(0,8)}...`,
      'new_entry',
      companyId,
      currentUser.uid,
      entryId
    ).catch(err => console.error("DataService: Failed to add notification for entry deletion:", err));

  } catch (error) {
    console.error(`DataService: Error deleting journal entry ${entryId} from Firestore for company ${companyId} (User: ${currentUser.uid}):`, error);
    throw error;
  }
}

// Base type for adding new Invoices, excluding server-generated fields
export type NewInvoiceData = Omit<Invoice, 'id' | 'companyId' | 'creatorUserId' | 'createdAt' | 'updatedAt'>;

export async function addInvoice(
  companyId: string,
  newInvoiceData: NewInvoiceData
): Promise<Invoice> {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    throw new Error("User not authenticated. Cannot add invoice.");
  }
  if (!companyId) {
    throw new Error("Company ID is required to add an invoice.");
  }

  const invoiceToSave = {
    ...newInvoiceData,
    companyId: companyId,
    creatorUserId: currentUser.uid,
    createdAt: serverTimestamp() as Timestamp,
    updatedAt: serverTimestamp() as Timestamp,
  };

  try {
    const docRef = await addDoc(collection(db, INVOICE_COLLECTION), invoiceToSave);
    const savedInvoice: Invoice = {
      id: docRef.id,
      ...invoiceToSave,
      createdAt: Timestamp.now(), // Use client-side timestamp for immediate return
      updatedAt: Timestamp.now(),
    };
    
    const userName = currentUser.displayName || `User ...${currentUser.uid.slice(-6)}`;
    addNotification(
      `${userName} created invoice #${savedInvoice.invoiceNumber} for ${savedInvoice.customerName}.`,
      'invoice_created',
      companyId,
      currentUser.uid,
      savedInvoice.id
    ).catch(err => console.error("DataService: Failed to add notification for new invoice:", err));

    return savedInvoice;
  } catch (error) {
    console.error(`DataService: Error adding invoice to Firestore for company '${companyId}' (User: ${currentUser.uid}):`, error);
    throw error;
  }
}

export async function getInvoices(companyId: string): Promise<Invoice[]> {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    return [];
  }
  if (!companyId) {
    return [];
  }
  try {
    const q = query(
      collection(db, INVOICE_COLLECTION),
      where("companyId", "==", companyId),
      orderBy("invoiceDate", "desc"),
      orderBy("createdAt", "desc")
    );
    const querySnapshot = await getDocs(q);
    const invoices: Invoice[] = [];
    querySnapshot.forEach((docSnap) => {
      const data = docSnap.data();
      invoices.push({
        id: docSnap.id,
        ...data,
      } as Invoice); // Type assertion, ensure data matches Invoice structure
    });
    return invoices;
  } catch (error) {
    console.error(`DataService: Error fetching invoices for company '${companyId}' (User: ${currentUser.uid}) from Firestore:`, error);
    throw error;
  }
}


export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
}
