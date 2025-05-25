
"use client";

import { PageTitle } from "@/components/shared/PageTitle";
import { JournalTable } from "@/components/journal/JournalTable"; // JournalEntry type is also exported from here
import { Button } from "@/components/ui/button";
import { Download, Filter } from "lucide-react";
import { useState, useEffect } from "react";
import { getJournalEntries, type JournalEntry } from "@/lib/data-service"; // Import service
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/AuthContext";
import { Timestamp } from "firebase/firestore"; // Added Timestamp import
import { usePathname } from 'next/navigation'; // Import usePathname


export default function JournalPage() {
  const { user: currentUser } = useAuth();
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const pathname = usePathname(); // Get current pathname

  useEffect(() => {
    async function loadEntries() {
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
          
          const timeA = a.createdAt instanceof Timestamp ? a.createdAt.toMillis() : new Date(a.createdAt as any).getTime();
          const timeB = b.createdAt instanceof Timestamp ? b.createdAt.toMillis() : new Date(b.createdAt as any).getTime();
          const timeComparison = timeB - timeA;
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
    }
    if (pathname === '/journal') { // Only load if on the journal page
        loadEntries();
    }
  }, [currentUser, pathname]); // Reload if user or pathname changes and it's the journal page

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

