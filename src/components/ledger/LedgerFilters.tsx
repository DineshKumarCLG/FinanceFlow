
"use client";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon, FilterX, Search } from "lucide-react";
import { format } from "date-fns";
import type { DateRange } from "react-day-picker";
import { useState, useEffect } from "react"; // Added useEffect

// Updated accounts to match LedgerPage
const accounts = [
  { value: "Cash", label: "Cash" },
  { value: "Accounts Receivable", label: "Accounts Receivable" },
  { value: "Office Expenses", label: "Office Expenses" },
  { value: "Service Revenue", label: "Service Revenue" },
  { value: "Bank Account", label: "Bank Account" },
];

interface LedgerFiltersProps {
  onFilterChange: (filters: { account?: string; dateRange?: DateRange; searchTerm?: string }) => void;
}

export function LedgerFilters({ onFilterChange }: LedgerFiltersProps) {
  const [selectedAccount, setSelectedAccount] = useState<string>("Cash"); // Default to Cash
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [searchTerm, setSearchTerm] = useState<string>("");

  // Initialize with default filter for Cash account on mount
  useEffect(() => {
    onFilterChange({ account: "Cash" });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run only once on mount


  const handleApplyFilters = () => {
    onFilterChange({ account: selectedAccount, dateRange, searchTerm });
  };

  const handleClearFilters = () => {
    setSelectedAccount("Cash"); // Reset to default account
    setDateRange(undefined);
    setSearchTerm("");
    onFilterChange({ account: "Cash" }); // Apply default filter on clear
  };

  return (
    <div className="mb-6 p-4 border rounded-lg bg-card shadow space-y-4 md:space-y-0 md:flex md:items-end md:gap-4">
      <div className="flex-grow md:w-1/3">
        <label htmlFor="account-select" className="text-sm font-medium text-muted-foreground mb-1 block">Account</label>
        <Select value={selectedAccount} onValueChange={setSelectedAccount}>
          <SelectTrigger id="account-select">
            <SelectValue placeholder="Select an account" />
          </SelectTrigger>
          <SelectContent>
            {accounts.map((account) => (
              <SelectItem key={account.value} value={account.value}>
                {account.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex-grow md:w-1/3">
         <label htmlFor="date-range-popover" className="text-sm font-medium text-muted-foreground mb-1 block">Date Range</label>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              id="date-range-popover"
              variant={"outline"}
              className="w-full justify-start text-left font-normal"
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {dateRange?.from ? (
                dateRange.to ? (
                  <>
                    {format(dateRange.from, "LLL dd, y")} -{" "}
                    {format(dateRange.to, "LLL dd, y")}
                  </>
                ) : (
                  format(dateRange.from, "LLL dd, y")
                )
              ) : (
                <span>Pick a date range</span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              initialFocus
              mode="range"
              defaultMonth={dateRange?.from}
              selected={dateRange}
              onSelect={setDateRange}
              numberOfMonths={2}
            />
          </PopoverContent>
        </Popover>
      </div>
      
      <div className="flex-grow md:w-1/3">
        <label htmlFor="search-term" className="text-sm font-medium text-muted-foreground mb-1 block">Search Description</label>
        <Input 
          id="search-term"
          placeholder="Search..." 
          value={searchTerm} 
          onChange={(e) => setSearchTerm(e.target.value)} 
        />
      </div>

      <div className="flex gap-2 pt-4 md:pt-0">
        <Button onClick={handleApplyFilters} className="w-full md:w-auto">
          <Search className="mr-2 h-4 w-4" /> Apply Filters
        </Button>
        <Button onClick={handleClearFilters} variant="ghost" className="w-full md:w-auto">
          <FilterX className="mr-2 h-4 w-4" /> Clear
        </Button>
      </div>
    </div>
  );
}
