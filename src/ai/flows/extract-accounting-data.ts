
'use server';
/**
 * @fileOverview This file defines a Genkit flow for extracting accounting data from documents, including GST details.
 *
 * - extractAccountingData - A function that handles the extraction of accounting data from uploaded documents.
 * - ExtractAccountingDataInput - The input type for the extractAccountingData function.
 * - ExtractAccountingDataOutput - The return type for the extractAccountingData function.
 */

import {ai} from '@/ai/genkit';
import { z } from 'genkit';

const ExtractAccountingDataInputSchema = z.object({
  documentDataUri: z
    .string()
    .describe(
      'A document (receipt, bill, invoice) as a data URI that must include a MIME type and use Base64 encoding. Expected format: \'data:<mimetype>;base64,<encoded_data>\'.'
    ),
  // gstRegionContext: z.enum(['india', 'other']).optional().describe("The primary GST/VAT region context for parsing tax information. Defaults to 'india' if not provided."),
});
export type ExtractAccountingDataInput = z.infer<typeof ExtractAccountingDataInputSchema>;

const AccountingEntrySchema = z.object({
  date: z.string().describe('The date of the transaction (YYYY-MM-DD).'),
  description: z.string().describe('A description of the transaction. Crucially, this must include the other party\'s name and their GSTIN if it is visible on the document.'),
  debitAccount: z.string().describe('The account to debit.'),
  creditAccount: z.string().describe('The account to credit.'),
  amount: z.number().describe('The total amount of the transaction, including any taxes.'),

  // GST Fields
  taxableAmount: z.number().optional().describe('The amount before tax. If not provided, assume it is the same as `amount` if no tax is specified, or calculate if tax details are present.'),
  gstType: z.enum(['igst', 'cgst-sgst', 'vat', 'none']).optional().describe("Type of GST/VAT. 'none' if no tax is applicable or identified."),
  gstRate: z.number().optional().describe('Overall GST/VAT rate as a percentage (e.g., 18 for 18%).'),
  igstAmount: z.number().optional().describe('Integrated GST amount (for Indian inter-state transactions).'),
  cgstAmount: z.number().optional().describe('Central GST amount (for Indian intra-state transactions).'),
  sgstAmount: z.number().optional().describe('State GST amount (for Indian intra-state transactions).'),
  vatAmount: z.number().optional().describe('Value Added Tax amount (for non-Indian GST/VAT).'),
  hsnSacCode: z.string().optional().describe('HSN (Harmonized System of Nomenclature) or SAC (Services Accounting Code).'),
  partyGstin: z.string().optional().describe('GSTIN of the supplier or recipient, if mentioned in the document.'),
  isInterState: z.boolean().optional().describe('True if the transaction is inter-state (India), false if intra-state. Relevant for IGST vs CGST/SGST.'),
});

const ExtractAccountingDataOutputSchema = z.object({
  entries: z.array(AccountingEntrySchema).describe('The extracted accounting entries.'),
});
export type ExtractAccountingDataOutput = z.infer<typeof ExtractAccountingDataOutputSchema>;

export async function extractAccountingData(input: ExtractAccountingDataInput): Promise<ExtractAccountingDataOutput> {
  return extractAccountingDataFlow(input);
}

