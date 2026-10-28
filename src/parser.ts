import type { Delimiters, FieldDefinition, Hl7Field, Hl7Message, Hl7Segment, Issue } from './types';

const defaultDelimiters: Delimiters = {
  field: '|',
  component: '^',
  repetition: '~',
  escape: '\\',
  subcomponent: '&'
};

export const MAX_MESSAGE_CHARACTERS = 512_000;
export const MAX_SEGMENTS = 500;

interface SourceLine {
  raw: string;
  lineNumber: number;
}

function getSegments(input: string): SourceLine[] | null {
  const segments: SourceLine[] = [];
  let start = 0;
  let lineNumber = 1;

  for (let index = 0; index <= input.length; index++) {
    if (index < input.length && input[index] !== '\r' && input[index] !== '\n') continue;

    const raw = input.slice(start, index);
    if (raw.trim()) {
      segments.push({ raw, lineNumber });
      if (segments.length > MAX_SEGMENTS) return null;
    }

    if (index === input.length) break;
    if (input[index] === '\r' && input[index + 1] === '\n') index++;
    start = index + 1;
    lineNumber++;
  }

  return segments;
}

export function countSegments(input: string): number {
  if (input.length > MAX_MESSAGE_CHARACTERS) return MAX_SEGMENTS + 1;
  return getSegments(input)?.length ?? MAX_SEGMENTS + 1;
}

function getDelimiters(header: string): Delimiters {
  if (header.slice(0, 3) !== 'MSH' || header.length < 8) return { ...defaultDelimiters };
  const encoding = header.slice(4, 8);
  return {
    field: header[3],
    component: encoding[0],
    repetition: encoding[1],
    escape: encoding[2],
    subcomponent: encoding[3]
  };
}

export function parseMessage(input: string): Hl7Message {
  if (input.length > MAX_MESSAGE_CHARACTERS) {
    return { segments: [], delimiters: { ...defaultDelimiters }, limitExceeded: 'characters' };
  }

  const lines = getSegments(input);
  if (!lines) {
    return { segments: [], delimiters: { ...defaultDelimiters }, limitExceeded: 'segments' };
  }

  const delimiters = getDelimiters(lines[0]?.raw ?? '');

  const segments = lines.map(({ raw, lineNumber }, index): Hl7Segment => {
    const name = raw.slice(0, 3);
    const values = raw.split(delimiters.field);
    // MSH-1 and MSH-2 are encoded in the header itself, before ordinary fields begin.
    const fieldValues = name === 'MSH'
      ? [delimiters.field, values[1] ?? '', ...values.slice(2)]
      : values.slice(1);
    const fields: Hl7Field[] = fieldValues.map((value, fieldIndex) => {
      const fieldNumber = fieldIndex + 1;
      const isEncodingCharacters = name === 'MSH' && fieldNumber === 2;
      return {
        index: fieldNumber,
        value,
        repetitions: isEncodingCharacters
          ? [[[value]]]
          : value.split(delimiters.repetition).map(repetition =>
            repetition.split(delimiters.component).map(component => component.split(delimiters.subcomponent))
          )
      };
    });

    return { name, raw, fields, index: index + 1, lineNumber };
  });

  return { segments, delimiters };
}

const requiredFields: Record<string, number[]> = {
  MSH: [9, 10, 11, 12],
  PID: [3, 5],
  PV1: [2]
};

function issue(
  severity: Issue['severity'],
  title: string,
  detail: string,
  location?: string
): Issue {
  return { severity, title, detail, ...(location ? { location } : {}) };
}

