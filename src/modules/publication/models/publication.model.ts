import { BOOLEAN } from 'sequelize';
import { Column, Model, Table, DataType } from 'sequelize-typescript';

@Table({ tableName: 'publication', timestamps: false })
export class Publication extends Model {
    @Column({ type: DataType.INTEGER, primaryKey: true })
    declare id: number;

    @Column({ type: DataType.INTEGER, unique: true })
    declare company_id: number;

    @Column({ type: DataType.INTEGER, unique: true })
    declare created_by_user_id: number;

    @Column({ type: DataType.INTEGER, unique: true })
    declare address_id: number;

    @Column({ type: DataType.STRING, unique: true })
    declare title: string;

    @Column({ type: DataType.STRING, unique: true })
    declare description: string;

    @Column({ type: DataType.DECIMAL(10, 2) })
    declare hourly_rate: number;

    @Column({ type: DataType.DATE })
    declare starting_date: Date;

    @Column({ type: DataType.DATE })
    declare ending_date: Date;

    @Column({ type: DataType.STRING, unique: true })
    declare status: string;

    @Column({ field: 'created_at', type: DataType.DATE })
    declare createdAt: Date;
}

export class PostPublicationDto {
    company_id: number;
    created_by_user_id: number;
    address_id: number;
    title: string;
    description: string;
    hourly_rate: number;
    starting_date: Date;
    ending_date: Date;
}

export class PostPublicationResponseDto {
    message: string;
    id: number;
    createdAt: Date;
}
