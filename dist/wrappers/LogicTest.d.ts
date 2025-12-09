import { Address, Cell, Contract, ContractProvider, Sender } from '@ton/core';
export type MainConfig = {
    id: number;
    counter: number;
};
export declare function mainConfigToCell(config: MainConfig): Cell;
export declare const Opcodes: {
    increase: number;
};
export declare class LogicTest implements Contract {
    readonly address: Address;
    readonly init?: {
        code: Cell;
        data: Cell;
    } | undefined;
    constructor(address: Address, init?: {
        code: Cell;
        data: Cell;
    } | undefined);
    static createFromAddress(address: Address): LogicTest;
    static createFromConfig(config: MainConfig, code: Cell, workchain?: number): LogicTest;
    sendDeploy(provider: ContractProvider, via: Sender, value: bigint): Promise<void>;
    sendIncrease(provider: ContractProvider, via: Sender, opts: {
        increaseBy: number;
        value: bigint;
        queryID?: number;
    }): Promise<void>;
    getCounter(provider: ContractProvider): Promise<number>;
    getID(provider: ContractProvider): Promise<number>;
}
