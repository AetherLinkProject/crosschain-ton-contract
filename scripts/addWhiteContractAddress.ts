import { compile, NetworkProvider, sleep } from "@ton/blueprint";
import { Address, address, Dictionary, Slice, toNano } from "@ton/core";
import { OracleProxy } from "../wrappers/OracleProxy";

export async function run(provider: NetworkProvider) {
    const oracleAddress = Address.parse("EQBCOuvczf29HIGNxrJdsmTKIabHQ1j4dW2ojlYkcru3IOYy");
    const oracleProxy = provider.open(
        OracleProxy.createFromAddress(oracleAddress)
    );

    console.log(`provider.sender().address to ${provider.sender().address!.toString()} ...`);
    console.log(`Sending add white contract transaction to ${oracleProxy.address.toString()} ...`);

    let whiteContractAddressListStr = process.env.WHITE_CONTRACT_ADDRESS;
    if (whiteContractAddressListStr == undefined || whiteContractAddressListStr === "") {
        console.log("Not set WHITE_CONTRACT_ADDRESS data in env");
        return;
    }

    let whiteContractAddressList = whiteContractAddressListStr.split("|");
    for (var i = 0; i < whiteContractAddressList.length; i++) {
        let whiteAddressStr = whiteContractAddressList[i];
        let whiteAddress = Address.parse(whiteAddressStr);
        console.log(`Address.parse(whiteAddressStr ${whiteAddress}`);
        let flag = await oracleProxy.getContractWalletAddress(whiteAddress);
        if (flag === BigInt(-1)) {
            console.log(`white contract address: ${whiteAddress} has set!`);
            continue;
        }

        await oracleProxy.sendUpsertWhiteContractAddress(provider.sender(), { whiteContractAddress: whiteAddress, amount: toNano("0.01") });

        console.log(`wait commit ton contract address: ${whiteAddress}`);
        await sleep(4 * 1000);
    }

    console.log(`add white contract address finish`);
}