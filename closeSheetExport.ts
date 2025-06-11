import axios from "axios";
import { google } from "googleapis";
import { TransformedLead, fetchLeadsBySource } from "./closeAPIDataFetch";
import { createNewSheet, writeToGoogleSheets, applySheetFormatting, DEFAULT_SPREADSHEET_ID } from "./sheetIntegration";
import * as path from "path";
import {config} from "./config";
// Define Note interface
interface Note {
  id: string;
  note: string;
  date_created: string;
  created_by_name: string;
}

const CLOSE_API_KEY = config.closeApiKey;
const EMAIL = config.adminEmail;

const SERVICE_ACCOUNT_KEY_FILE = config.googleServiceAccountPath

const SCOPES = [
  "https://www.googleapis.com/auth/spreadsheets",
  "https://www.googleapis.com/auth/drive"
];

function getGoogleAuth() {
  return new google.auth.GoogleAuth({
    keyFile: SERVICE_ACCOUNT_KEY_FILE,
    scopes: SCOPES,
  });
}

// Add mail of user to sahre sheet with them 
async function shareSheetWithUser(spreadsheetId: string, userEmail: string) {
  const auth = await getGoogleAuth().getClient();
  const drive = google.drive({ version: "v3", auth: auth as any });

  try {
    await drive.permissions.create({
      fileId: spreadsheetId,
      requestBody: {
        type: "user",
        role: "writer",
        emailAddress: userEmail,
      },
      fields: "id",
    });
    console.log(`Shared spreadsheet with ${userEmail}`);
  } catch (error) {
    console.error("Failed to share spreadsheet:", error);
    throw error;
  }
}

async function fetchNotesForLead(leadId: string, retries = 3): Promise<Note[]> {
  const url = `https://api.close.com/api/v1/activity/note/`;
  const params = {
    _limit: 3,
    lead_id: leadId,
    _order_by: '-date_created'
  };

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await axios.get(url, {
        params,
        auth: {
          username: typeof CLOSE_API_KEY === 'string' ? CLOSE_API_KEY : CLOSE_API_KEY,
          password: ""
        },
        timeout: 10000 
      });
      
      return response.data.data.map((note: any) => ({
        id: note.id,
        note: note.note || note.note_html || '',
        date_created: note.date_created,
        created_by_name: note.created_by_name || 'Unknown'
      }));
    } catch (error) {
      if (attempt === retries) {
        console.log(`Error fetching notes for lead ${leadId} after ${retries} attempts:`, error);
        return [];
      }
      
      await new Promise(resolve => setTimeout(resolve, attempt * 1000));
    }
  }
  return [];
}

async function main() {
  try {
    console.log("Fetching leads from Close.com API...");
    const leads = await fetchLeadsBySource();
    console.log(`Fetched ${leads.length} leads from Close.com`);

    let spreadsheetId = DEFAULT_SPREADSHEET_ID;

    if (!spreadsheetId) {
      console.log("No spreadsheet ID found, creating a new Google Sheet...");
      const title = `Close.com Leads - ${new Date().toISOString().split('T')[0]}`;
      spreadsheetId = await createNewSheet(title);
      console.log(`Created new spreadsheet with ID: ${spreadsheetId}`);
      console.log(`Please update the DEFAULT_SPREADSHEET_ID in sheetIntegration.ts for future use.`);
    }

    // Share the sheet with your email
    await shareSheetWithUser(spreadsheetId, EMAIL);

    // Write the data to Google Sheets
    console.log(`Writing data to Google Sheets (ID: ${spreadsheetId})...`);
    await writeToGoogleSheets(leads, spreadsheetId);

    // Apply formatting to make the sheet more readable
    console.log("Applying formatting to the sheets...");
    await applySheetFormatting(spreadsheetId);

    console.log("Export completed successfully!");
    console.log(`Google Sheet URL: https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`);
  } catch (error) {
    console.error("Error in export process:", error);
    throw error;
  }
}

// Run main() only if this file is being run directly
if (require.main === module) {
  main().catch(error => {
    console.error("Error in main:", error);
    process.exit(1);
  });
}

export { main };
