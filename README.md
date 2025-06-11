# Close Sheet Integration

This project exports data from Close.com API to Google Sheets using a service account for authentication. It includes an automated scheduler that can run exports at specified intervals.

## Features

- Fetches lead data from Close.com API
- Transforms data into a structured format
- Exports to Google Sheets with proper formatting
- Handles opportunities in a separate sheet
- Auto-resizes columns and applies formatting
- Automated scheduling (runs daily at 6:00 AM BST)
- Environment-based configuration
- Secure credential handling

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Create a Google Cloud Service Account:
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project (or select an existing one)
   - Enable the Google Sheets API
   - Go to IAM & Admin > Service Accounts
   - Create a new service account
   - Give it a name and description
   - Grant the "Editor" role for Google Sheets
   - Create a key (JSON type) and download it
   - Save the key file as `service-account-key.json` in the `creds` directory

3. Set up environment variables:
   - Copy `.env.example` to `.env`
   - Fill in your actual values:
     ```env
     # Close.com API Configuration
     CLOSE_API_KEY=your_close_api_key_here

     # Google Sheets Configuration
     GOOGLE_SHEET_ID=your_sheet_id_here
     GOOGLE_SERVICE_ACCOUNT_PATH=creds/service-account-key.json

     # Email Configuration
     ADMIN_EMAIL=your_email@example.com

     # Source Field Configuration
     SOURCE_FIELD_ID=your_source_field_id_here
     ```

## Usage

### Manual Export

Run a one-time export:

```bash
npm run export
```

This will:
1. Fetch leads from Close.com
2. Create a new Google Sheet (if no sheet ID is configured)
3. Export the data to the sheets
4. Apply formatting for better readability
5. Output the Google Sheet URL in the console

### Automated Scheduler

The scheduler runs the export automatically at 6:00 AM BST every day.

For development/testing:
```bash
npm run scheduler
```

For production:
```bash
# First build the TypeScript files
npm run build

# Then run the production scheduler
npm run scheduler:prod
```

## Deployment

### Local Development
1. Set up environment variables in `.env`
2. Run the scheduler in development mode:
   ```bash
   npm run scheduler
   ```

### AWS EC2 Deployment
1. Install Node.js and PM2:
   ```bash
   npm install -g pm2
   ```

2. Set up the application:
   ```bash
   # Clone and install dependencies
   git clone <repository-url>
   cd CloseSheetIntegration
   npm install

   # Build TypeScript files
   npm run build

   # Start with PM2
   pm2 start dist/scheduler.js --name "close-sheet-scheduler"
   pm2 save
   pm2 startup
   ```

### AWS Lambda Deployment
1. Create a Lambda function
2. Set up an EventBridge (CloudWatch Events) rule:
   - Cron expression: `0 6 * * ? *`
   - Target: Your Lambda function

### Docker Deployment
1. Build the Docker image:
   ```bash
   docker build -t close-sheet-integration .
   ```

2. Run the container:
   ```bash
   docker run -d \
     --name close-sheet-scheduler \
     --env-file .env \
     close-sheet-integration
   ```

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

### Available Scripts

- Build TypeScript files:
  ```bash
  npm run build
  ```

- Fetch data without exporting:
  ```bash
  npm run fetch
  ```

- Run manual export:
  ```bash
  npm run export
  ```

- Run scheduler (development):
  ```bash
  npm run scheduler
  ```

- Run scheduler (production):
  ```bash
  npm run scheduler:prod
  ```

### Security Notes

- Never commit the `.env` file or the `creds` directory to version control
- Keep your service account key secure
- Regularly rotate API keys and credentials
- Monitor the scheduler logs for any issues

## Troubleshooting

1. If the scheduler stops:
   - Check the logs: `pm2 logs close-sheet-scheduler`
   - Restart the scheduler: `pm2 restart close-sheet-scheduler`

2. If exports fail:
   - Verify environment variables are set correctly
   - Check API key permissions
   - Ensure Google Service Account has proper access
   - Review the application logs

3. If no leads are returned:
   - Verify the SOURCE_FIELD_ID in .env
   - Check if leads exist with the specified source
   - Confirm API key has proper permissions

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a new Pull Request 
  npm run export
  ``` 