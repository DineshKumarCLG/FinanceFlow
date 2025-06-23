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
  getDoc,
  updateDoc,
  setDoc,
} from 'firebase/firestore';

export interface JournalEntry {
  id: string;
  date: string;
  description: string;
  debitAccount: string;
  creditAccount: string;
  amount: number; // This should be the total transaction amount including tax
  type?: string; // e.g., "income", "expense"
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
  type: 'new_entry' | 'user_joined' | 'document_upload' | 'invoice_created' | 'invoice_updated' | 'company_settings_updated' | 'ai_preferences_updated' | 'invoice_deleted';
  timestamp: Timestamp | { seconds: number, nanoseconds: number };
  userId?: string;
  relatedId?: string;
  companyId: string;
}

export interface InvoiceLineItem {
  description: string;
  quantity: number;
  unitPrice: number; // Price before tax for one unit
  amount: number; // Taxable amount for this line item (quantity * unitPrice)
  hsnSacCode?: string;
  gstRate?: number; // GST rate applicable to this item (e.g., 18 for 18%)
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  invoiceDate: string; // YYYY-MM-DD
  dueDate?: string; // YYYY-MM-DD

  customerName: string;
  customerGstin?: string;
  customerEmail?: string;
  billingAddress?: string; // Can be multi-line
  shippingAddress?: string; // Can be multi-line, if different from billing

  lineItems?: InvoiceLineItem[];
  itemsSummary?: string; // Fallback if lineItems are not structured

  subTotal: number; // Sum of all lineItem.amount (taxable values)
  totalGstAmount: number; // Sum of GST calculated for each line item
  totalAmount: number; // subTotal + totalGstAmount

  paymentTerms?: string;
  notes?: string;
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'void';

  companyId: string;
  creatorUserId: string;
  createdAt: Timestamp | { seconds: number, nanoseconds: number };
  updatedAt: Timestamp | { seconds: number, nanoseconds: number };
}

export interface CompanySettings {
  id?: string; // This will be the companyId itself
  businessName?: string;
  businessType?: string;
  companyGstin?: string;
  gstRegion?: 'india' | 'international_other' | 'none';
  companyAddress?: string; // Primary address for display (e.g., on invoices)
  registeredAddress?: string;
  corporateAddress?: string;
  billingAddress?: string; // Company's own billing address
  companyEmail?: string;
  companyPhone?: string;
  bankDetails?: string;
  authorizedSignatory?: string;
  updatedAt?: Timestamp;
  currency?: string; // e.g., "INR", "USD", "EUR"
}

export interface AiPreferencesSettings {
  id?: string; // This will be the companyId
  aiModel?: string; // e.g., "gemini_flash", "gemini_pro"
  verbosity?: number; // 0-100
  tone?: string; // e.g., "formal", "neutral", "friendly", "concise"
  updatedAt?: Timestamp;
}


const JOURNAL_COLLECTION = 'journalEntries';
const NOTIFICATION_COLLECTION = 'notifications';
const INVOICE_COLLECTION = 'invoices';
const COMPANY_SETTINGS_COLLECTION = 'companySettings';
const AI_PREFERENCES_COLLECTION = 'aiPreferencesSettings';


