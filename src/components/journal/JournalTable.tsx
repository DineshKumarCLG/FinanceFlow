
"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trash2, Loader2, Info } from "lucide-react";
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { useState, useEffect } from "react";
import type { JournalEntry } from "@/lib/data-service";
import { deleteJournalEntry } from "@/lib/data-service";
import { useToast } from "@/hooks/use-toast";

interface JournalTableProps {
  entries: JournalEntry[];
  onEntryDeleted: () => void;
  companyId: string;
}

export function JournalTable({ entries = [], onEntryDeleted, companyId }: JournalTableProps) {
  const [clientLocale, setClientLocale] = useState('en-US');
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (typeof navigator !== 'undefined') {
      setClientLocale(navigator.language || 'en-US');
    }
  }, []);

  const handleDeleteEntry = async (entryId: string) => {
    if (!companyId) {
      toast({ variant: "destructive", title: "Error", description: "Company ID is missing. Cannot delete entry." });
      return;
    }
    setIsDeleting(entryId);
    try {
      await deleteJournalEntry(companyId, entryId);
      toast({
        title: "Entry Deleted",
        description: "The journal entry has been successfully deleted.",
      });
      onEntryDeleted();
    } catch (error) {
      console.error("Failed to delete entry:", error);
      toast({
        variant: "destructive",
        title: "Deletion Failed",
        description: "Could not delete the journal entry. Please try again.",
      });
    } finally {
      setIsDeleting(null);
    }
  };

  const formatCurrencyDisplay = (value?: number) => {
    if (value === undefined || value === null) return '-';
    return value.toLocaleString(clientLocale, { style: 'currency', currency: 'INR' });
  };

  const getTotalGstAmount = (entry: JournalEntry): number => {
    let totalGst = 0;
    if (entry.gstType === 'igst' && entry.igstAmount) totalGst += entry.igstAmount;
    if (entry.gstType === 'cgst-sgst') {
      if (entry.cgstAmount) totalGst += entry.cgstAmount;
      if (entry.sgstAmount) totalGst += entry.sgstAmount;
    }
    if (entry.gstType === 'vat' && entry.vatAmount) totalGst += entry.vatAmount;
    return totalGst;
  };


  return (
    <Card className="shadow-lg">
      <CardContent className="p-0">
        <ScrollArea className="h-[calc(100vh-20rem)]">
          <TooltipProvider>
            <Table>
              <TableHeader className="sticky top-0 bg-background z-10">
                <TableRow>
                  <TableHead className="w-[100px]">Date</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Debit Acc.</TableHead>
                  <TableHead>Credit Acc.</TableHead>
                  <TableHead className="text-right w-[120px]">Total Amt.</TableHead>
                  <TableHead className="text-right w-[100px]">Taxable</TableHead>
                  <TableHead className="text-center w-[150px]">GST Details</TableHead>
                  <TableHead className="w-[180px]">Tags</TableHead>
                  <TableHead className="w-[80px] text-center">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center h-24 text-muted-foreground">
                      No journal entries found for this company.
                    </TableCell>
                  </TableRow>
                ) : (
                  entries.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell>{entry.date}</TableCell>
                      <TableCell className="font-medium max-w-[250px] truncate" title={entry.description}>{entry.description}</TableCell>
                      <TableCell className="max-w-[150px] truncate" title={entry.debitAccount}>{entry.debitAccount}</TableCell>
                      <TableCell className="max-w-[150px] truncate" title={entry.creditAccount}>{entry.creditAccount}</TableCell>
                      <TableCell className="text-right font-semibold">
                        {formatCurrencyDisplay(entry.amount)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrencyDisplay(entry.taxableAmount)}
                      </TableCell>
                      <TableCell className="text-center">
                        {entry.gstType && entry.gstType !== 'none' ? (
                          <Tooltip>
                            <TooltipTrigger asChild>
                               <Badge variant="outline" className="cursor-pointer">
                                {entry.gstRate ? `${entry.gstRate}% ` : ''}
                                {entry.gstType.toUpperCase()}
                                <Info className="h-3 w-3 ml-1"/>
                               </Badge>
                            </TooltipTrigger>
                            <TooltipContent className="text-xs p-2 shadow-lg bg-popover text-popover-foreground max-w-xs" side="top">
                              <p><strong>Total GST:</strong> {formatCurrencyDisplay(getTotalGstAmount(entry))}</p>
                              {entry.gstType === 'igst' && <p>IGST: {formatCurrencyDisplay(entry.igstAmount)}</p>}
                              {entry.gstType === 'cgst-sgst' && (
                                <>
                                  <p>CGST: {formatCurrencyDisplay(entry.cgstAmount)}</p>
                                  <p>SGST: {formatCurrencyDisplay(entry.sgstAmount)}</p>
                                </>
                              )}
                              {entry.gstType === 'vat' && <p>VAT: {formatCurrencyDisplay(entry.vatAmount)}</p>}
                              <p>HSN/SAC: {entry.hsnSacCode || 'N/A'}</p>
                              <p>Party GSTIN: {entry.partyGstin || 'N/A'}</p>
                              {entry.gstType !== 'vat' && <p>Inter-State: {entry.isInterState ? 'Yes' : 'No'}</p>}
                            </TooltipContent>
                          </Tooltip>
                        ) : (
                          <Badge variant="secondary">No GST</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1 max-w-[170px] overflow-hidden">
                          {entry.tags?.map(tag => <Badge key={tag} variant="outline" className="text-xs">{tag}</Badge>)}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive-foreground hover:bg-destructive/90 h-7 w-7" disabled={isDeleting === entry.id || !companyId}>
                              {isDeleting === entry.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This action cannot be undone. This will permanently delete the journal entry:
                                <br />
                                <strong>Date:</strong> {entry.date} <br />
                                <strong>Description:</strong> {entry.description} <br />
                                <strong>Amount:</strong> {formatCurrencyDisplay(entry.amount)}
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDeleteEntry(entry.id)} disabled={isDeleting === entry.id} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">
                                {isDeleting === entry.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                Yes, delete entry
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TooltipProvider>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
