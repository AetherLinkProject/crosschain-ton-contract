import {compile, NetworkProvider} from "@ton/blueprint";
import {Address, address, Dictionary, Slice, toNano} from "@ton/core";
import {OracleProxy} from "../wrappers/OracleProxy";

export async function run(provider:NetworkProvider){
    let whiteWalletAddressDic = Dictionary.empty<bigint, Slice>();

    let codeCell = await compile('OracleProxy');
    const oracleProxy =provider.open(OracleProxy.createFromConfig({
            oracleNodeCount:BigInt(7),
            owner: provider.sender().address!,
            whiteWalletAddress: whiteWalletAddressDic,
            whiteContractAddress: Dictionary.empty<bigint, Slice>(),
            publicKeyDic:Dictionary.empty<bigint, Slice>(Dictionary.Keys.BigInt(32)),
        },

        codeCell
    ));

    let whiteOracleAddressListStr = process.env.WHITE_WALLET_ADDRESS;
    if(whiteOracleAddressListStr== undefined || whiteOracleAddressListStr=== ""){
        console.log("Not set WHITE_ORACLE_ADDRESS data in env");
        return;
    }

    let whiteOracleAddressList =  whiteOracleAddressListStr.split("|");
    for(var i = 0; i < whiteOracleAddressList.length; i++){
        let oracleInfoStrArray = whiteOracleAddressList[i].split("&");
        if(oracleInfoStrArray.length !== 3){
            console.log("WHITE_ORACLE_ADDRESS data Error");
            return;
        }

        let oracleAddress = Address.parse(oracleInfoStrArray[0]);
        let oracleIndex = BigInt(oracleInfoStrArray[1]);
        let publicKey = Buffer.from(oracleInfoStrArray[2], "hex");
        let flag = await oracleProxy.getWhiteWalletAddress(oracleAddress);
        if(flag === BigInt(-1)){
            console.log(`white wallet address: ${oracleAddress} has set!`);
            continue;
        }

        await oracleProxy.sendUpsertWhiteOracleAddress(provider.sender(), { whiteOracleAddress:oracleAddress, ifDelete:false, publicIndex:oracleIndex, publicKey:publicKey , amount:toNano("0.01")});
        flag = await oracleProxy.getWhiteWalletAddress(oracleAddress);
        if(flag !== BigInt(-1)){
            console.log(`set white wallet address: ${oracleAddress} success!`);
            return;
        }
    }
}