"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const sheets_service_1 = require("../sheets/sheets.service");
let AuthService = class AuthService {
    sheetsService;
    spreadsheetId = '1868A0REbI30r4r_wmBKcD4YI0UhrB2CjS8FJ8jplWAI';
    sheetName = 'Users';
    range = `${this.sheetName}!A1:F`;
    constructor(sheetsService) {
        this.sheetsService = sheetsService;
    }
    async validateUser({ username, password }) {
        const data = await this.sheetsService.getData(this.spreadsheetId, this.range);
        for (const row of data) {
            const [id, storedUsername, storedPassword, firstName, lastName, role] = row;
            if (storedUsername?.trim() === username &&
                storedPassword?.trim() === password) {
                return {
                    id,
                    username: storedUsername,
                    firstName,
                    lastName,
                    role
                };
            }
        }
        throw new common_1.UnauthorizedException('Invalid credentials');
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [sheets_service_1.SheetsService])
], AuthService);
//# sourceMappingURL=auth.service.js.map