export function validateMessage(input: string, message: Hl7Message): Issue[] {
  if (input.length > MAX_MESSAGE_CHARACTERS) {
    return [issue('error', 'Message exceeds the size limit', `The maximum supported message size is ${MAX_MESSAGE_CHARACTERS.toLocaleString('en-US')} characters.`)];
  }

  if (!input.trim()) {
    return [issue('error', 'Message is empty', 'Paste an HL7 v2 message to get started.')];
  }

  const issues: Issue[] = [];
  const lines = getSegments(input);
  if (!lines) {
    return [issue('error', 'Message has too many segments', `The maximum supported message contains ${MAX_SEGMENTS.toLocaleString('en-US')} non-empty segments.`)];
  }

  const firstLine = lines[0]?.raw ?? '';
  const hasMshFirst = firstLine.slice(0, 3) === 'MSH';
  const mshLine = lines.find(line => line.raw.slice(0, 3) === 'MSH');
  const msh = mshLine?.raw;

  if (!hasMshFirst) {
    issues.push(issue('error', 'MSH must be the first segment', 'Every HL7 v2 message starts with a message header (MSH).'));
  }

  const hasMixedLineEndings = input.includes('\r') && input.replace(/\r\n/g, '').includes('\n');
  if (hasMixedLineEndings) {
    issues.push(issue('warning', 'Mixed segment separators', 'The message mixes carriage returns and line feeds. Use one separator consistently.'));
  }

  if (msh) {
    const fieldSeparator = msh[3];
    const encoding = msh.slice(4, 8);
    const validEncoding = encoding.length === 4
      && !/\s/.test(fieldSeparator ?? '')
      && !/[\s]/.test(encoding)
      && new Set(encoding).size === 4
      && !encoding.includes(fieldSeparator);

    if (!validEncoding) {
      issues.push(issue('error', 'MSH delimiters are invalid', 'MSH-1 must be followed by four distinct encoding characters in MSH-2.', 'MSH-1/2'));
    }

    const laterMsh = lines.find((line, index) => index > 0 && line.raw.slice(0, 3) === 'MSH');
    if (laterMsh) {
      issues.push(issue('error', 'Unexpected MSH segment', `A second MSH header appears on line ${laterMsh.lineNumber}.`, `line ${laterMsh.lineNumber}`));
    }
  }

  const fieldSeparator = message.delimiters.field || defaultDelimiters.field;
  for (const segment of message.segments) {
    const location = `line ${segment.lineNumber}`;
    if (!/^[A-Z0-9]{3}$/.test(segment.name)) {
      issues.push(issue('error', 'Invalid segment name', `“${segment.name || segment.raw}” is not a three-character segment name.`, location));
      continue;
    }
    if (segment.raw.length < 4 || segment.raw[3] !== fieldSeparator) {
      issues.push(issue('error', 'Invalid segment separator', `${segment.name} must be followed by the MSH field separator “${fieldSeparator}”.`, `${segment.name} (${location})`));
    }

    const required = requiredFields[segment.name];
    if (!required) continue;

    const highest = Math.max(...required);
    if (segment.fields.length < highest) {
      issues.push(issue('warning', `${segment.name} has too few fields`, `Expected positions through ${segment.name}-${highest}; found ${segment.fields.length} fields.`, `${segment.name}`));
    }
    for (const fieldIndex of required) {
      if (!segment.fields[fieldIndex - 1]?.value) {
        issues.push(issue('warning', `${segment.name}-${fieldIndex} is empty`, 'This field is required for the basic structure check.', `${segment.name}-${fieldIndex}`));
      }
    }
  }

  return issues;
}

export const segmentDescriptions: Record<string, string> = {
  MSH: 'Message Header',
  EVN: 'Event Type',
  PID: 'Patient Identification',
  PV1: 'Patient Visit',
  AL1: 'Patient Allergy Information',
  DG1: 'Diagnosis',
  ORC: 'Common Order',
  OBR: 'Observation Request',
  OBX: 'Observation Result',
  MSA: 'Message Acknowledgment',
  ERR: 'Error Information',
  NTE: 'Notes and Comments'
};

