import { Client, Databases, Account } from 'node-appwrite';
import { NODE_ENV } from './env.js';

// Validation des variables d'environnement requises
const endpoint = process.env.APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1';
const projectId = process.env.APPWRITE_PROJECT_ID;
const apiKey = process.env.APPWRITE_API_KEY;
const databaseId = process.env.APPWRITE_DATABASE_ID;

if (!projectId || !apiKey || !databaseId) {
  throw new Error("[APPWRITE-CONFIG] Variables d'environnement manquantes pour Appwrite.");
}

// Initialisation du client Node SDK
const client = new Client();
client
  .setEndpoint(endpoint)
  .setProject(projectId)
  .setKey(apiKey);

export const appwriteConfig = {
  endpoint,
  projectId,
  databaseId,
  env: NODE_ENV,
};

// Export des instances des services utiles
export const appwriteDb = new Databases(client);
export const appwriteAccount = new Account(client);
export default client;