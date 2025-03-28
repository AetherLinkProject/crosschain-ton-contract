"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OracleProxy = exports.Opcodes = void 0;
exports.oracleProxyConfigToCell = oracleProxyConfigToCell;
const core_1 = require("@ton/core");
function oracleProxyConfigToCell(config) {
    return (0, core_1.beginCell)().storeAddress(config.owner).storeDict(config.whiteWalletAddress).storeDict(config.whiteContractAddress).endCell();
    // return beginCell().storeAddress(config.owner).endCell();
}
exports.Opcodes = {
    AddTonWhiteContractAddress: 1,
    AddTonWhiteWalletAddress: 2,
    ProxyAelfToTon: 3,
    ProxyTonToAelf: 4,
};
class OracleProxy {
    constructor(address, init) {
        this.address = address;
        this.init = init;
        this.contractInit = init;
    }
    static createFromAddress(address) {
        return new OracleProxy(address);
    }
    static createFromConfig(config, code, workchain = 0) {
        const data = oracleProxyConfigToCell(config);
        const init = { code, data };
        return new OracleProxy((0, core_1.contractAddress)(workchain, init), init);
    }
    async sendDeploy(provider, via, value) {
        await provider.internal(via, {
            value,
            sendMode: core_1.SendMode.PAY_GAS_SEPARATELY,
            body: (0, core_1.beginCell)().endCell(),
        });
    }
    async sendAddWhiteWalletAddress(provider, via, opts) {
        await provider.internal(via, {
            value: opts.amount,
            sendMode: core_1.SendMode.PAY_GAS_SEPARATELY,
            body: (0, core_1.beginCell)()
                .storeUint(exports.Opcodes.AddTonWhiteWalletAddress, 32)
                .storeAddress(opts.whiteWalletAddress)
                .endCell(),
        });
    }
    async sendAddWhiteContractAddress(provider, via, opts) {
        await provider.internal(via, {
            value: opts.amount,
            sendMode: core_1.SendMode.PAY_GAS_SEPARATELY,
            body: (0, core_1.beginCell)()
                .storeUint(exports.Opcodes.AddTonWhiteContractAddress, 32)
                .storeAddress(opts.whiteContractAddress)
                .endCell(),
        });
    }
    async sendToTonContract(provider, via, opts) {
        await provider.internal(via, {
            value: opts.amount,
            sendMode: core_1.SendMode.PAY_GAS_SEPARATELY,
            body: (0, core_1.beginCell)()
                .storeUint(exports.Opcodes.ProxyAelfToTon, 32)
                .storeAddress(opts.contractAddress)
                .storeRef(opts.data)
                .endCell(),
        });
    }
    async getWhiteWalletAddress(provider, whiteWalletAddress) {
        let result = await provider.get('check_wallet_address_has_permission', [{ type: 'cell', cell: (0, core_1.beginCell)().storeAddress(whiteWalletAddress).endCell() }]);
        return result.stack.readBigNumber();
    }
    async getContractWalletAddress(provider, whiteContractAddress) {
        let addressCell = (0, core_1.beginCell)().storeAddress(whiteContractAddress).endCell();
        console.log("whiteContractAddress--->", addressCell);
        let result = await provider.get('check_contract_address_has_permission', [{ type: 'cell', cell: addressCell }]);
        return result.stack.readBigNumber();
    }
}
exports.OracleProxy = OracleProxy;
