# Close Sheet Integration

This project exports data from Close.com API to Google Sheets using a service account for authentication.

## Features

- Fetches lead data from Close.com API
- Transforms data into a structured format
- Exports to Google Sheets with proper formatting
- Handles opportunities in a separate sheet
- Auto-resizes columns and applies formatting
- No interactive authentication required

## Setup

1. Install dependencies:
   ```
   npm install
   ```

2. Create a Google Cloud Service Account (if not already done):
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project (or select an existing one)
   - Enable the Google Sheets API
   - Go to IAM & Admin > Service Accounts
   - Create a new service account
   - Give it a name and description
   - Grant the "Editor" role for Google Sheets
   - Create a key (JSON type) and download it
   - Save the key file as `service-account-key.json` in the project root

3. Configure API Keys:
   - The Close.com API key is already configured in the code
   - If you need to update it, edit the `CLOSE_API_KEY` constant in `closeSheetExport.ts`

## Usage

### First Run

The first time you run the export, it will create a new Google Sheet:

```
npm run export
```

This will:
1. Fetch leads from Close.com
2. Create a new Google Sheet with two tabs: "Leads" and "Opportunities"
3. Export the data to the sheets
4. Apply formatting for better readability
5. Output the Google Sheet URL in the console

Copy the spreadsheet ID from the console output and update the `DEFAULT_SPREADSHEET_ID` in `sheetIntegration.ts` for future use.

### Subsequent Runs

After updating the spreadsheet ID:

```
npm run export
```

This will:
1. Fetch leads from Close.com
2. Update the existing Google Sheet with the latest data
3. Apply formatting

## Sheet Structure

### Leads Sheet
Contains one row per lead with columns:
- Display Name
- Created By
- Status
- Date Created
- Date Updated
- FB/FBX
- Lead Source
- Lead Owner
- Mob?
- Triage Checked
- Industry
- Sector
- Partner/Prospect/Lender
- URL
- Opportunities Count

### Opportunities Sheet
Contains one row per opportunity with columns:
- Lead Name
- Opportunity ID
- Pipeline Name
- Status Label
- Status Type
- Value
- Value Formatted
- Contact Name
- Created By
- Date Created
- Date Updated
- Date Won
- Date Lost
- Confidence
- Notes

## Development

- Build the TypeScript files:
  ```
  npm run build
  ```

- Fetch data without exporting to sheet:
  ```
  npm run fetch
  ```

- Export to sheet:
  ```
  npm run export
  ``` 