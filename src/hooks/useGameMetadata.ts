import { useState, useEffect } from 'react';
import { storageClient } from '../utils/storage'; // Make sure to import your storage client

interface GameMetadata {
  name: string;
  description?: string;
  // Add other metadata fields as needed
}

const metadataCache: Record<string, GameMetadata> = {};

export function useGameMetadata(metadataUri: string): { 
  metadata: GameMetadata | null;
  isLoading: boolean;
  error: string | null;
} {
  const [metadata, setMetadata] = useState<GameMetadata | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!metadataUri) {
      setMetadata(null);
      return;
    }

    // If we have cached data, use it immediately
    if (metadataCache[metadataUri]) {
      setMetadata(metadataCache[metadataUri]);
      return;
    }

    const fetchMetadata = async () => {
      try {
        setIsLoading(true);
        setError(null);

        let fetchUrl = metadataUri;
        
        // Handle lens:// URLs
        if (fetchUrl.startsWith('lens://')) {
          // Use storageClient to resolve the lens:// URI to an HTTPS URL
          fetchUrl = storageClient.resolve(fetchUrl);
          console.log('Resolved URL:', fetchUrl);
        }

        const response = await fetch(fetchUrl);
        if (!response.ok) {
          throw new Error('Failed to fetch metadata');
        }

        const data = await response.json();
        console.log('Retrieved metadata:', data);
        
        metadataCache[metadataUri] = data;
        setMetadata(data);
      } catch (err) {
        console.error('Error fetching game metadata:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch metadata');
      } finally {
        setIsLoading(false);
      }
    };

    fetchMetadata();
  }, [metadataUri]);

  return { metadata, isLoading, error };
} 