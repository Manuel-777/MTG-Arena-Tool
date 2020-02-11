export interface DraftStatus {
  DraftId: string;
  PackNumber: number;
  PickNumber: number;
  PickedCards: string;
  DraftPack?: number[];
}

export interface DraftData {
  id: string;
  pickNumber: number;
  packNumber: number;
  set: string;
  pickedCards: any;
  currentPack?: any;
  [key: string]: any;
}

export interface DraftState {
  packN: number;
  pickN: number;
}
