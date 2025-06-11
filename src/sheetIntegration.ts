import { google, sheets_v4 } from 'googleapis';
import * as fs from 'fs';
import * as path from 'path';
import { TransformedLead } from './closeAPIDataFetch';
import { config } from './config';

// Path to service account key
const SERVICE_ACCOUNT_KEY_PATH = config.googleServiceAccountPath

// Sheet ID where data will be stored
export const DEFAULT_SPREADSHEET_ID = config.googleSheetId;

// Base sheet column headers for Leads sheet
const BASE_LEAD_HEADERS = [
  'Display Name',
  'Lead Owner',
  'Status',
  'Date Created',
  'Date Updated',
  'Pipeline Name',
  'Opportunities',
  'Opportunity Notes',
  'Latest Notes',
  'Tasks',
  'Confidence',
  'Contact Name',
  'Contact Email',
  'Contact Phone',
  'URL'
];

// Sheet column headers for Opportunities sheet
const OPPORTUNITY_HEADERS = [
  'Lead Name',
  'Opportunity ID',
  'Pipeline Name',
  'Status Label',
  'Status Type',
  'Value',
  'Value Formatted',
  'Contact Name',
  'Created By',
  'Date Created',
  'Date Updated',
  'Date Won',
  'Date Lost',
  'Confidence',
  'Notes'
];

// Define opportunity interface
interface Opportunity {
  id?: string;
  pipeline_name?: string;
  status_label?: string;
  status_type?: string;
  value?: number | string;
  value_formatted?: string;
  contact_name?: string;
  created_by_name?: string;
  date_created?: string;
  date_updated?: string;
  date_won?: string;
  date_lost?: string;
  confidence?: number | string;
  note?: string;
}

/**
 * Get authenticated Google Sheets client
 */
async function getGoogleSheetsClient(): Promise<sheets_v4.Sheets> {
  try {
    const content = fs.readFileSync(SERVICE_ACCOUNT_KEY_PATH, 'utf8');
    const credentials = JSON.parse(content);
    
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/spreadsheets']
    });

    const authClient = await auth.getClient();
    
    return google.sheets({ 
      version: 'v4', 
      auth: authClient as any // Type cast to fix type error
    });
  } catch (error) {
    console.error('Error creating Google Sheets client:', error);
    throw error;
  }
}

/**
 * Get all unique custom field keys from leads
 */
function getCustomFieldKeys(leads: TransformedLead[]): string[] {
  const customFieldsSet = new Set<string>();
  
  leads.forEach(lead => {
    if (lead.customFields) {
      Object.keys(lead.customFields).forEach(key => {
        customFieldsSet.add(key);
      });
    }
  });
  
  // Convert to array and remove any duplicates that might have different casing
  const allKeys = Array.from(customFieldsSet);
  const uniqueKeys: string[] = [];
  const lowerCaseMap = new Map<string, string>();
  
  // First pass - get the first occurrence of each key (case-insensitive)
  allKeys.forEach(key => {
    const lowerKey = key.toLowerCase();
    if (!lowerCaseMap.has(lowerKey)) {
      lowerCaseMap.set(lowerKey, key);
      uniqueKeys.push(key);
    }
  });
  
  return uniqueKeys;
}

/**
 * Generate dynamic headers including all custom fields
 */
function generateDynamicHeaders(leads: TransformedLead[]): string[] {
  const customFieldKeys = getCustomFieldKeys(leads);
  console.log(`Found ${customFieldKeys.length} unique custom fields`);
  
  // Return base headers plus all custom fields
  return [...BASE_LEAD_HEADERS, ...customFieldKeys];
}

/**
 * Format the latest notes into a readable string
 */
function formatLatestNotes(notes: any[]): string {
  if (!notes || notes.length === 0) {
    return "No notes available";
  }

  return notes.map((note, index) => {
    const date = note.date_created ? formatDate(note.date_created) : 'Unknown date';
    const author = note.created_by_name || 'Unknown';
    const content = note.note || 'No content';
    
    return `[${date}] ${author}: ${content}`;
  }).join('\n\n');
}