export async function addNotification(
  message: string,
  type: Notification['type'],
  companyId: string,
  userId?: string, // This userId is the one performing the action or related to the notification
  relatedId?: string
): Promise<void> {
  if (!companyId) {
    console.error("DataService: Error adding notification: companyId is required.");
    return;
  }
  const notificationData = {
    message,
    type,
    userId: userId || 'SYSTEM', // If userId is not passed, mark as SYSTEM
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
        type: data.type,
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
    amount: newEntryData.amount,
    type: newEntryData.type ?? 'other',
    tags: newEntryData.tags || [],
    creatorUserId: currentUser.uid,
    companyId: companyId,
    createdAt: serverTimestamp() as Timestamp,
    // Sanitize optional fields to prevent 'undefined' values by converting to null
    taxableAmount: newEntryData.taxableAmount ?? null,
    gstType: newEntryData.gstType ?? null,
    gstRate: newEntryData.gstRate ?? null,
    igstAmount: newEntryData.igstAmount ?? null,
    cgstAmount: newEntryData.cgstAmount ?? null,
    sgstAmount: newEntryData.sgstAmount ?? null,
    vatAmount: newEntryData.vatAmount ?? null,
    hsnSacCode: newEntryData.hsnSacCode ?? null,
    partyGstin: newEntryData.partyGstin ?? null,
    isInterState: newEntryData.isInterState ?? null,
  };

  try {
    const docRef = await addDoc(collection(db, JOURNAL_COLLECTION), entryToSave);
    const savedEntry: JournalEntry = {
      id: docRef.id,
      ...newEntryData,
      // Overwrite with sanitized values for consistency if needed, but not strictly required for return type
      creatorUserId: currentUser.uid,
      companyId: companyId,
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
  const currentTime = Timestamp.now(); 

  newEntriesData.forEach(newData => {
    const docRef = doc(collection(db, JOURNAL_COLLECTION));
    const entryToSave = {
      date: newData.date,
      description: newData.description,
      debitAccount: newData.debitAccount,
      creditAccount: newData.creditAccount,
      amount: newData.amount, 
      type: (newData as any).type ?? 'other',
      tags: newData.tags || [],
      creatorUserId: currentUser.uid,
      companyId: companyId,
      createdAt: serverTimestamp() as Timestamp,
      // Sanitize optional fields to prevent 'undefined' values by converting to null
      taxableAmount: newData.taxableAmount ?? null,
      gstType: newData.gstType ?? null,
      gstRate: newData.gstRate ?? null,
      igstAmount: newData.igstAmount ?? null,
      cgstAmount: newData.cgstAmount ?? null,
      sgstAmount: newData.sgstAmount ?? null,
      vatAmount: newData.vatAmount ?? null,
      hsnSacCode: newData.hsnSacCode ?? null,
      partyGstin: newData.partyGstin ?? null,
      isInterState: newData.isInterState ?? null,
    };
    batch.set(docRef, entryToSave);
    preparedEntries.push({
      id: docRef.id,
      ...newData,
      creatorUserId: currentUser.uid,
      companyId: companyId,
      createdAt: currentTime 
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
    const docSnap = await getDoc(entryRef); // Read before write

    if (docSnap.exists()) {
      const entryData = docSnap.data();
      // Verify ownership before deleting
      if (entryData.companyId !== companyId) {
        throw new Error("Permission denied. The journal entry does not belong to the current company.");
      }

      await deleteDoc(entryRef);
      const userName = currentUser.displayName || `User ...${currentUser.uid.slice(-6)}`;
      addNotification(
        `${userName} deleted journal entry ID: ${entryId.slice(0, 8)}...`,
        'new_entry',
        companyId,
        currentUser.uid,
        entryId
      ).catch(err => console.error("DataService: Failed to add notification for entry deletion:", err));
    } else {
      throw new Error("Journal entry not found.");
    }
  } catch (error) {
    console.error(`DataService: Error deleting journal entry ${entryId} from Firestore for company ${companyId} (User: ${currentUser.uid}):`, error);
    throw error;
  }
}

export type NewInvoiceData = Omit<Invoice, 'id' | 'companyId' | 'creatorUserId' | 'createdAt' | 'updatedAt'>;
export type UpdateInvoiceData = Partial<Omit<Invoice, 'id' | 'companyId' | 'creatorUserId' | 'createdAt'>>;


export async function addInvoice(
  companyId: string,
  creatorUserId: string,
  newInvoiceData: NewInvoiceData
): Promise<Invoice> {
  if (!creatorUserId) {
    throw new Error("Creator User ID is required. Cannot add invoice.");
  }
  if (!companyId) {
    throw new Error("Company ID is required to add an invoice.");
  }

  // Sanitize line items to remove undefined values, converting them to null
  const sanitizedLineItems = (newInvoiceData.lineItems || []).map(item => ({
    ...item,
    hsnSacCode: item.hsnSacCode ?? null,
    gstRate: item.gstRate ?? null,
  }));

  const invoicePayload = {
    invoiceNumber: newInvoiceData.invoiceNumber,
    invoiceDate: newInvoiceData.invoiceDate,
    dueDate: newInvoiceData.dueDate ?? null,
    customerName: newInvoiceData.customerName,
    customerGstin: newInvoiceData.customerGstin ?? null,
    customerEmail: newInvoiceData.customerEmail ?? null,
    billingAddress: newInvoiceData.billingAddress ?? null,
    shippingAddress: newInvoiceData.shippingAddress ?? null,
    lineItems: sanitizedLineItems,
    itemsSummary: newInvoiceData.itemsSummary ?? null,
    subTotal: newInvoiceData.subTotal,
    totalGstAmount: newInvoiceData.totalGstAmount,
    totalAmount: newInvoiceData.totalAmount,
    paymentTerms: newInvoiceData.paymentTerms ?? null,
    notes: newInvoiceData.notes ?? null,
    status: newInvoiceData.status || 'draft',
    companyId: companyId,
    creatorUserId: creatorUserId,
    createdAt: serverTimestamp() as Timestamp,
    updatedAt: serverTimestamp() as Timestamp,
  };

  try {
    const docRef = await addDoc(collection(db, INVOICE_COLLECTION), invoicePayload);

    // Construct the return object based on the originally passed data plus new IDs/timestamps
    const savedInvoice: Invoice = {
      id: docRef.id,
      ...newInvoiceData,
      companyId,
      creatorUserId,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    };

    addNotification(
      `Invoice #${savedInvoice.invoiceNumber} for ${savedInvoice.customerName} created.`,
      'invoice_created',
      companyId,
      creatorUserId,
      savedInvoice.id
    ).catch(err => console.error("DataService: Failed to add notification for new invoice:", err));

    return savedInvoice;
  } catch (error) {
    console.error(`DataService: Error adding invoice to Firestore for company '${companyId}' (User: ${creatorUserId}):`, error);
    throw error;
  }
}

export async function updateInvoice(
  companyId: string,
  invoiceId: string,
  creatorUserId: string,
  invoiceDataToUpdate: UpdateInvoiceData
): Promise<Invoice> {
  if (!creatorUserId) { 
    throw new Error("Creator User ID is required for updating an invoice (for audit/notification).");
  }
  if (!companyId) {
    throw new Error("Company ID is required to update an invoice.");
  }
  if (!invoiceId) {
    throw new Error("Invoice ID is required to update an invoice.");
  }

  const invoiceRef = doc(db, INVOICE_COLLECTION, invoiceId);

  const updatePayload: { [key: string]: any } = { ...invoiceDataToUpdate };

  // Sanitize line items if they are being updated
  if (updatePayload.lineItems) {
    updatePayload.lineItems = updatePayload.lineItems.map((item: any) => ({
      ...item,
      hsnSacCode: item.hsnSacCode ?? null,
      gstRate: item.gstRate ?? null,
    }));
  }

  // Convert any top-level undefined values to null
  Object.keys(updatePayload).forEach(key => {
    if (updatePayload[key] === undefined) {
      updatePayload[key] = null;
    }
  });

  updatePayload.updatedAt = serverTimestamp() as Timestamp;

  try {
    const docSnap = await getDoc(invoiceRef);
    if (!docSnap.exists() || docSnap.data().companyId !== companyId) {
        throw new Error("Invoice not found or access denied.");
    }

    await updateDoc(invoiceRef, updatePayload);

    const updatedDocSnap = await getDoc(invoiceRef); // Re-fetch to get the server-updated data
    const updatedInvoiceData = { ...updatedDocSnap.data(), id: invoiceId } as Invoice;

    addNotification(
      `Invoice #${updatedInvoiceData.invoiceNumber} updated.`,
      'invoice_updated',
      companyId,
      creatorUserId,
      invoiceId
    ).catch(err => console.error("DataService: Failed to add notification for invoice update:", err));

    return updatedInvoiceData;

  } catch (error) {
    console.error(`DataService: Error updating invoice ${invoiceId} for company '${companyId}' (User: ${creatorUserId}):`, error);
    throw error;
  }
}

export async function deleteInvoice(companyId: string, invoiceId: string): Promise<void> {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    throw new Error("User not authenticated. Cannot delete invoice.");
  }
  if (!companyId) {
    throw new Error("Company ID is required to delete an invoice.");
  }
  if (!invoiceId) {
    throw new Error("Invoice ID is required to delete an invoice.");
  }

  try {
    const invoiceRef = doc(db, INVOICE_COLLECTION, invoiceId);
    const docSnap = await getDoc(invoiceRef);

    if (docSnap.exists()) {
      const invoiceData = docSnap.data();
      if (invoiceData.companyId !== companyId) {
        throw new Error("Invoice does not belong to the specified company or access denied.");
      }
      // The creatorUserId check has been removed to allow any user in the company to delete.
      // The backend Firestore security rules should be the source of truth for this permission.
      await deleteDoc(invoiceRef);

      addNotification(
        `Invoice #${invoiceData.invoiceNumber || invoiceId.slice(0,8)} deleted.`,
        'invoice_deleted',
        companyId,
        currentUser.uid,
        invoiceId
      ).catch(err => console.error("DataService: Failed to add notification for invoice deletion:", err));
    } else {
      throw new Error("Invoice not found.");
    }
  } catch (error) {
    console.error(`DataService: Error deleting invoice ${invoiceId} for company '${companyId}' (User: ${currentUser.uid}):`, error);
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
        invoiceNumber: data.invoiceNumber,
        invoiceDate: data.invoiceDate,
        dueDate: data.dueDate,
        customerName: data.customerName,
        customerGstin: data.customerGstin,
        customerEmail: data.customerEmail,
        billingAddress: data.billingAddress,
        shippingAddress: data.shippingAddress,
        lineItems: data.lineItems || [],
        itemsSummary: data.itemsSummary,
        subTotal: data.subTotal,
        totalGstAmount: data.totalGstAmount,
        totalAmount: data.totalAmount,
        paymentTerms: data.paymentTerms,
        notes: data.notes,
        status: data.status || 'draft',
        companyId: data.companyId,
        creatorUserId: data.creatorUserId,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
      } as Invoice); 
    });
    return invoices;
  } catch (error) {
    console.error(`DataService: Error fetching invoices for company '${companyId}' (User: ${currentUser.uid}) from Firestore:`, error);
    throw error;
  }
}

