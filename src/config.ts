import dotenv from "dotenv"
import path from "path";

dotenv.config();

interface Config{
  closeApiKey: string;
  googleSheetId: string;
  googleServiceAccountPath: string;
  adminEmail: string;
  sourceFieldId:string;
}

const requiredVar = [
  'CLOSE_API_KEY',
  'GOOGLE_SHEET_ID',
  'GOOGLE_SERVICE_ACCOUNT_PATH',
  'ADMIN_EMAIL',
  'SOURCE_FIELD_ID'
]

for (const envVar of requiredVar){
  if(!process.env[envVar]){
    throw new Error(`Missing required environment varaible: ${envVar}`)
  }
}
 
export const config: Config = {
  closeApiKey: process.env.CLOSE_API_KEY!,
  googleSheetId: process.env.GOOGLE_SHEET_ID!,
  googleServiceAccountPath: path.resolve(process.env.GOOGLE_SERVICE_ACCOUNT_PATH!),
  adminEmail: process.env.ADMIN_EMAIL!,
  sourceFieldId: process.env.SOURCE_FIELD_ID!
};