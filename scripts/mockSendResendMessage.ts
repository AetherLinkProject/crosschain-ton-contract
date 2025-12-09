import {Address, beginCell, Dictionary, Slice, toNano,storeStateInit, TupleItemInt} from '@ton/core';
import {compile, NetworkProvider} from '@ton/blueprint';
import {OracleProxy} from "../wrappers/OracleProxy";
import {LogicTest} from "../wrappers/LogicTest";
import {OracleNode, ForwardFee, ReceiveFee, ProxyFee} from "../common/const"

export async function run(provider:NetworkProvider){
    let logicTestCodeCell = await compile('LogicTest');
    const logicTest = provider.open(LogicTest.createFromConfig(
        {
            id:0,
            counter:0,
            inputData: beginCell().endCell()
        },
        logicTestCodeCell
    ));

    let whiteWalletAddressDic = Dictionary.empty<bigint, Slice>();
    let codeCell = await compile('OracleProxy');
    const oracleProxy = provider.open(OracleProxy.createFromConfig({
            oracleNodeCount:BigInt(OracleNode),
            epochId:BigInt(0),
            forwardFee: BigInt(ForwardFee),
            receiveFee: BigInt(ReceiveFee),
            proxyFee: BigInt(ProxyFee),
            owner: provider.sender().address!,
            whiteWalletAddress: whiteWalletAddressDic,
            whiteContractAddress: Dictionary.empty<bigint, Slice>(),
            publicKeyDic:Dictionary.empty<bigint, Slice>(Dictionary.Keys.BigInt(32)),
        },

        codeCell
    ));

    let result = await logicTest.sendResendMessage(provider.sender(),{proxyAddr:oracleProxy.address, messageId: BigInt(12), delayTime:12,  fee:toNano("0.2"), });
    if(result !== undefined && result != null){
        console.log(`Resend send success`);
    }
}