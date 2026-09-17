export type Gender = "male" | "female" | "other";

export interface Photo {
  id: string;
  url: string;
  caption?: string;
}

export interface Source {
  id: string;
  title: string;
  url?: string;
  note?: string;
}

export interface DocumentRef {
  id: string;
  title: string;
  url: string;
  type?: string;
}

export interface Person {
  id: string;
  firstName: string;
  lastName: string;
  birthName?: string;
  gender?: Gender;
  birthDate?: string;
  birthPlace?: string;
  deathDate?: string;
  deathPlace?: string;
  biography?: string;
  photos?: Photo[];
  sources?: Source[];
  documents?: DocumentRef[];
  notes?: string;
}

export interface Family {
  id: string;
  partnerIds: string[];
  childrenIds: string[];
}
