import {compile, NetworkProvider} from "@ton/blueprint";
import {OracleProxy} from "../wrappers/OracleProxy";
import {Dictionary, Slice, toNano} from "@ton/core";

export async function run(provider:NetworkProvider){
    let codeCell = await compile('OracleProxy');
    const oracleProxy =provider.open(OracleProxy.createFromConfig({
            oracleNodeCount:BigInt(OracleNode),
            epochId:BigInt(0),
            forwardFee: BigInt(ForwardFee),
            receiveFee: BigInt(ReceiveFee),
            proxyFee: BigInt(ProxyFee),
            owner: provider.sender().address!,
            whiteWalletAddress: Dictionary.empty<bigint, Slice>(),
            whiteContractAddress: Dictionary.empty<bigint, Slice>(),
            publicKeyDic:Dictionary.empty<bigint, Slice>(Dictionary.Keys.BigInt(32)),
        },
        codeCell
    ));

    let beforeCount = await oracleProxy.getOracleNode();
    console.log(`current oracle node is:${beforeCount}`);

    let oracleNodeCountStr = process.env.ORACLE_NODE_COUNT;
    if(oracleNodeCountStr == undefined || oracleNodeCountStr == ""){
        console.log("Not set ORACLE_NODE_COUNT data in env");
        return;
    }


    await oracleProxy.sendUpdateOracleNode(provider.sender(), {oracleNodeCount:BigInt(oracleNodeCountStr), fee:toNano("0.01")});
    console.log("send UpdateOracleNode transaction success !!");
}