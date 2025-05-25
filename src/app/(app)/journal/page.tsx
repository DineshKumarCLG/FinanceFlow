
"use client";

import { PageTitle } from "@/components/shared/PageTitle";
import { JournalTable } from "@/components/journal/JournalTable"; 
import { Button } from "@/components/ui/button";
import { Download, Filter } from "lucide-react";
import { useState, useEffect, useCallback } from "react"; // Added useCallback
import { getJournalEntries, type JournalEntry } from "@/lib/data-service"; 
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/AuthContext";
import { Timestamp } from "firebase/firestore"; 
import { usePathname } from 'next/navigation'; 


export default function JournalPage() {
  const { user: currentUser } = useAuth();
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const pathname = usePathname(); 

  const loadEntries = useCallback(async () => {
    if (!currentUser) { 
      setIsLoading(false);
      setEntries([]);
      return;
    }
    setIsLoading(true);
    try {
      const data = await getJournalEntries(); 
      const sortedData = data.sort((a, b) => {
        const dateComparison = b.date.localeCompare(a.date);
        if (dateComparison !== 0) return dateComparison;
        
        // Ensure Timestamp objects are handled correctly for createdAt
        const timeA = a.createdAt instanceof Timestamp ? a.createdAt.toMillis() : (typeof a.createdAt === 'object' && a.createdAt && 'seconds' in a.createdAt && 'nanoseconds' in a.createdAt) ? new Timestamp((a.createdAt as any).seconds, (a.createdAt as any).nanoseconds).toMillis() : new Date(a.createdAt as any).getTime();
        const timeB = b.createdAt instanceof Timestamp ? b.createdAt.toMillis() : (typeof b.createdAt === 'object' && b.createdAt && 'seconds' in b.createdAt && 'nanoseconds' in b.createdAt) ? new Timestamp((b.createdAt as any).seconds, (b.createdAt as any).nanoseconds).toMillis() : new Date(b.createdAt as any).getTime();
        
        const timeComparison = timeB - timeA; // Descending by time
        if (timeComparison !== 0) return timeComparison;
        return (b.id || "").localeCompare(a.id || ""); 
      });
      setEntries(sortedData);
    } catch (error) {
      console.error("Failed to load journal entries:", error);
      setEntries([]); 
    } finally {
      setIsLoading(false);
    }
  }, [currentUser]); // Added currentUser to dependency array

  useEffect(() => {
    if (pathname === '/journal') { 
        loadEntries();
    }
  }, [currentUser, pathname, loadEntries]); // Added loadEntries to dependency array

  const handleEntryDeleted = () => {
    loadEntries(); // Re-fetch entries after deletion
  };

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
           <Skeleton className="h-80 w-full" /> {/* Increased height for table-like skeleton */}
         </div>
      ) : (
        <JournalTable entries={entries} onEntryDeleted={handleEntryDeleted} />
      )}
    </div>
  );
}
