
"use client";

import { PageTitle } from "@/components/shared/PageTitle";
import { JournalTable } from "@/components/journal/JournalTable"; // JournalEntry type is also exported from here
import { Button } from "@/components/ui/button";
import { Download, Filter } from "lucide-react";
import { useState, useEffect } from "react";
import { getJournalEntries, type JournalEntry } from "@/lib/data-service"; // Import service

// Removed mock fetchJournalEntries, will use data-service

export default function JournalPage() {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadEntries() {
      setIsLoading(true);
      try {
        const data = await getJournalEntries(); // Use data service
        // Sort entries by date descending, then by ID if dates are same (for stable sort)
        const sortedData = data.sort((a, b) => {
          const dateComparison = b.date.localeCompare(a.date);
          if (dateComparison !== 0) return dateComparison;
          return b.id.localeCompare(a.id); // Fallback to ID for same-date entries
        });
        setEntries(sortedData);
      } catch (error) {
        console.error("Failed to load journal entries:", error);
        // Optionally set an error state here to display to the user
      } finally {
        setIsLoading(false);
      }
    }
    loadEntries();
  }, []); // Empty dependency array: runs once on mount

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
         <div className="flex justify-center items-center h-64">
           <p className="text-muted-foreground">Loading journal entries...</p>
         </div>
      ) : (
        <JournalTable entries={entries} />
      )}
    </div>
  );
}
