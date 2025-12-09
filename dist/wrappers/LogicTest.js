"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LogicTest = exports.Opcodes = void 0;
exports.mainConfigToCell = mainConfigToCell;
const core_1 = require("@ton/core");
function mainConfigToCell(config) {
    return (0, core_1.beginCell)().storeUint(config.id, 32).storeUint(config.counter, 32).endCell();
}
exports.Opcodes = {
    increase: 0x7e8764ef,
};
class LogicTest {
    constructor(address, init) {
        this.address = address;
        this.init = init;
    }
    static createFromAddress(address) {
        return new LogicTest(address);
    }
    static createFromConfig(config, code, workchain = 0) {
        const data = mainConfigToCell(config);
        const init = { code, data };
        return new LogicTest((0, core_1.contractAddress)(workchain, init), init);
    }
    async sendDeploy(provider, via, value) {
        await provider.internal(via, {
            value,
            sendMode: core_1.SendMode.PAY_GAS_SEPARATELY,
            body: (0, core_1.beginCell)().endCell(),
        });
    }
    async sendIncrease(provider, via, opts) {
        await provider.internal(via, {
            value: opts.value,
            sendMode: core_1.SendMode.PAY_GAS_SEPARATELY,
            body: (0, core_1.beginCell)()
                .storeUint(exports.Opcodes.increase, 32)
                .storeUint(opts.queryID ?? 0, 64)
                .storeUint(opts.increaseBy, 32)
                .endCell(),
        });
    }
    async getCounter(provider) {
        const result = await provider.get('get_counter', []);
        return result.stack.readNumber();
    }
    async getID(provider) {
        const result = await provider.get('get_id', []);
        return result.stack.readNumber();
    }
}
exports.LogicTest = LogicTest;
