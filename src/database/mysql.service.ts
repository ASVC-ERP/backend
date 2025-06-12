import { Injectable, OnModuleInit } from '@nestjs/common';
import * as mysql from 'mysql2';

@Injectable()
export class MySQLService implements OnModuleInit {
  private connection: mysql.Connection;

  onModuleInit() {
    this.connection = mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '',
      database: 'db_ims',
    });

    this.connection.connect((err) => {
      if (err) {
        console.error('Database connection failed:', err);
      } else {
        console.log('Connected to MySQL');
      }
    });
  }

  getConnection(): mysql.Connection {
    return this.connection;
  }
}
