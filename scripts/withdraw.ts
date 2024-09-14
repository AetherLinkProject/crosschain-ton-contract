import {Address, beginCell, Dictionary, Slice, toNano,storeStateInit, TupleItemInt} from '@ton/core';
import {compile, NetworkProvider} from '@ton/blueprint';
import {OracleProxy} from "../wrappers/OracleProxy";

export async function run(provider:NetworkProvider){
    let codeCell = await compile('OracleProxy');
    const oracleProxy =provider.open(OracleProxy.createFromConfig({
            oracleNodeCount:BigInt(7),
            owner: provider.sender().address!,
            whiteWalletAddress: Dictionary.empty<bigint, Slice>(),
            whiteContractAddress: Dictionary.empty<bigint, Slice>(),
            publicKeyDic:Dictionary.empty<bigint, Slice>(Dictionary.Keys.BigInt(32)),
        },
        codeCell
    ));

    let beforeAmount = await oracleProxy.getBalance(provider.sender());
    console.log(`current contract amount is:${beforeAmount}`);

    let withdrawAmountStr = process.env.WITHDRAW_TON_AMOUNT;
    if(withdrawAmountStr == undefined || withdrawAmountStr == ""){
        console.log("Not set WITHDRAW_TON_AMOUNT data in env");
        return;
    }

    let withdrawAmount = toNano(beforeAmount);
    if(beforeAmount < withdrawAmount){
        console.log("Contract wallet not enough");
        return;
    }

    await oracleProxy.sendWithdraw(provider.sender(), {recvAddress:provider.sender().address!, fee:toNano("0.01"), amount: withdrawAmount});
    console.log("send withdraw transaction success !!");
}