export async function getInvoiceById(companyId: string, invoiceId: string): Promise<Invoice | null> {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    throw new Error("User not authenticated.");
  }
  if (!companyId) {
    throw new Error("Company ID is required.");
  }
  if (!invoiceId) {
    throw new Error("Invoice ID is required.");
  }

  try {
    const invoiceRef = doc(db, INVOICE_COLLECTION, invoiceId);
    const docSnap = await getDoc(invoiceRef);

    if (docSnap.exists()) {
      const data = docSnap.data();
      if (data.companyId === companyId) {
        // Ideally, also check if currentUser.uid is allowed to view this invoice
        return { 
          id: docSnap.id, 
          invoiceNumber: data.invoiceNumber,
          invoiceDate: data.invoiceDate,
          dueDate: data.dueDate,
          customerName: data.customerName,
          customerGstin: data.customerGstin,
          customerEmail: data.customerEmail,
          billingAddress: data.billingAddress,
          shippingAddress: data.shippingAddress,
          lineItems: data.lineItems || [],
          itemsSummary: data.itemsSummary,
          subTotal: data.subTotal,
          totalGstAmount: data.totalGstAmount,
          totalAmount: data.totalAmount,
          paymentTerms: data.paymentTerms,
          notes: data.notes,
          status: data.status || 'draft',
          companyId: data.companyId,
          creatorUserId: data.creatorUserId,
          createdAt: data.createdAt,
          updatedAt: data.updatedAt,
        } as Invoice;
      } else {
        console.warn(`DataService: Invoice ${invoiceId} does not belong to company ${companyId}.`);
        return null;
      }
    } else {
      console.log(`DataService: No invoice found with ID ${invoiceId} for company ${companyId}.`);
      return null;
    }
  } catch (error) {
    console.error(`DataService: Error fetching invoice ${invoiceId} for company '${companyId}' (User: ${currentUser.uid}) from Firestore:`, error);
    throw error;
  }
}