export const fieldDefinitions: Record<string, Record<number, FieldDefinition>> = {
  MSH: {
    1: { name: 'Field separator', datatype: 'ST', description: 'Separates fields throughout the message.' },
    2: { name: 'Encoding characters', datatype: 'ST', description: 'Defines the component, repetition, escape, and subcomponent separators.' },
    3: { name: 'Sending application', datatype: 'HD', description: 'Application that sent this message.' },
    4: { name: 'Sending facility', datatype: 'HD', description: 'Facility that sent this message.' },
    5: { name: 'Receiving application', datatype: 'HD', description: 'Application intended to receive this message.' },
    6: { name: 'Receiving facility', datatype: 'HD', description: 'Facility intended to receive this message.' },
    7: { name: 'Date / time of message', datatype: 'DTM', description: 'Time the sending system created the message.' },
    9: { name: 'Message type', datatype: 'MSG', description: 'Message code, trigger event, and optional structure.' },
    10: { name: 'Message control ID', datatype: 'ST', description: 'Identifier used to match acknowledgments to this message.' },
    11: { name: 'Processing ID', datatype: 'PT', description: 'Indicates whether this is production, debugging, or training traffic.' },
    12: { name: 'Version ID', datatype: 'VID', description: 'HL7 version used to encode the message.' }
  },
  EVN: {
    1: { name: 'Event type code', description: 'Code identifying the event that caused this message.' },
    2: { name: 'Recorded date / time', description: 'Time the event was recorded.' }
  },
  PID: {
    1: { name: 'Set ID', description: 'Sequence number for this PID segment.' },
    3: { name: 'Patient identifier list', description: 'Patient identifier and its assigning authority.' },
    5: { name: 'Patient name', description: 'Patient name, including family and given name components.' },
    7: { name: 'Date / time of birth', description: 'Patient birth date and, when present, time.' },
    8: { name: 'Administrative sex', description: 'Administrative sex recorded for the patient.' },
    11: { name: 'Patient address', description: 'Patient address, including street, city, state, and postal code.' },
    13: { name: 'Phone number - home', description: 'Home telephone contact details.' }
  },
  PV1: {
    1: { name: 'Set ID', description: 'Sequence number for this PV1 segment.' },
    2: { name: 'Patient class', description: 'Classifies the visit, such as inpatient or outpatient.' },
    3: { name: 'Assigned patient location', description: 'Location assigned to the patient for this visit.' },
    7: { name: 'Attending doctor', description: 'Provider responsible for the patient during the visit.' },
    19: { name: 'Visit number', description: 'Identifier assigned to this visit.' }
  },
  AL1: {
    1: { name: 'Set ID', description: 'Sequence number for this AL1 segment.' },
    3: { name: 'Allergen', description: 'Substance or class that caused the allergy.' },
    5: { name: 'Reaction', description: 'Reaction associated with the allergy.' }
  },
  DG1: {
    1: { name: 'Set ID', description: 'Sequence number for this DG1 segment.' },
    3: { name: 'Diagnosis code', description: 'Diagnosis identifier and optional text.' }
  },
  ORC: {
    1: { name: 'Order control', description: 'Action being requested for the order.' },
    2: { name: 'Placer order number', description: 'Identifier assigned to the order by the placer.' },
    3: { name: 'Filler order number', description: 'Identifier assigned to the order by the filler.' }
  },
  OBR: {
    1: { name: 'Set ID', description: 'Sequence number for this OBR segment.' },
    2: { name: 'Placer order number', description: 'Order identifier assigned by the requesting system.' },
    3: { name: 'Filler order number', description: 'Order identifier assigned by the performing system.' },
    4: { name: 'Universal service identifier', description: 'Code identifying the requested test or service.' },
    7: { name: 'Observation date / time', description: 'Date and time the observation was collected or performed.' }
  },
  OBX: {
    1: { name: 'Set ID', description: 'Sequence number for this OBX segment.' },
    2: { name: 'Value type', description: 'Data type used to interpret the observation value in OBX-5.' },
    3: { name: 'Observation identifier', description: 'Code identifying the observation.' },
    5: { name: 'Observation value', description: 'Result value; its data type depends on OBX-2.' },
    6: { name: 'Units', description: 'Units associated with a numeric or measurable result.' },
    7: { name: 'Reference range', description: 'Reference range used to interpret the result.' },
    8: { name: 'Abnormal flags', description: 'Flags that qualify the result relative to its reference range.' },
    11: { name: 'Result status', description: 'Status of this observation result.' }
  },
  MSA: {
    1: { name: 'Acknowledgment code', description: 'Indicates whether the message was accepted or rejected.' },
    2: { name: 'Message control ID', description: 'Control ID of the message being acknowledged.' },
    3: { name: 'Text message', description: 'Optional text explaining the acknowledgment.' }
  }
};

export function getFieldDefinition(segment: string, field: number): FieldDefinition {
  return fieldDefinitions[segment]?.[field] ?? {
    name: `Field ${field}`,
    description: `Field ${field} of the ${segment} segment. This field is not described in the built-in guide.`
  };
}
