"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";

export function ExportSettings() {
  const { toast } = useToast();
  const [exportFormat, setExportFormat] = useState("csv");
  const [dataType, setDataType] = useState("all");


  const handleExport = () => {
    // Placeholder for actual export logic
    console.log(`Exporting ${dataType} data as ${exportFormat}`);
    toast({
      title: "Export Started",
      description: `Your ${dataType} data is being prepared for export as ${exportFormat.toUpperCase()}. This is a demo.`,
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Export Data</CardTitle>
        <CardDescription>Download your financial data in various formats.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
          <div>
            <label htmlFor="dataType" className="block text-sm font-medium text-muted-foreground mb-1">Data to Export</label>
            <Select value={dataType} onValueChange={setDataType}>
              <SelectTrigger id="dataType">
                <SelectValue placeholder="Select data type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Data</SelectItem>
                <SelectItem value="journal">Journal Entries</SelectItem>
                <SelectItem value="ledger">Ledger Transactions</SelectItem>
                <SelectItem value="income_statement">Income Statement</SelectItem>
                <SelectItem value="balance_sheet">Balance Sheet</SelectItem>
              </SelectContent>
            </Select>
          </div>
           <div>
            <label htmlFor="exportFormat" className="block text-sm font-medium text-muted-foreground mb-1">Export Format</label>
            <Select value={exportFormat} onValueChange={setExportFormat}>
              <SelectTrigger id="exportFormat">
                <SelectValue placeholder="Select format" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="csv">CSV (Comma Separated Values)</SelectItem>
                <SelectItem value="pdf">PDF (Portable Document Format)</SelectItem>
                <SelectItem value="xlsx">XLSX (Excel Spreadsheet)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
         <Button onClick={handleExport} className="w-full md:w-auto">
          <Download className="mr-2 h-4 w-4" />
          Export Data
        </Button>
      </CardContent>
    </Card>
  );
}
