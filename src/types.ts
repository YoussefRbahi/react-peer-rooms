export type PeerData = {
  type: string;
  value: any;
};

export interface PeerEvent {
  peerId: string;
  type: string;
  value?: string;
  nickname?: string;
  timestamp: number;
}

export interface Nicknames {
  [key: string]: string;
}
