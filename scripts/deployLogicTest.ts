import {Address, beginCell, Dictionary, Slice, toNano,storeStateInit, TupleItemInt} from '@ton/core';
import {compile, NetworkProvider} from '@ton/blueprint';
import {OracleProxy} from "../wrappers/OracleProxy";
import {LogicTest} from "../wrappers/LogicTest";

export async function run(provider:NetworkProvider){
    let whiteWalletAddressDic = Dictionary.empty<bigint, Slice>();

    let codeCell = await compile('LogicTest');
    const logicTest = provider.open(LogicTest.createFromConfig(
        {
            id:0,
            counter:0,
            inputData: beginCell().endCell()
        },
        codeCell
    ));

    await logicTest.sendDeploy(provider.sender(), toNano(0.05));
    await provider.waitForDeploy(logicTest.address);
}