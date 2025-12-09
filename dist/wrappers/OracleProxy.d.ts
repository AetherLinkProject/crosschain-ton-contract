import { Address, Cell, Contract, ContractProvider, Dictionary, Sender } from '@ton/core';
export type OracleProxyConfig = {
    owner: Address;
    whiteWalletAddress: Dictionary<any, any>;
    whiteContractAddress: Dictionary<any, any>;
};
export declare function oracleProxyConfigToCell(config: OracleProxyConfig): Cell;
export declare const Opcodes: {
    AddTonWhiteContractAddress: number;
    AddTonWhiteWalletAddress: number;
    ProxyAelfToTon: number;
    ProxyTonToAelf: number;
};
export type ContractInit = {
    code: Cell;
    data: Cell;
};
export declare class OracleProxy implements Contract {
    readonly address: Address;
    readonly init?: {
        code: Cell;
        data: Cell;
    } | undefined;
    contractInit?: ContractInit;
    constructor(address: Address, init?: {
        code: Cell;
        data: Cell;
    } | undefined);
    static createFromAddress(address: Address): OracleProxy;
    static createFromConfig(config: OracleProxyConfig, code: Cell, workchain?: number): OracleProxy;
    sendDeploy(provider: ContractProvider, via: Sender, value: bigint): Promise<void>;
    sendAddWhiteWalletAddress(provider: ContractProvider, via: Sender, opts: {
        whiteWalletAddress: Address;
        amount: bigint;
    }): Promise<void>;
    sendAddWhiteContractAddress(provider: ContractProvider, via: Sender, opts: {
        whiteContractAddress: Address;
        amount: bigint;
    }): Promise<void>;
    sendToTonContract(provider: ContractProvider, via: Sender, opts: {
        contractAddress: Address;
        data: Cell;
        amount: bigint;
    }): Promise<void>;
    getWhiteWalletAddress(provider: ContractProvider, whiteWalletAddress: Address): Promise<bigint>;
    getContractWalletAddress(provider: ContractProvider, whiteContractAddress: Address): Promise<bigint>;
}
