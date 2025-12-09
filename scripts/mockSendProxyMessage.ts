import {Address, beginCell, Dictionary, Slice, toNano, storeStateInit, TupleItemInt, Cell} from '@ton/core';
import {compile, NetworkProvider} from '@ton/blueprint';
import {OracleProxy} from "../wrappers/OracleProxy";
import {LogicTest} from "../wrappers/LogicTest";
import {OracleNode, ForwardFee, ReceiveFee, ProxyFee} from "../common/const"

export async function run(provider: NetworkProvider) {
    let logicTestCodeCell = await compile('LogicTest');
    const logicTest = provider.open(LogicTest.createFromConfig(
        {
            id: 0,
            counter: 0,
            inputData: beginCell().endCell()
        },
        logicTestCodeCell
    ));

    let whiteWalletAddressDic = Dictionary.empty<bigint, Slice>();
    let codeCell = await compile('OracleProxy');
    const oracleProxy = provider.open(OracleProxy.createFromConfig({
            oracleNodeCount: BigInt(OracleNode),
            epochId: BigInt(0),
            forwardFee: BigInt(ForwardFee),
            receiveFee: BigInt(ReceiveFee),
            proxyFee: BigInt(ProxyFee),
            owner: provider.sender().address!,
            whiteWalletAddress: whiteWalletAddressDic,
            whiteContractAddress: Dictionary.empty<bigint, Slice>(),
            publicKeyDic: Dictionary.empty<bigint, Slice>(Dictionary.Keys.BigInt(32)),
        },

        codeCell
    ));

    var receiver = beginCell().storeAddress(oracleProxy.address).endCell();
    var buffer = Buffer.from("0x010101", "hex");
    console.log("buffer->", buffer.toString("hex"));
    var report = beginCell().storeBuffer(buffer).endCell();
    var extraData = beginCell()
        .storeInt(12, 64)
        .storeRef(beginCell().storeBuffer(Buffer.from("0x010101", "hex")))
        .storeRef(beginCell().storeBuffer(Buffer.from("0x010112121", "hex")))
        .endCell();

    await logicTest.sendCrossChainMessage(provider.sender(), {
        proxyAddr: oracleProxy.address,
        chainId: 12,
        receiver: receiver,
        fee: toNano("0.015"),
        report: report,
        extraData: extraData
    })
}