import {compile, NetworkProvider, sleep} from "@ton/blueprint";
import {Address, address, Dictionary, Slice, toNano} from "@ton/core";
import {OracleProxy} from "../wrappers/OracleProxy";

export async function run(provider:NetworkProvider){
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

    let whiteContractAddressListStr = process.env.WHITE_CONTRACT_ADDRESS;
    if(whiteContractAddressListStr== undefined || whiteContractAddressListStr=== ""){
        console.log("Not set WHITE_CONTRACT_ADDRESS data in env");
        return;
    }

    let whiteContractAddressList =  whiteContractAddressListStr.split("|");
    for(var i = 0; i < whiteContractAddressList.length; i++){
        let whiteAddressStr = whiteContractAddressList[i];
        let whiteAddress = Address.parse(whiteAddressStr);
        let flag = await oracleProxy.getContractWalletAddress(whiteAddress);
        if(flag === BigInt(-1)){
            console.log(`white contract address: ${whiteAddress} has set!`);
            continue;
        }

        await oracleProxy.sendUpsertWhiteContractAddress(provider.sender(), { whiteContractAddress:whiteAddress , amount:toNano("0.01")});

        console.log(`wait commit ton contract address: ${whiteAddress}`);
        await sleep(4 * 1000);
    }

    console.log(`add white contract address finish`);
}