export async function getCompanySettings(companyId: string): Promise<CompanySettings | null> {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    console.warn("DataService: User not authenticated. Cannot fetch company settings.");
    return null;
  }
  if (!companyId) {
    console.warn("DataService: Company ID is required to fetch company settings.");
    return null;
  }

  try {
    const settingsRef = doc(db, COMPANY_SETTINGS_COLLECTION, companyId);
    const docSnap = await getDoc(settingsRef);

    if (docSnap.exists()) {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        businessName: data.businessName,
        businessType: data.businessType,
        companyGstin: data.companyGstin,
        gstRegion: data.gstRegion,
        companyAddress: data.companyAddress,
        registeredAddress: data.registeredAddress,
        corporateAddress: data.corporateAddress,
        billingAddress: data.billingAddress,
        companyEmail: data.companyEmail,
        companyPhone: data.companyPhone,
        bankDetails: data.bankDetails,
        authorizedSignatory: data.authorizedSignatory,
        currency: data.currency,
        updatedAt: data.updatedAt,
      } as CompanySettings;
    } else {
      console.log(`DataService: No settings found for company ${companyId}. Returning default fallbacks.`);
      return null; 
    }
  } catch (error) {
    console.error(`DataService: Error fetching settings for company '${companyId}' (User: ${currentUser.uid}):`, error);
    throw error;
  }
}

