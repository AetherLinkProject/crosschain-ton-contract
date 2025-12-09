import { Address } from '@ton/core';
export declare function setNetwork(isTest: boolean): void;
export declare function deployOracleProxy(owner: Address, whiteWalletAddressList: string[]): Promise<void>;