/**
 * Format tasks into a readable string
 */
function formatTasks(tasks: any[]): string {
  if (!tasks || tasks.length === 0) {
    return "No tasks available";
  }

  return tasks.map((task) => {
    const dueDate = task.date ? formatDate(task.date) : 'No due date';
    const status = task.is_complete ? '✓ COMPLETE' : '□ OPEN';
    const assignee = task.assigned_to_name || 'Unassigned';
    const text = task.text || 'No description';
    
    return `${status} [Due: ${dueDate}] ${assignee}: ${text}`;
  }).join('\n\n');
}

/**
 * Format lead data for Google Sheets
 */
function formatLeadDataForSheet(leads: TransformedLead[]): string[][] {
  // Generate headers dynamically based on all available custom fields
  const dynamicHeaders = generateDynamicHeaders(leads);
  
  // Add headers as first row
  const rows: string[][] = [dynamicHeaders];

  // Add data rows
  leads.forEach(lead => {
    // Get primary contact info if available
    let contactName = "NA";
    let contactEmail = "NA";
    let contactPhone = "NA";
    
    if (lead.contacts && lead.contacts.length > 0) {
      const primaryContact = lead.contacts[0];
      
      // Get contact name
      contactName = primaryContact.name || primaryContact.display_name || "NA";
      
      // Get contact email
      if (primaryContact.emails && primaryContact.emails.length > 0) {
        contactEmail = primaryContact.emails[0].email || "NA";
      }
      
      // Get contact phone
      if (primaryContact.phones && primaryContact.phones.length > 0) {
        contactPhone = primaryContact.phones[0].phone || "NA";
      }
    }

    // Get opportunity data for confidence and pipeline name
    let confidence = "NA";
    let pipelineName = "NA";

    if (lead.opportunities && lead.opportunities.length > 0) {
      // Sort opportunities by date_updated (most recent first)
      const sortedOpps = [...lead.opportunities].sort((a, b) => 
        new Date(b.date_updated).getTime() - new Date(a.date_updated).getTime()
      );
      
      // Use the most recent opportunity for confidence and pipeline name
      const mostRecentOpp = sortedOpps[0];
      confidence = typeof mostRecentOpp.confidence === 'number' ? `${mostRecentOpp.confidence}%` : "NA";
      pipelineName = mostRecentOpp.pipeline_name || "NA";
      
      // If there's a broker pipeline, prioritize showing that
      const brokerOpp = lead.opportunities.find(opp => 
        opp.pipeline_name && opp.pipeline_name.toLowerCase().includes('broker')
      );
      
      if (brokerOpp && brokerOpp.pipeline_name) {
        pipelineName = brokerOpp.pipeline_name;
      }
    }
    
    // Create the base row with standard fields
    const baseRow = [
      lead.displayName,
      lead.createdByName,
      lead.status_label,
      formatDate(lead.date_created),
      formatDate(lead.date_updated),
      pipelineName,
      lead.opportunities.length > 0 ? formatOpportunityDetails(lead.opportunities) : "NA",
      lead.opportunities.length > 0 ? formatOpportunityNotes(lead.opportunities) : "NA",
      formatLatestNotes(lead.notes || []),
      formatTasks(lead.tasks || []),
      confidence,
      contactName,
      contactEmail,
      contactPhone,
      lead.html_url
    ];
    
    // Add custom fields to the row
    const customFieldKeys = dynamicHeaders.slice(BASE_LEAD_HEADERS.length);
    const customValues = customFieldKeys.map(key => {
      const value = lead.customFields[key];
      
      // Handle different value types
      if (value === undefined || value === null) {
        return "NA";
      } else if (Array.isArray(value)) {
        return value.join(", ");
      } else if (typeof value === 'object') {
        return JSON.stringify(value);
      } else {
        return String(value);
      }
    });
    
    // Combine base row with custom fields
    rows.push([...baseRow, ...customValues]);
  });

  return rows;
}

/**
 * Format opportunity details into a readable string
 */
