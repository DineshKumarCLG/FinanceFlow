
"use client";

import { PageTitle } from "@/components/shared/PageTitle";
import { JournalTable } from "@/components/journal/JournalTable";
import { Button } from "@/components/ui/button";
import { Download, Filter, Trash2 } from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { getJournalEntries, deleteJournalEntry, type JournalEntry } from "@/lib/data-service";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/AuthContext";
import type { Timestamp } from "firebase/firestore"; // Keep this import for sorting
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { usePathname } from 'next/navigation';


export default function JournalPage() {
  const { user: currentUser, currentCompanyId, isLoading: authIsLoading } = useAuth();
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [entryToDelete, setEntryToDelete] = useState<JournalEntry | null>(null);
  const { toast } = useToast();
  const pathname = usePathname(); // For re-fetching on navigation

  const loadEntries = useCallback(async () => {
    if (authIsLoading) { // Don't load if auth state is still resolving
        setIsLoading(true);
        return;
    }
    if (!currentUser || !currentCompanyId) {
      console.log("JournalPage: No user or companyId, clearing entries.");
      setIsLoading(false);
      setEntries([]);
      return;
    }
    console.log(`JournalPage: Loading entries for company '${currentCompanyId}'`);
    setIsLoading(true);
    try {
      const data = await getJournalEntries(currentCompanyId);
      const sortedData = data.sort((a, b) => {
        const dateComparison = b.date.localeCompare(a.date);
        if (dateComparison !== 0) return dateComparison;
        const timeA = a.createdAt instanceof Timestamp ? a.createdAt.toMillis() : new Date(a.createdAt as any).getTime();
        const timeB = b.createdAt instanceof Timestamp ? b.createdAt.toMillis() : new Date(b.createdAt as any).getTime();
        const timeComparison = timeB - timeA;
        if (timeComparison !== 0) return timeComparison;
        return (b.id || "").localeCompare(a.id || "");
      });
      setEntries(sortedData);
    } catch (error) {
      console.error("Failed to load journal entries:", error);
      toast({ variant: "destructive", title: "Error", description: "Could not load journal entries."})
      setEntries([]);
    } finally {
      setIsLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser, currentCompanyId, authIsLoading, pathname]); // Added pathname and authIsLoading


  useEffect(() => {
    loadEntries();
  }, [loadEntries]);

  const handleDeleteConfirm = async () => {
    if (!entryToDelete || !currentCompanyId) return;
    try {
      await deleteJournalEntry(entryToDelete.id, currentCompanyId);
      toast({ title: "Entry Deleted", description: `Entry "${entryToDelete.description.substring(0,30)}..." has been deleted.` });
      setEntryToDelete(null);
      loadEntries(); // Refresh entries
    } catch (error) {
      console.error("Failed to delete entry:", error);
      toast({ variant: "destructive", title: "Delete Error", description: "Could not delete the entry."})
    }
  };

  return (
    <div className="flex flex-col h-full space-y-6">
      <PageTitle
        title="Journal Entries"
        description="A chronological record of all your financial transactions."
      >
        <div className="flex gap-2">
          <Button variant="outline">
            <Filter className="mr-2 h-4 w-4" /> Filter
          </Button>
          <Button>
            <Download className="mr-2 h-4 w-4" /> Export
          </Button>
        </div>
      </PageTitle>
      
      {isLoading && entries.length === 0 ? ( // Show skeleton only on initial load and if no entries yet
         <div className="space-y-2 flex-1">
           <Skeleton className="h-12 w-full rounded-lg" />
           <Skeleton className="flex-1 w-full rounded-lg" /> {/* Skeleton for table area */}
         </div>
      ) : (
        <JournalTable entries={entries} onDelete={(entry) => setEntryToDelete(entry)} />
      )}

      {entryToDelete && (
        <AlertDialog open={!!entryToDelete} onOpenChange={(open) => !open && setEntryToDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete the journal entry:
                <br /> <strong>{entryToDelete.description}</strong> (Amount: {entryToDelete.amount.toLocaleString('en-IN', { style: 'currency', currency: 'INR' })})
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setEntryToDelete(null)}>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteConfirm} className="bg-destructive hover:bg-destructive/90">
                <Trash2 className="mr-2 h-4 w-4" /> Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}
