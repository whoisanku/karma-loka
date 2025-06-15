export interface FarcasterUser {
  fid: string;
  followingCount: number;
  followerCount: number;
  pfp: {
    url: string;
    verified: boolean;
  };
  bio: {
    text: string;
    mentions: string[];
  };
  external: boolean;
  custodyAddress: string;
  username: string;
  displayName: string;
  registeredAt: string;
}

export interface FarcasterUserResponse {
  result: {
    user: FarcasterUser;
  };
  source: string;
}