function formatOpportunityDetails(opportunities: any[]): string {
  return opportunities.map((opp, index) => {
    const pipeline = opp.pipeline_name ? `${opp.pipeline_name}: ` : '';
    const status = opp.status_label || 'Unknown';
    const value = opp.value_formatted || (opp.value ? `${opp.value} ${opp.value_currency || ''}` : 'N/A');
    const confidence = typeof opp.confidence === 'number' ? `${opp.confidence}%` : 'N/A';
    const date = opp.date_created ? formatDate(opp.date_created).split(' ')[0] : 'N/A';
    
    return `${pipeline}${status} (${value}) - ${confidence} - ${date}`;
  }).join('; ');
}

/**
 * Format opportunity notes into a readable string
 */
function formatOpportunityNotes(opportunities: any[]): string {
  return opportunities.map((opp, index) => {
    const pipeline = opp.pipeline_name ? `${opp.pipeline_name}: ` : '';
    const status = opp.status_label || 'Unknown';
    const note = opp.note ? opp.note : 'No notes';
    
    return `${pipeline}${status}: ${note}`;
  }).join('\n\n');
}

/**
 * Format opportunity data for Google Sheets
 */
function formatOpportunityDataForSheet(leads: TransformedLead[]): string[][] {
  // Add headers as first row
  const rows: string[][] = [OPPORTUNITY_HEADERS];
  
  // Add opportunity data
  leads.forEach(lead => {
    if (lead.opportunities && lead.opportunities.length > 0) {
      lead.opportunities.forEach((opp: Opportunity) => {
        rows.push([
          lead.displayName,
          opp.id || "",
          opp.pipeline_name || "",
          opp.status_label || "",
          opp.status_type || "",
          String(opp.value || "0"),
          opp.value_formatted || "",
          opp.contact_name || "",
          opp.created_by_name || "",
          formatDate(opp.date_created || ""),
          formatDate(opp.date_updated || ""),
          formatDate(opp.date_won || ""),
          formatDate(opp.date_lost || ""),
          String(opp.confidence || "0"),
          opp.note || ""
        ]);
      });
    }
  });

  return rows;
}

/**
 * Format ISO date string to more readable format
 */
function formatDate(isoDateString: string): string {
  if (!isoDateString) return "";
  
  try {
    const date = new Date(isoDateString);
    return date.toISOString().split('T')[0] + ' ' + 
           date.toTimeString().split(' ')[0].substring(0, 5);
  } catch (e) {
    return isoDateString;
  }
}

/**
 * Create a new Google Sheet
 */
