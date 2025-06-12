"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MySQLService = void 0;
const common_1 = require("@nestjs/common");
const mysql = require("mysql2");
let MySQLService = class MySQLService {
    connection;
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
            }
            else {
                console.log('Connected to MySQL');
            }
        });
    }
    getConnection() {
        return this.connection;
    }
};
exports.MySQLService = MySQLService;
exports.MySQLService = MySQLService = __decorate([
    (0, common_1.Injectable)()
], MySQLService);
//# sourceMappingURL=mysql.service.js.map