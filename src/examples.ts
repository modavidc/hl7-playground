export interface Example {
  name: string;
  type: string;
  description: string;
  message: string;
}

export const examples: Example[] = [
  {
    name: 'ADT^A01', type: 'Admission', description: 'Inpatient admission · 6 segments',
    message: 'MSH|^~\\&|REGISTRATION|NORTH|EHR|MAIN|20250314103000||ADT^A01|MSG00001|P|2.5\r\nEVN|A01|20250314103000\r\nPID|1||MRN78421^^^NORTH^MR||Rivera^Alexandra^M||19890623|F|||42 Pine Street^^Portland^OR^97205||5035550142\r\nPV1|1|I|4W^412^A||||2086^Patel^Nina|||MED||||1|||2086^Patel^Nina|IP|VIS55092\r\nAL1|1|DA|8715^Penicillin||Rash\r\nDG1|1||J18.9^Pneumonia, unspecified organism'
  },
  {
    name: 'ORU^R01', type: 'Lab result', description: 'Chemistry panel · 5 segments',
    message: 'MSH|^~\\&|LAB|CENTRAL|EHR|MAIN|20250314114500||ORU^R01|MSG00002|P|2.5\r\nPID|1||MRN33210^^^CENTRAL^MR||Chen^Jordan||19751108|M\r\nOBR|1|ORD90341|LAB11802|24323-8^Comprehensive metabolic panel^LN|||20250314110000\r\nOBX|1|NM|2345-7^Glucose^LN||98|mg/dL|70-100|N|||F|||20250314113000\r\nOBX|2|NM|2160-0^Creatinine^LN||0.9|mg/dL|0.6-1.2|N|||F'
  },
  {
    name: 'ACK', type: 'Acknowledgment', description: 'Application accept · 2 segments',
    message: 'MSH|^~\\&|EHR|MAIN|REGISTRATION|NORTH|20250314103100||ACK^A01|ACK00001|P|2.5\r\nMSA|AA|MSG00001|Message accepted'
  }
];
