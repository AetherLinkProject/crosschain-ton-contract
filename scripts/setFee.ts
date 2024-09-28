import {compile, NetworkProvider} from "@ton/blueprint";
import {OracleProxy} from "../wrappers/OracleProxy";
import {Dictionary, Slice, toNano} from "@ton/core";

export async function run(provider:NetworkProvider){
    let codeCell = await compile('OracleProxy');
    const oracleProxy =provider.open(OracleProxy.createFromConfig({
            oracleNodeCount:BigInt(7),
            epochId:BigInt(0),
            fee: BigInt(1000000),
            owner: provider.sender().address!,
            whiteWalletAddress: Dictionary.empty<bigint, Slice>(),
            whiteContractAddress: Dictionary.empty<bigint, Slice>(),
            publicKeyDic:Dictionary.empty<bigint, Slice>(Dictionary.Keys.BigInt(32)),
        },
        codeCell
    ));

    let beforeFee = await oracleProxy.getFee();
    console.log(`current fee is:${beforeFee}`);

    let feeStr = process.env.TRANSACTION_FEE;
    if(feeStr == undefined || feeStr == ""){
        console.log("Not set TRANSACTION_FEE data in env");
        return;
    }

    await oracleProxy.sendSetFee(provider.sender(), {transactionFee:BigInt(feeStr), fee:toNano("0.01")});
    console.log("send UpdateOracleNode transaction success !!");
}