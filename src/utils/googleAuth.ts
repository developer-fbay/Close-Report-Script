import { google } from 'googleapis';
import * as fs from 'fs';
import * as readline from 'readline';
import * as path from 'path';
import { OAuth2Client } from 'google-auth-library';

const SCOPES = [
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/drive',
  'https://www.googleapis.com/auth/drive.file'
];
const TOKEN_PATH = path.join(__dirname, 'token.json');
const CREDENTIALS_PATH = path.join(__dirname, 'credentials.json');

interface Credentials {
  installed: {
    client_id: string;
    client_secret: string;
    redirect_uris: string[];
  }
}

async function getNewToken(): Promise<void> {
  try {
    const content = fs.readFileSync(CREDENTIALS_PATH, 'utf8');
    const credentials = JSON.parse(content) as Credentials;
    
    const { client_secret, client_id, redirect_uris } = credentials.installed;
    const oAuth2Client = new google.auth.OAuth2(
      client_id, client_secret, redirect_uris[0]
    );

    const authUrl = oAuth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: SCOPES,
    });
    
    console.log('Authorize this app by visiting this url:', authUrl);
    
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    
    rl.question('Enter the code from that page here: ', async (code: string) => {
      rl.close();
      try {
        const { tokens } = await oAuth2Client.getToken(code);
        oAuth2Client.setCredentials(tokens);
        
        // Store the token to disk for later program executions
        fs.writeFileSync(TOKEN_PATH, JSON.stringify(tokens));
        console.log('Token stored to', TOKEN_PATH);
      } catch (err) {
        console.error('Error retrieving access token', err);
      }
    });
  } catch (err) {
    console.error('Error loading client secret file:', err);
  }
}

// Run the authentication
getNewToken();

export async function getAuthClient(): Promise<OAuth2Client> {
  const keyFile = path.join(__dirname, 'service-account-key.json');
  const auth = new google.auth.GoogleAuth({
    keyFile,
    scopes: SCOPES
  });
  
  const client = await auth.getClient();
  return client as OAuth2Client;
}

export async function getSheetsClient() {
  const auth = await getAuthClient();
  const sheets = google.sheets({ 
    version: 'v4', 
    auth 
  });
  return sheets;
}

export async function getDriveClient() {
  const auth = await getAuthClient();
  const drive = google.drive({ 
    version: 'v3', 
    auth 
  });
  return drive;
} 