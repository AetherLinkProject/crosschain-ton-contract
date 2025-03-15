import {
    Address,
    beginCell, BitString, Builder,
    Cell,
    Contract,
    contractAddress,
    ContractProvider, Dictionary,
    Sender,
    SendMode, Slice,
} from '@ton/core';
import { } from "qrcode-terminal";

export type OracleProxyConfig = {
    oracleNodeCount: bigint;
    epochId: bigint;
    forwardFee: bigint;
    receiveFee: bigint;
    proxyFee: bigint;
    owner: Address;
    tempUpgrade: Cell;

    whiteWalletAddress: Dictionary<any, any>;
    whiteContractAddress: Dictionary<any, any>;
    publicKeyDic: Dictionary<any, any>;
    usedMessages: Dictionary<any, any>;
    messageRecordDicBucket: Dictionary<any, any>;
};

export function oracleProxyConfigToCell(config: OracleProxyConfig): Cell {
    let commonInfo = beginCell()
        .storeInt(config.oracleNodeCount, 32)
        .storeInt(config.epochId, 64)
        .storeInt(config.forwardFee, 32)
        .storeInt(config.receiveFee, 32)
        .storeInt(config.proxyFee, 32)
        .storeAddress(config.owner)
        .storeRef(config.tempUpgrade)
        .endCell();
    return beginCell()
        .storeRef(commonInfo)
        .storeDict(config.whiteWalletAddress)
        .storeDict(config.whiteContractAddress)
        .storeDict(config.publicKeyDic)
        .storeDict(config.usedMessages)
        .storeDict(config.messageRecordDicBucket)
        .endCell();
}

export const OracleProxyOpcodes = {
    AddTonWhiteContractAddress: 1,
    AddTonWhiteWalletAddress: 2,
    ProxyAelfToTon: 3,
    ProxyTonToAelf: 4,
    Withdraw: 5,
    UpdateOracleNodeCount: 6,
    SetFee: 7,
    SetCode: 8,
    ResendTx: 9,
};

export type ContractInit = {
    code: Cell;
    data: Cell
}

export class OracleProxy implements Contract {
    public contractInit?: ContractInit;

    constructor(readonly address: Address, readonly init?: { code: Cell; data: Cell }) {
        this.contractInit = init;
    }

    static createFromAddress(address: Address) {
        return new OracleProxy(address);
    }

    static createFromConfig(config: OracleProxyConfig, code: Cell, workchain = 0) {
        const data = oracleProxyConfigToCell(config);
        const init = { code, data };
        return new OracleProxy(contractAddress(workchain, init), init);
    }

    static packUpsertWhiteOracleAddressBody(
        whiteOracleAddress: Address,
        publicIndex: bigint,
        publicKey: Buffer
    ): Cell {
        const root = beginCell()
            .storeUint(OracleProxyOpcodes.AddTonWhiteWalletAddress, 32)
            .storeInt(1, 8)
            .storeAddress(whiteOracleAddress)
            .storeInt(publicIndex, 256)
            .storeBits(new BitString(publicKey, 0, 256))
        return root.endCell();
    }

