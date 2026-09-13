import { Type } from 'class-transformer';
import { IsNotEmpty, IsNumber, IsObject, IsString, ValidateNested } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CdduEmployerDataDto {
  @ApiProperty({ description: "Nom ou raison sociale de l'employeur", example: 'Koudmain SAS' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ description: "Numéro SIRET de l'employeur", example: '123 456 789 00012' })
  @IsString()
  @IsNotEmpty()
  siret: string;

  @ApiProperty({
    description: "Adresse de l'employeur",
    example: "10 Rue de l'Innovation, 75001 Paris",
  })
  @IsString()
  @IsNotEmpty()
  address: string;

  @ApiProperty({ description: "Représentant légal de l'employeur", example: 'Jean Dupont' })
  @IsString()
  @IsNotEmpty()
  representative: string;
}

export class CdduEmployeeDataDto {
  @ApiProperty({ description: "Prénom de l'employé", example: 'Thomas' })
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @ApiProperty({ description: "Nom de l'employé", example: 'Martin' })
  @IsString()
  @IsNotEmpty()
  lastName: string;

  @ApiProperty({
    description: 'Numéro de sécurité sociale (NIR)',
    example: '1 92 05 75 012 345 67',
  })
  @IsString()
  @IsNotEmpty()
  nir: string;

  @ApiProperty({ description: 'Date de naissance', example: '15/05/1992' })
  @IsString()
  @IsNotEmpty()
  birthDate: string;

  @ApiProperty({
    description: "Adresse de l'employé",
    example: '42 Avenue de la République, 75011 Paris',
  })
  @IsString()
  @IsNotEmpty()
  address: string;
}

export class CdduContractDataDto {
  @ApiProperty({ description: 'Référence unique du contrat CDDU', example: 'CDDU-2026-042' })
  @IsString()
  @IsNotEmpty()
  contractRef: string;

  @ApiProperty({ description: 'Date de création du contrat (DD/MM/YYYY)', example: '28/07/2026' })
  @IsString()
  @IsNotEmpty()
  createdDate: string;

  @ApiProperty({ type: () => CdduEmployerDataDto, description: "Informations de l'employeur" })
  @IsObject()
  @ValidateNested()
  @Type(() => CdduEmployerDataDto)
  employer: CdduEmployerDataDto;

  @ApiProperty({ type: () => CdduEmployeeDataDto, description: "Informations de l'employé" })
  @IsObject()
  @ValidateNested()
  @Type(() => CdduEmployeeDataDto)
  employee: CdduEmployeeDataDto;

  @ApiProperty({ description: 'Intitulé du poste', example: 'Serveur en Restauration' })
  @IsString()
  @IsNotEmpty()
  jobTitle: string;

  @ApiProperty({
    description: 'Description détaillée de la mission',
    example: "Service en salle lors du banquet d'inauguration.",
  })
  @IsString()
  @IsNotEmpty()
  missionDescription: string;

  @ApiProperty({ description: 'Date et heure de début de mission', example: '01/08/2026 à 18:00' })
  @IsString()
  @IsNotEmpty()
  startDate: string;

  @ApiProperty({ description: 'Date et heure de fin de mission', example: '01/08/2026 à 23:30' })
  @IsString()
  @IsNotEmpty()
  endDate: string;

  @ApiProperty({ description: "Nombre total d'heures effectuées", example: 5.5 })
  @IsNumber()
  totalHours: number;

  @ApiProperty({ description: 'Taux horaire brut', example: 15.5 })
  @IsNumber()
  hourlyRate: number;

  @ApiProperty({ description: 'Salaire brut total', example: 85.25 })
  @IsNumber()
  totalGrossSalary: number;

  @ApiProperty({
    description: "Lieu d'exécution de la mission",
    example: 'Grand Hôtel de Paris, 75009 Paris',
  })
  @IsString()
  @IsNotEmpty()
  missionLocation: string;
}

export type CdduContractData = CdduContractDataDto;
