import {Address, beginCell, Dictionary, Slice, toNano,storeStateInit, TupleItemInt} from '@ton/core';
import {compile, NetworkProvider} from '@ton/blueprint';
import {OracleProxy} from "../wrappers/OracleProxy";

export async function run(provider:NetworkProvider){
    let whiteWalletAddressDic = Dictionary.empty<bigint, Slice>();

    let codeCell = await compile('OracleProxy');
    const oracleProxy =provider.open(OracleProxy.createFromConfig({
            oracleNodeCount:BigInt(7),
            epochId:BigInt(0),
            fee: BigInt(1000000),
            owner: provider.sender().address!,
            whiteWalletAddress: whiteWalletAddressDic,
            whiteContractAddress: Dictionary.empty<bigint, Slice>(),
            publicKeyDic:Dictionary.empty<bigint, Slice>(Dictionary.Keys.BigInt(32)),
        },
        codeCell
    ));

    await oracleProxy.sendDeploy(provider.sender(), toNano(0.05));
    await provider.waitForDeploy(oracleProxy.address);
}