export interface CdduEmployerData {
  name: string;
  siret: string;
  address: string;
  representative: string;
}

export interface CdduEmployeeData {
  firstName: string;
  lastName: string;
  nir: string;
  birthDate: string;
  address: string;
}

export interface CdduContractData {
  contractRef: string;
  createdDate: string;
  employer: CdduEmployerData;
  employee: CdduEmployeeData;
  jobTitle: string;
  missionDescription: string;
  startDate: string;
  endDate: string;
  totalHours: number;
  hourlyRate: number;
  totalGrossSalary: number;
  missionLocation: string;
}