export async function saveCompanySettings(
  companyId: string,
  settingsData: Partial<Omit<CompanySettings, 'id' | 'updatedAt'>>
): Promise<void> {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    throw new Error("User not authenticated. Cannot save company settings.");
  }
  if (!companyId) {
    throw new Error("Company ID is required to save company settings.");
  }

  const settingsRef = doc(db, COMPANY_SETTINGS_COLLECTION, companyId);

  const updatePayload: { [key: string]: any } = { ...settingsData };
  updatePayload.updatedAt = serverTimestamp() as Timestamp;

  // Ensure all fields are present, even if empty, to avoid 'undefined' in Firestore
  const fieldsToEnsure: (keyof CompanySettings)[] = ['businessName', 'businessType', 'companyGstin', 'gstRegion', 'companyAddress', 'registeredAddress', 'corporateAddress', 'billingAddress', 'companyEmail', 'companyPhone', 'bankDetails', 'authorizedSignatory', 'currency'];
  fieldsToEnsure.forEach(field => {
    if (updatePayload[field] === undefined) {
      updatePayload[field] = ""; 
    }
  });
  if (updatePayload.gstRegion === "") updatePayload.gstRegion = "none";
  if (updatePayload.currency === "") updatePayload.currency = "INR";


  try {
    await setDoc(settingsRef, updatePayload, { merge: true });

    addNotification(
      `Company settings for ${companyId} updated.`,
      'company_settings_updated',
      companyId,
      currentUser.uid, 
      companyId 
    ).catch(err => console.error("DataService: Failed to add notification for company settings update:", err));

  } catch (error) {
    console.error(`DataService: Error saving settings for company '${companyId}' (User: ${currentUser.uid}):`, error);
    throw error;
  }
}

export async function getAiPreferences(companyId: string): Promise<AiPreferencesSettings | null> {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    console.warn("DataService: User not authenticated. Cannot fetch AI preferences.");
    return null;
  }
  if (!companyId) {
    console.warn("DataService: Company ID is required to fetch AI preferences.");
    return null;
  }

  try {
    const prefsRef = doc(db, AI_PREFERENCES_COLLECTION, companyId);
    const docSnap = await getDoc(prefsRef);

    if (docSnap.exists()) {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        aiModel: data.aiModel,
        verbosity: data.verbosity,
        tone: data.tone,
        updatedAt: data.updatedAt,
      } as AiPreferencesSettings;
    } else {
      console.log(`DataService: No AI preferences found for company ${companyId}.`);
      return null;
    }
  } catch (error) {
    console.error(`DataService: Error fetching AI preferences for company '${companyId}' (User: ${currentUser.uid}):`, error);
    throw error;
  }
}

export async function saveAiPreferences(
  companyId: string,
  preferencesData: Partial<Omit<AiPreferencesSettings, 'id' | 'updatedAt'>>
): Promise<void> {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    throw new Error("User not authenticated. Cannot save AI preferences.");
  }
  if (!companyId) {
    throw new Error("Company ID is required to save AI preferences.");
  }

  const prefsRef = doc(db, AI_PREFERENCES_COLLECTION, companyId);

  const updatePayload: { [key: string]: any } = {};
  for (const key in preferencesData) {
    const typedKey = key as keyof typeof preferencesData;
    if (preferencesData[typedKey] !== undefined) {
      updatePayload[typedKey] = preferencesData[typedKey];
    }
  }
  updatePayload.updatedAt = serverTimestamp() as Timestamp;

  try {
    await setDoc(prefsRef, updatePayload, { merge: true });

    addNotification(
      `AI preferences for ${companyId} updated.`,
      'ai_preferences_updated',
      companyId,
      currentUser.uid,
      companyId
    ).catch(err => console.error("DataService: Failed to add notification for AI preferences update:", err));

  } catch (error) {
    console.error(`DataService: Error saving AI preferences for company '${companyId}' (User: ${currentUser.uid}):`, error);
    throw error;
  }
}

