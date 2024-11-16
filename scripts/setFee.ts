import {compile, NetworkProvider} from "@ton/blueprint";
import {OracleProxy} from "../wrappers/OracleProxy";
import {Dictionary, Slice, toNano} from "@ton/core";
import {OracleNode, ForwardFee, ReceiveFee, ProxyFee} from "../common/const"

export async function run(provider: NetworkProvider) {
    let codeCell = await compile('OracleProxy');
    const oracleProxy = provider.open(OracleProxy.createFromConfig({
            oracleNodeCount: BigInt(OracleNode),
            epochId: BigInt(0),
            forwardFee: BigInt(ForwardFee),
            receiveFee: BigInt(ReceiveFee),
            proxyFee: BigInt(ProxyFee),
            owner: provider.sender().address!,
            whiteWalletAddress: Dictionary.empty<bigint, Slice>(),
            whiteContractAddress: Dictionary.empty<bigint, Slice>(),
            publicKeyDic: Dictionary.empty<bigint, Slice>(Dictionary.Keys.BigInt(32)),
        },
        codeCell
    ));

    let forwardFee = process.env.FORWARD_FEE;
    let receiveFee = process.env.RECEIVE_Fee;
    let proxyFee = process.env.PROXY_FEE;
    if (forwardFee == undefined || forwardFee == ""
        || receiveFee == undefined || receiveFee == ""
        || proxyFee == undefined || proxyFee == "") {
        console.log("Not set TRANSACTION_FEE data in env");
        return;
    }

    await oracleProxy.sendSetFee(provider.sender(), {
        transactionFee: BigInt("0.01"),
        forwardFee: toNano(forwardFee),
        receiveFee: toNano(receiveFee),
        proxyFee: toNano(proxyFee)
    });
    console.log("send UpdateOracleNode transaction success !!");
}