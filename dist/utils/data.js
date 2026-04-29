"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.saveLandlords = exports.getLandlords = exports.saveServiceCharges = exports.getServiceCharges = exports.saveContracts = exports.getContracts = exports.saveCheques = exports.getCheques = exports.saveProperties = exports.getProperties = exports.saveTenants = exports.getTenants = void 0;
exports.ensureDataDir = ensureDataDir;
exports.readJSON = readJSON;
exports.writeJSON = writeJSON;
exports.daysUntil = daysUntil;
exports.addMonths = addMonths;
exports.allData = allData;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const DATA_DIR = path_1.default.resolve(process.cwd(), process.env.DATA_DIR || './data');
function ensureDataDir() {
    if (!fs_1.default.existsSync(DATA_DIR))
        fs_1.default.mkdirSync(DATA_DIR, { recursive: true });
}
function filePath(name) {
    return path_1.default.join(DATA_DIR, name);
}
function readJSON(name) {
    const p = filePath(name);
    if (!fs_1.default.existsSync(p)) {
        fs_1.default.writeFileSync(p, '[]', 'utf-8');
        return [];
    }
    return JSON.parse(fs_1.default.readFileSync(p, 'utf-8'));
}
function writeJSON(name, data) {
    fs_1.default.writeFileSync(filePath(name), JSON.stringify(data, null, 2), 'utf-8');
}
const getTenants = () => readJSON('tenants.json');
exports.getTenants = getTenants;
const saveTenants = (d) => writeJSON('tenants.json', d);
exports.saveTenants = saveTenants;
const getProperties = () => readJSON('properties.json');
exports.getProperties = getProperties;
const saveProperties = (d) => writeJSON('properties.json', d);
exports.saveProperties = saveProperties;
const getCheques = () => readJSON('cheques.json');
exports.getCheques = getCheques;
const saveCheques = (d) => writeJSON('cheques.json', d);
exports.saveCheques = saveCheques;
const getContracts = () => readJSON('contracts.json');
exports.getContracts = getContracts;
const saveContracts = (d) => writeJSON('contracts.json', d);
exports.saveContracts = saveContracts;
const getServiceCharges = () => readJSON('service-charges.json');
exports.getServiceCharges = getServiceCharges;
const saveServiceCharges = (d) => writeJSON('service-charges.json', d);
exports.saveServiceCharges = saveServiceCharges;
const getLandlords = () => readJSON('landlords.json');
exports.getLandlords = getLandlords;
const saveLandlords = (d) => writeJSON('landlords.json', d);
exports.saveLandlords = saveLandlords;
function daysUntil(dateStr) {
    const now = new Date();
    const todayUTC = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
    const [y, m, d] = dateStr.split('-').map(Number);
    const targetUTC = Date.UTC(y, m - 1, d);
    return Math.round((targetUTC - todayUTC) / 86400000);
}
function addMonths(dateStr, months) {
    const d = new Date(dateStr + 'T00:00:00');
    d.setMonth(d.getMonth() + months);
    return d.toISOString().split('T')[0];
}
function allData() {
    return {
        landlords: (0, exports.getLandlords)(),
        tenants: (0, exports.getTenants)(),
        properties: (0, exports.getProperties)(),
        cheques: (0, exports.getCheques)(),
        contracts: (0, exports.getContracts)(),
        serviceCharges: (0, exports.getServiceCharges)(),
    };
}
//# sourceMappingURL=data.js.map