export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
}

export interface Company {
  id: string;
  name: string;
  businessType?: string;
  gstin?: string;
  country?: string;
  state?: string;
  logo?: string;
  createdBy: string;
  createdAt: string;
}

const COMPANIES_COLLECTION = 'companies';

export async function getCompany(companyId: string): Promise<Company | null> {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    console.warn("DataService: User not authenticated. Cannot fetch company.");
    return null;
  }
  if (!companyId) {
    console.warn("DataService: Company ID is required to fetch company.");
    return null;
  }

  try {
    const companyRef = doc(db, COMPANIES_COLLECTION, companyId);
    const docSnap = await getDoc(companyRef);

    if (docSnap.exists()) {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        name: data.name,
        businessType: data.businessType,
        gstin: data.gstin,
        country: data.country,
        state: data.state,
        logo: data.logo,
        createdBy: data.createdBy,
        createdAt: data.createdAt,
      } as Company;
    } else {
      console.log(`DataService: No company found with ID ${companyId}.`);
      return null;
    }
  } catch (error) {
    console.error(`DataService: Error fetching company '${companyId}' (User: ${currentUser.uid}):`, error);
    throw error;
  }
}

export type NewCompanyData = Omit<Company, 'id' | 'createdAt'>;

export async function createCompany(companyData: NewCompanyData): Promise<string> {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    throw new Error("User not authenticated. Cannot create company.");
  }

  const companyPayload = {
    name: companyData.name,
    businessType: companyData.businessType || '',
    gstin: companyData.gstin || '',
    country: companyData.country || '',
    state: companyData.state || '',
    logo: companyData.logo || '',
    createdBy: companyData.createdBy,
    createdAt: new Date().toISOString(),
  };

  try {
    const docRef = await addDoc(collection(db, COMPANIES_COLLECTION), companyPayload);
    
    addNotification(
      `Company "${companyData.name}" created successfully`,
      'new_entry',
      docRef.id,
      currentUser.uid,
      docRef.id
    ).catch(err => console.error("DataService: Failed to add notification for company creation:", err));

    return docRef.id;
  } catch (error) {
    console.error(`DataService: Error creating company (User: ${currentUser.uid}):`, error);
    throw error;
  }
}

export interface TeamMember {
  email: string;
  role: string;
  companyId: string;
  invitedBy: string;
  status: 'pending' | 'accepted' | 'declined';
  invitedAt?: string;
}

const TEAM_MEMBERS_COLLECTION = 'teamMembers';

export async function getCompany(companyId: string) {
  try {
    const companyRef = doc(db, COMPANIES_COLLECTION, companyId);
    const companySnap = await getDoc(companyRef);
    
    if (companySnap.exists()) {
      return { id: companySnap.id, ...companySnap.data() };
    } else {
      return null;
    }
  } catch (error) {
    console.error(`DataService: Error fetching company '${companyId}':`, error);
    throw error;
  }
}

export async function addTeamMembers(teamMembersData: TeamMember[]): Promise<void> {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    throw new Error("User not authenticated. Cannot add team members.");
  }

  if (teamMembersData.length === 0) {
    return;
  }

  const batch = writeBatch(db);

  teamMembersData.forEach(memberData => {
    const docRef = doc(collection(db, TEAM_MEMBERS_COLLECTION));
    const memberPayload = {
      email: memberData.email,
      role: memberData.role,
      companyId: memberData.companyId,
      invitedBy: memberData.invitedBy,
      status: memberData.status,
      invitedAt: new Date().toISOString(),
    };
    batch.set(docRef, memberPayload);
  });

  try {
    await batch.commit();
    
    // Add notification for team members added
    for (const member of teamMembersData) {
      addNotification(
        `Team member ${member.email} invited as ${member.role}`,
        'user_joined',
        member.companyId,
        currentUser.uid
      ).catch(err => console.error("DataService: Failed to add notification for team member:", err));
    }
  } catch (error) {
    console.error(`DataService: Error adding team members (User: ${currentUser.uid}):`, error);
    throw error;
  }
}