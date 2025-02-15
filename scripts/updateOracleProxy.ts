import { ContractProvider, Sender, toNano } from "@ton/core";
import { compile, NetworkProvider } from '@ton/blueprint';
import { beginCell, Cell, Address } from "@ton/core";
import { OracleProxy } from "../wrappers/OracleProxy";

export async function run(provider: NetworkProvider) {
    console.log("Compiling new contract code...");
    const newCodeCell: Cell = await compile("OracleProxy"); // Generate new compiled code
    let whiteContractAddressListStr = process.env.DEPLOYED_CONTRACT_ADDRESS;

    const oracleAddress = Address.parse("EQBCOuvczf29HIGNxrJdsmTKIabHQ1j4dW2ojlYkcru3IOYy");
    const oracleProxy = provider.open(
        OracleProxy.createFromAddress(oracleAddress)
    );

    console.log(`Sending SetCode transaction to ${oracleProxy.address.toString()} ...`);
    await oracleProxy.sendSetCode(provider.sender(), {
        fee: toNano(0.05),
        code: newCodeCell,
    });

    console.log("SetCode transaction sent. Awaiting confirmation...");
}