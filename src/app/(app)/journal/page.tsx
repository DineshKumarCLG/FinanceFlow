
"use client";

import { PageTitle } from "@/components/shared/PageTitle";
import { JournalTable } from "@/components/journal/JournalTable"; // JournalEntry type is also exported from here
import { Button } from "@/components/ui/button";
import { Download, Filter } from "lucide-react";
import { useState, useEffect } from "react";
import { getJournalEntries, type JournalEntry } from "@/lib/data-service"; // Import service
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/AuthContext";


export default function JournalPage() {
  const { user: currentUser } = useAuth();
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadEntries() {
      if (!currentUser) { // Don't load if no user
        setIsLoading(false);
        setEntries([]);
        return;
      }
      setIsLoading(true);
      try {
        const data = await getJournalEntries(); 
        // Firestore already sorts by date desc, createdAt desc.
        // Client-side sort for stability if `createdAt` are identical (less likely with serverTimestamps)
        const sortedData = data.sort((a, b) => {
          const dateComparison = b.date.localeCompare(a.date);
          if (dateComparison !== 0) return dateComparison;
          // If createdAt is a Firestore Timestamp, convert to Date for comparison
          const timeA = a.createdAt instanceof Timestamp ? a.createdAt.toMillis() : new Date(a.createdAt as any).getTime();
          const timeB = b.createdAt instanceof Timestamp ? b.createdAt.toMillis() : new Date(b.createdAt as any).getTime();
          const timeComparison = timeB - timeA;
          if (timeComparison !== 0) return timeComparison;
          return b.id.localeCompare(a.id); 
        });
        setEntries(sortedData);
      } catch (error) {
        console.error("Failed to load journal entries:", error);
        // Optionally set an error state here to display to the user
        setEntries([]); // Clear entries on error
      } finally {
        setIsLoading(false);
      }
    }
    loadEntries();
  }, [currentUser]); // Reload if user changes

  return (
    <div className="space-y-6">
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
      
      {isLoading ? (
         <div className="space-y-2">
           <Skeleton className="h-12 w-full" />
           <Skeleton className="h-64 w-full" />
         </div>
      ) : (
        <JournalTable entries={entries} />
      )}
    </div>
  );
}
