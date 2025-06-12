import { useState, useEffect } from "react";
import { FarcasterUser } from "../types/farcaster";

const API_KEY = "L60RP-AMTZV-O48J1-1N4H8-UVRDQ";
const API_URL =
  "https://build.wield.xyz/farcaster/v2/user-by-connected-address";

const cache = new Map<string, FarcasterUser | null>();

export const useFarcasterProfiles = (addresses: string[]) => {
  const [profiles, setProfiles] = useState<
    Record<string, FarcasterUser | null>
  >({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchProfiles = async () => {
      setLoading(true);
      const newProfiles: Record<string, FarcasterUser | null> = {};
      const addressesToFetch = addresses.filter(
        (addr) => !cache.has(addr) && addr
      );

      if (addressesToFetch.length > 0) {
        await Promise.all(
          addressesToFetch.map(async (address) => {
            try {
              const response = await fetch(`${API_URL}?address=${address}`, {
                headers: {
                  "API-KEY": API_KEY,
                },
              });
              if (response.ok) {
                const data = await response.json();
                const user = data.result?.user ?? null;
                cache.set(address, user);
              } else {
                cache.set(address, null);
              }
            } catch (error) {
              console.error(
                `Error fetching Farcaster user for ${address}:`,
                error
              );
              cache.set(address, null);
            }
          })
        );
      }

      for (const address of addresses) {
        if (address) {
          newProfiles[address] = cache.get(address) ?? null;
        }
      }

      setProfiles(newProfiles);
      setLoading(false);
    };

    if (addresses.length > 0) {
      fetchProfiles();
    } else {
      setProfiles({});
    }
  }, [JSON.stringify(addresses)]);

  return { profiles, loading };
};