const extractAccountingDataPrompt = ai.definePrompt({
  name: 'extractAccountingDataPrompt',
  input: {schema: ExtractAccountingDataInputSchema},
  output: {schema: ExtractAccountingDataOutputSchema},
  prompt: `You are an expert accounting assistant. Your task is to extract accounting entries from the provided document (invoice, receipt, bill).
Assume Indian GST context (IGST for inter-state, CGST & SGST for intra-state) unless specified otherwise or if the document details clearly indicate a different region for VAT.

Analyze the document provided in the image to identify the relevant information and create accounting entries.
The document is provided as a data URI:
{{media url=documentDataUri}}

For each transaction found, extract:
- Date of transaction (YYYY-MM-DD).
- Total transaction amount (including taxes).
- A clear description of the transaction. This should include the other party's name.
- Appropriate Debit and Credit accounts.

Tax Information (GST/VAT) to extract if present in the document:
- Taxable amount (amount before tax). If not explicitly stated, calculate it if total and tax rate are available.
- GST/VAT Type: 'igst', 'cgst-sgst', 'vat', or 'none'.
- Overall GST/VAT Rate (e.g., 5, 12, 18, 28).
- IGST, CGST, SGST, or VAT amounts. If only total GST is available for CGST/SGST type, assume CGST and SGST are each half of that.
- 'isInterState': Determine if it's inter-state (for IGST) or intra-state (for CGST/SGST) if Indian GST. This might be inferred from addresses or GSTINs if available.
- HSN/SAC code.

**CRITICAL INSTRUCTION: Party GSTIN**
- You MUST search the document for a Goods and Services Tax Identification Number (GSTIN).
- If a supplier or customer GSTIN is visible, you MUST extract it and place it in the 'partyGstin' field for each relevant entry in the JSON output.
- You MUST also ensure the party's name and their GSTIN are included in the 'description' field of each entry for user visibility.
- Do not fail to populate the 'partyGstin' field in the structured JSON output if the information is available in the document.

Return the extracted accounting entries in JSON format as an array.
Each entry should conform to the AccountingEntrySchema.
The date should be in YYYY-MM-DD format.
All monetary amounts should be numbers.
If a field is not present in the document or cannot be determined, omit it or set to an appropriate default (e.g., gstType: 'none').
If multiple line items are present that should form separate journal entries, create separate entries for them. If they are part of one single transaction (e.g. multiple items on one bill leading to one payment), consolidate into one entry if appropriate from an accounting perspective, but ensure all HSN/SAC codes are captured if possible, perhaps in the description or as a list if the schema supported arrays for HSN/SAC per entry. For now, one HSN/SAC per entry.
`,
});

const extractAccountingDataFlow = ai.defineFlow(
  {
    name: 'extractAccountingDataFlow',
    inputSchema: ExtractAccountingDataInputSchema,
    outputSchema: ExtractAccountingDataOutputSchema,
  },
  async input => {
    const {output} = await extractAccountingDataPrompt(input);
    // Basic post-processing for extracted entries
    const processedEntries = output.entries.map(entry => {
      let processedEntry = { ...entry };

      if (processedEntry.gstType === 'cgst-sgst' && processedEntry.gstRate && processedEntry.taxableAmount) {
        const totalGstOnTaxable = processedEntry.taxableAmount * (processedEntry.gstRate / 100);
        if (!processedEntry.cgstAmount && !processedEntry.sgstAmount && (processedEntry.igstAmount === undefined || processedEntry.igstAmount === 0)) {
            processedEntry.cgstAmount = parseFloat((totalGstOnTaxable / 2).toFixed(2));
            processedEntry.sgstAmount = parseFloat((totalGstOnTaxable / 2).toFixed(2));
        }
      } else if (processedEntry.gstType === 'igst' && processedEntry.gstRate && processedEntry.taxableAmount) {
         if (!processedEntry.igstAmount && (processedEntry.cgstAmount === undefined || processedEntry.cgstAmount === 0) && (processedEntry.sgstAmount === undefined || processedEntry.sgstAmount === 0)) {
            processedEntry.igstAmount = parseFloat((processedEntry.taxableAmount * (processedEntry.gstRate / 100)).toFixed(2));
        }
      } else if (processedEntry.gstType === 'vat' && processedEntry.gstRate && processedEntry.taxableAmount) {
        if (!processedEntry.vatAmount) {
            processedEntry.vatAmount = parseFloat((processedEntry.taxableAmount * (processedEntry.gstRate / 100)).toFixed(2));
        }
      }
      
      if (!processedEntry.taxableAmount && processedEntry.amount && processedEntry.gstRate && processedEntry.gstType !== 'none') {
          processedEntry.taxableAmount = parseFloat((processedEntry.amount / (1 + processedEntry.gstRate / 100)).toFixed(2));
      } else if (!processedEntry.taxableAmount && processedEntry.amount) {
          processedEntry.taxableAmount = processedEntry.amount;
      }
      if (processedEntry.gstType === 'none' || !processedEntry.gstRate) {
          processedEntry.taxableAmount = processedEntry.amount;
      }

      return processedEntry;
    });

    return { entries: processedEntries };
  }
);