export async function createNewSheet(title: string): Promise<string> {
  try {
    const sheets = await getGoogleSheetsClient();
    const drive = google.drive({ version: 'v3', auth: sheets.context._options.auth });

    // Create spreadsheet
    const spreadsheet = await sheets.spreadsheets.create({
      requestBody: {
        properties: { title },
        sheets: [
          {
            properties: {
              title: 'Leads',
              gridProperties: { frozenRowCount: 1 }
            }
          }
        ]
      }
    });

    const spreadsheetId = spreadsheet.data.spreadsheetId;
    if (!spreadsheetId) throw new Error('Failed to create spreadsheet');

    console.log(`Created new spreadsheet with ID: ${spreadsheetId}`);

    // First make it public with anyone-with-link access
    try {
      await drive.permissions.create({
        fileId: spreadsheetId,
        requestBody: {
          role: 'writer',
          type: 'anyone',
          allowFileDiscovery: false
        }
      });

      console.log('Made spreadsheet public');

      // Then add specific user as editor
      await drive.permissions.create({
        fileId: spreadsheetId,
        requestBody: {
          role: 'writer',
          type: 'user',
          emailAddress: 'control@fundingbay.co.uk'
        }
      });

      console.log('Added user as editor');
    } catch (error: any) {
      console.error('Permission error:', error?.message || 'Unknown error');
    }

    const url = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit?usp=sharing`;
    console.log(`Spreadsheet URL: ${url}`);
    return spreadsheetId;
  } catch (error: any) {
    console.error('Error in createNewSheet:', error?.message || 'Unknown error');
    throw error;
  }
}

/**
 * Write data to Google Sheets
 */
export async function writeToGoogleSheets(
  leads: TransformedLead[],
  spreadsheetId: string = DEFAULT_SPREADSHEET_ID
): Promise<void> {
  try {
    const sheets = await getGoogleSheetsClient();

    // First, clear existing data from sheets
    await sheets.spreadsheets.values.clear({
      spreadsheetId,
      range: 'Leads!A:Z'  // Clear all columns in Leads sheet
    });

    // Format data
    const leadSheetData = formatLeadDataForSheet(leads);

    // Batch update to write to sheets
    await sheets.spreadsheets.values.batchUpdate({
      spreadsheetId,
      requestBody: {
        valueInputOption: 'RAW',
        data: [
          {
            range: 'Leads!A1',
            values: leadSheetData
          }
        ]
      }
    });

    // Auto-resize columns for better visibility
    await autoResizeColumns(sheets, spreadsheetId);

    console.log('Data successfully written to Google Sheets');
  } catch (error) {
    console.error('Error writing to Google Sheets:', error);
    throw error;
  }
}

/**
 * Auto-resize columns for better readability
 */
async function autoResizeColumns(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string
): Promise<void> {
  try {
    // Get sheet IDs
    const response = await sheets.spreadsheets.get({
      spreadsheetId,
      fields: 'sheets.properties'
    });

    if (!response.data.sheets || response.data.sheets.length === 0) {
      return;
    }

    // Prepare batch update requests
    const requests: any[] = [];
    
    response.data.sheets.forEach(sheet => {
      const sheetId = sheet.properties?.sheetId;
      if (sheetId === undefined) return;

      requests.push({
        autoResizeDimensions: {
          dimensions: {
            sheetId,
            dimension: 'COLUMNS',
            startIndex: 0,
            endIndex: 50 // Increased to handle more columns
          }
        }
      });
    });

    if (requests.length > 0) {
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: {
          requests
        }
      });
    }
  } catch (error) {
    console.warn('Error auto-resizing columns:', error);
    // Don't throw here, since this is just a visual enhancement
  }
}

/**
 * Apply formatting to the sheets for better readability
 */
export async function applySheetFormatting(spreadsheetId: string): Promise<void> {
  try {
    const sheets = await getGoogleSheetsClient();
    
    // Get sheet IDs
    const response = await sheets.spreadsheets.get({
      spreadsheetId,
      fields: 'sheets.properties'
    });

    if (!response.data.sheets || response.data.sheets.length === 0) {
      return;
    }

    const requests: any[] = [];
    
    for (const sheet of response.data.sheets) {
      const sheetId = sheet.properties?.sheetId;
      if (sheetId === undefined) continue;
      
      // Add header formatting
      requests.push({
        repeatCell: {
          range: {
            sheetId,
            startRowIndex: 0,
            endRowIndex: 1
          },
          cell: {
            userEnteredFormat: {
              backgroundColor: {
                red: 0.2,
                green: 0.2,
                blue: 0.2
              },
              textFormat: {
                bold: true,
                foregroundColor: {
                  red: 1.0,
                  green: 1.0,
                  blue: 1.0
                }
              }
            }
          },
          fields: 'userEnteredFormat(backgroundColor,textFormat)'
        }
      });
      
      // Add alternating row colors
      requests.push({
        addConditionalFormatRule: {
          rule: {
            ranges: [{
              sheetId,
              startRowIndex: 1
            }],
            booleanRule: {
              condition: {
                type: 'CUSTOM_FORMULA',
                values: [{
                  userEnteredValue: '=MOD(ROW(),2)=0'
                }]
              },
              format: {
                backgroundColor: {
                  red: 0.95,
                  green: 0.95,
                  blue: 0.95
                }
              }
            }
          },
          index: 0
        }
      });
    }

    if (requests.length > 0) {
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: {
          requests
        }
      });
    }

    console.log('Sheet formatting applied successfully');
  } catch (error) {
    console.warn('Error applying sheet formatting:', error);
  }
}
