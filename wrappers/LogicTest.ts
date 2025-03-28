import {
    Address,
    beginCell,
    Cell,
    Contract,
    contractAddress,
    ContractProvider,
    Sender,
    SendMode,
    Slice
} from '@ton/core';
import {OracleProxyOpcodes} from "./OracleProxy";

export type MainConfig = {
    id: number;
    counter: number;
    inputData: Cell;
};

export function mainConfigToCell(config: MainConfig): Cell {
    return beginCell().storeUint(config.id, 32).storeUint(config.counter, 32).storeRef(config.inputData).endCell();
}

export const Opcodes = {
    increase: 0x7e8764ef,
};

export class LogicTest implements Contract {
    constructor(readonly address: Address, readonly init?: { code: Cell; data: Cell }) {}

    static createFromAddress(address: Address) {
        return new LogicTest(address);
    }

    static createFromConfig(config: MainConfig, code: Cell, workchain = 0) {
        const data = mainConfigToCell(config);
        const init = { code, data };
        return new LogicTest(contractAddress(workchain, init), init);
    }

    async sendDeploy(provider: ContractProvider, via: Sender, value: bigint) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell().endCell(),
        });
    }

    async sendIncrease(
        provider: ContractProvider,
        via: Sender,
        opts: {
            increaseBy: number;
            value: bigint;
            queryID?: number;
        }
    ) {
        await provider.internal(via, {
            value: opts.value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell()
                .storeUint(Opcodes.increase, 32)
                // .storeUint(opts.queryID ?? 0, 64)
                .storeUint(opts.increaseBy, 32)
                .endCell(),
        });
    }

    async sendResendMessage(provider: ContractProvider,
                            via: Sender,
                            opts: {
                                proxyAddr:Address,
                                messageId: bigint;
                                delayTime: number;
                                fee:bigint,
                            }){
        await provider.internal(via, {
            value:opts.fee,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell()
                .storeUint(OracleProxyOpcodes.ResendTx, 32)
                .storeAddress(opts.proxyAddr)
                .storeInt(opts.messageId, 128)
                .storeInt(opts.delayTime, 32)
                .endCell()
        });
    }

    async sendCrossChainMessage(provider: ContractProvider,
        via: Sender,
        opts: {
            proxyAddr:Address,
            chainId: number;
            receiver: Cell;
            report: Cell;
            extraData: Cell;
            fee:bigint,
        }){
        await provider.internal(via,{
            value:opts.fee,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell()
                .storeUint(OracleProxyOpcodes.ProxyTonToAelf, 32)
                .storeAddress(opts.proxyAddr)
                .storeUint(opts.chainId, 64)
                .storeRef(opts.receiver)
                .storeRef(opts.report)
                .storeRef(opts.extraData)
                .endCell(),
        })

    }

    async getCounter(provider: ContractProvider) {
        const result = await provider.get('get_counter', []);
        return result.stack.readNumber();
    }

    async getID(provider: ContractProvider) {
        const result = await provider.get('get_id', []);
        return result.stack.readNumber();
    }
}
