import { OnModuleInit } from '@nestjs/common';
import * as mysql from 'mysql2';
export declare class MySQLService implements OnModuleInit {
    private connection;
    onModuleInit(): void;
    getConnection(): mysql.Connection;
}
