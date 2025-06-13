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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SheetsController = void 0;
const common_1 = require("@nestjs/common");
const sheets_service_1 = require("./sheets.service");
const SPREADSHEET_ID = '1868A0REbI30r4r_wmBKcD4YI0UhrB2CjS8FJ8jplWAI';
const RANGE = 'Sheet1!A2:D';
let SheetsController = class SheetsController {
    sheetsService;
    constructor(sheetsService) {
        this.sheetsService = sheetsService;
    }
    async getData() {
        return await this.sheetsService.getData(SPREADSHEET_ID, RANGE);
    }
    async addData(body) {
        const row = [[body.name, body.quantity, body.price, new Date().toISOString()]];
        await this.sheetsService.appendData(SPREADSHEET_ID, RANGE, row);
        return { message: 'Row added' };
    }
};
exports.SheetsController = SheetsController;
__decorate([
    (0, common_1.Get)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], SheetsController.prototype, "getData", null);
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], SheetsController.prototype, "addData", null);
exports.SheetsController = SheetsController = __decorate([
    (0, common_1.Controller)('sheets'),
    __metadata("design:paramtypes", [sheets_service_1.SheetsService])
], SheetsController);
//# sourceMappingURL=sheets.controller.js.map