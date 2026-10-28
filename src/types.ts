export interface Delimiters {
  field: string;
  component: string;
  repetition: string;
  escape: string;
  subcomponent: string;
}

export interface Hl7Field {
  index: number;
  value: string;
  repetitions: string[][][];
}

export interface Hl7Segment {
  name: string;
  raw: string;
  fields: Hl7Field[];
  index: number;
}

export interface Hl7Message {
  segments: Hl7Segment[];
  delimiters: Delimiters;
}

export interface Issue {
  severity: 'error' | 'warning';
  title: string;
  detail: string;
  location?: string;
}

export interface FieldDefinition {
  name: string;
  datatype?: string;
  description: string;
}