    async sendDeploy(provider: ContractProvider, via: Sender, value: bigint) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell().endCell(),
        });
    }

    async sendUpsertWhiteOracleAddress(
        provider: ContractProvider,
        via: Sender,
        opts: {
            whiteOracleAddress: Address;
            ifDelete: boolean;
            publicIndex: bigint;
            publicKey: Buffer;
            amount: bigint;
        }
    ) {
        await provider.internal(via, {
            value: opts.amount,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell()
                .storeUint(OracleProxyOpcodes.AddTonWhiteWalletAddress, 32)
                .storeInt(opts.ifDelete ? 2 : 1, 8)
                .storeAddress(opts.whiteOracleAddress)
                .storeInt(opts.publicIndex, 256)
                .storeBits(new BitString(opts.publicKey, 0, 256))
                .endCell(),
        });
    }

    async sendUpsertWhiteContractAddress(
        provider: ContractProvider,
        via: Sender,
        opts: {
            whiteContractAddress: Address;
            amount: bigint;
        }
    ) {
        await provider.internal(via, {
            value: opts.amount,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell()
                .storeUint(OracleProxyOpcodes.AddTonWhiteContractAddress, 32)
                .storeAddress(opts.whiteContractAddress)
                .endCell(),
        });
    }

    async sendCrossChainMessage(provider: ContractProvider,
        via: Sender,
        opts: {
            proxyAddr: Address,
            chainId: number;
            receiver: Slice;
            report: Slice;
            extraData: Cell,
            fee: bigint,
        }) {
        await provider.internal(via, {
            value: opts.fee,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell()
                .storeUint(OracleProxyOpcodes.ProxyTonToAelf, 32)
                .storeAddress(opts.proxyAddr)
                .storeUint(opts.chainId, 32)
                .storeRef(opts.receiver.asCell())
                .storeRef(opts.report.asCell())
                .storeRef(opts.extraData)
                .endCell(),
        })

    }
    async sendToTonContract(
        provider: ContractProvider,
        via: Sender,
        opts: {
            messageId: bigint,
            contractAddress: Address;
            data: Cell;
            multiSign: Dictionary<bigint, Cell>,
            amount: bigint;
        }
    ) {
        let body = beginCell()
            .storeUint(OracleProxyOpcodes.ProxyAelfToTon, 32)
            .storeInt(opts.messageId, 128)
            .storeAddress(opts.contractAddress)
            .storeRef(opts.data)
            .storeRef(new Builder().storeDict<bigint, Cell>(opts.multiSign).endCell())
            .endCell();
        await provider.internal(via, {
            value: opts.amount,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: body,
        });
    }

    async sendWithdraw(
        provider: ContractProvider,
        via: Sender,
        opts: {
            recvAddress: Address;
            amount: bigint;
            fee: bigint;
        }) {
        await provider.internal(via, {
            value: opts.fee,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell()
                .storeUint(OracleProxyOpcodes.Withdraw, 32)
                .storeInt(opts.amount, 256)
                .storeAddress(opts.recvAddress)
                .endCell(),
        });
    }

    async sendUpdateOracleNode(
        provider: ContractProvider,
        via: Sender,
        opts: {
            oracleNodeCount: bigint;
            fee: bigint;
        }) {
        await provider.internal(via, {
            value: opts.fee,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell()
                .storeUint(OracleProxyOpcodes.UpdateOracleNodeCount, 32)
                .storeInt(opts.oracleNodeCount, 32)
                .endCell(),
        });
    }

    async sendSetFee(
        provider: ContractProvider,
        via: Sender,
        opts: {
            transactionFee: bigint;
            forwardFee: bigint;
            receiveFee: bigint;
            proxyFee: bigint;
        }) {
        await provider.internal(via, {
            value: opts.transactionFee,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell()
                .storeUint(OracleProxyOpcodes.SetFee, 32)
                .storeUint(opts.forwardFee, 32)
                .storeUint(opts.receiveFee, 32)
                .storeUint(opts.proxyFee, 32)
                .endCell(),
        });
    }

    async sendSetCode(
        provider: ContractProvider,
        via: Sender,
        opts: {
            fee: bigint;
            code: Cell;
        }) {
        await provider.internal(via, {
            value: opts.fee,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell()
                .storeUint(OracleProxyOpcodes.SetCode, 32)
                .storeRef(opts.code)
                .endCell(),
        })
    }

    // only for set code Test
    async sendResendMessage(provider: ContractProvider,
        via: Sender,
        opts: {
            proxyAddr: Address,
            messageId: bigint;
            delayTime: number;
            fee: bigint,
        }) {
        await provider.internal(via, {
            value: opts.fee,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell()
                .storeUint(OracleProxyOpcodes.ResendTx, 32)
                .storeAddress(opts.proxyAddr)
                .storeInt(opts.messageId, 128)
                .storeInt(opts.delayTime, 32)
                .endCell()
        });
    }
    async getBalance(provider: ContractProvider, via: Sender) {
        let result = await provider.get("get_resume_balance", []);
        return result.stack.readBigNumber();
    }

    async getWhiteWalletAddress(provider: ContractProvider, whiteWalletAddress: Address) {
        let result = await provider.get('check_oracle_address_has_permission', [{ type: 'cell', cell: beginCell().storeAddress(whiteWalletAddress).endCell() }]);
        return result.stack.readBigNumber();
    }

    async getContractWalletAddress(provider: ContractProvider, whiteContractAddress: Address) {
        let addressCell = beginCell().storeAddress(whiteContractAddress).endCell();
        let result = await provider.get('check_contract_address_has_permission', [{ type: 'cell', cell: addressCell }]);
        return result.stack.readBigNumber();
    }

    async getOracleNode(provider: ContractProvider) {
        let result = await provider.get('get_oracle_node_count', []);
        return result.stack.readBigNumber();
    }

    async getFee(provider: ContractProvider) {
        let result = await provider.get('get_current_fee', []);
        return result.stack.pop();
    }
}
