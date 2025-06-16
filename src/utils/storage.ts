import { StorageClient } from "@lens-chain/storage-client";
export const storageClient = StorageClient.create();

export const resolveUri = async (uri: string): Promise<string> => {
  if (uri.startsWith("lens://")) {
    return storageClient.resolve(uri);
  }
  return uri;
};