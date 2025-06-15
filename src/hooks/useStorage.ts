import { chains } from "@lens-chain/sdk/viem";
import { immutable, production, StorageClient } from "@lens-chain/storage-client";

export const storageClient = StorageClient.create(production);
const acl = immutable(chains.testnet.id);

interface UseStorageReturn {
  uploadImage: (file: File) => Promise<{ uri: string }>;
  uploadGameMetadata: (name: string) => Promise<{ uri: string }>;
  resolveUri: (uri: string) => Promise<string>;
}

export function useStorage(): UseStorageReturn {
  const uploadImage = async (file: File) => {
    try {
      const response = await storageClient.uploadFile(file, { acl });
      return response;
    } catch (error) {
      console.error('Error uploading image:', error);
      throw error;
    }
  };

  const uploadGameMetadata = async (name: string) => {
    try {
      const payload = {
        name,
        timestamp: new Date().toISOString(),
        type: 'game_metadata'
      };

      const metaRes = await storageClient.uploadAsJson(payload, { acl });
      console.log("Storage response:", metaRes);
      console.log("Meta URI:", metaRes.uri);

      // Resolve and log the actual content URL
      const resolvedUrl = storageClient.resolve(metaRes.uri);
      console.log("Resolved URL:", resolvedUrl);
      
      // Fetch and log the content to verify
      try {
        const response = await fetch(resolvedUrl);
        const content = await response.json();
        console.log("Retrieved content:", content);
      } catch (fetchError) {
        console.error("Error fetching content:", fetchError);
      }

      return metaRes;
    } catch (error) {
      console.error('Error uploading game metadata:', error);
      throw error;
    }
  };

  const resolveUri = async (uri: string): Promise<string> => {
    try {
      if (uri.startsWith("lens://")) {
        const resolvedUrl = await storageClient.resolve(uri);
        console.log(`Resolved ${uri} to:`, resolvedUrl);
        return resolvedUrl;
      }
      return uri; // Return as-is if not a lens:// URI
    } catch (error) {
      console.error('Error resolving URI:', error);
      throw error;
    }
  };

  return {
    uploadImage,
    uploadGameMetadata,
    resolveUri,
  };
} 