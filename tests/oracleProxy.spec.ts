import { Blockchain, SandboxContract, TreasuryContract } from '@ton/sandbox';
import {
    Address,
    beginCell, BitString,
    Cell,
    Dictionary, DictionaryValue,
    Slice,
    toNano,
} from '@ton/core';

import {KeyPair,mnemonicNew, sign } from '@ton/crypto';
import { WalletContractV4 } from "@ton/ton";
import {OracleProxy, OracleProxyOpcodes} from '../wrappers/OracleProxy';
import { LogicTest, Opcodes } from '../wrappers/LogicTest';
import '@ton/test-utils';
import { compile } from '@ton/blueprint';
import { Treasury } from '@ton/sandbox/dist/treasury/Treasury';
import {mnemonicToWalletKey} from "@ton/crypto/dist/mnemonic/mnemonic";

describe('oracleProxy', () => {
    let oracleProxyCode: Cell;
    let logicTestCode:Cell;
    let keyPairList: KeyPair[] = [];
    let keyPairWalletList: WalletContractV4[] = [];

    beforeAll(async () => {
        oracleProxyCode = await compile('OracleProxy');
        logicTestCode = await compile("LogicTest");
        for(var i = 0; i< 4; i++){
            let mnemonic = await mnemonicNew(24);
            let keyPair = await mnemonicToWalletKey(mnemonic);
            keyPairList.push(keyPair);
            keyPairWalletList.push(WalletContractV4.create({workchain:0, publicKey:keyPair.publicKey}))
        }
    });

    let blockchain: Blockchain;
    let deployer: SandboxContract<TreasuryContract>;
    let otherWallet: SandboxContract<TreasuryContract>;
    let oracleProxy: SandboxContract<OracleProxy>;
    let logicTest: SandboxContract<LogicTest>;

    beforeEach(async () => {
        // publish proxy contract
        blockchain = await Blockchain.create();
        deployer = await blockchain.treasury('deployer');
        oracleProxy = blockchain.openContract(
            OracleProxy.createFromConfig(
                {
                    oracleNodeCount:BigInt(7),
                    owner: deployer.getSender().address,
                    whiteWalletAddress: Dictionary.empty<bigint, Slice>(),
                    whiteContractAddress:Dictionary.empty<bigint, Slice>(),
                    publicKeyDic:Dictionary.empty<bigint, Slice>(Dictionary.Keys.BigInt(32)),
                },
                oracleProxyCode
            )
        );

        const proxyDeployResult = await oracleProxy.sendDeploy(deployer.getSender(), toNano('0.05'));
        expect(proxyDeployResult.transactions).toHaveTransaction({
            from: deployer.address,
            to: oracleProxy.address,
            deploy: true,
            success: true,
        });

        // publish logic test contract
        otherWallet = await blockchain.treasury('other');
        logicTest = blockchain.openContract(
            LogicTest.createFromConfig(
                {
                    id: 10,
                    counter: 11,
                },
                logicTestCode
            )
        );

       let logicDeployResult = await logicTest.sendDeploy(deployer.getSender(), toNano('0.05'));
        expect(logicDeployResult.transactions).toHaveTransaction({
            from: deployer.address,
            to: logicTest.address,
            deploy: true,
            success: true,
        });
    });

    it("only owner can send message", async ()=>{
        var newAddress = randomAddress();
        const addContractAddressResult = await oracleProxy.sendUpsertWhiteContractAddress(otherWallet.getSender(),{whiteContractAddress: newAddress,amount: toNano("0.05")});
        expect(addContractAddressResult.transactions).toHaveTransaction({
            from:otherWallet.getSender().address,
            to:oracleProxy.address,
            exitCode:100,
            success:false,
            aborted:true,
        })
    });

    it("add contract white address", async ()=>{
        for(var i =0 ;i < 10;i++){
            var newAddress = randomAddress();
            await addWhiteContractAddress(oracleProxy, deployer.getSender(), newAddress);

            // add contract address success
            const checkContractAddressResult = await oracleProxy.getContractWalletAddress(newAddress);
            expect(checkContractAddressResult ).toEqual(BigInt(-1))
        }
        // not exist
        const notExistContractAddress = await oracleProxy.getContractWalletAddress(randomAddress());
        expect(notExistContractAddress).toEqual(BigInt(0));
    });

    it("add wallet white address", async()=> {
        var newAddress = randomAddress();
        await addWhiteWalletAddress(oracleProxy, deployer.getSender(), keyPairList);

        // add white wallet address success
        const checkContractAddressResult = await oracleProxy.getWhiteWalletAddress(keyPairWalletList[0].address);
        expect(checkContractAddressResult).toEqual(BigInt(-1));

        //  white wallet address not exist
        const notExistContractAddress = await oracleProxy.getWhiteWalletAddress(randomAddress());
        expect(notExistContractAddress).toEqual(BigInt(0))

        // delete oracle node
        await oracleProxy.sendUpsertWhiteOracleAddress(deployer.getSender(),{whiteOracleAddress: deployer.getSender().address, ifDelete:true, publicIndex:BigInt(keyPairList.length), publicKey:keyPairList[0].publicKey, amount: toNano("0.01")})
        const notExistOracleNode = await oracleProxy.getWhiteWalletAddress(deployer.getSender().address);
        expect(notExistOracleNode).toEqual(BigInt(0))
    });

    it("proxy aelf message to ton", async()=>{
        // add white wallet address
        await addWhiteWalletAddress(oracleProxy, deployer.getSender(), keyPairList);

        // add white contract address
        await addWhiteContractAddress(oracleProxy, deployer.getSender(), logicTest.address);

        let sendData = beginCell()
            .storeUint(Opcodes.increase, 32)
            .storeUint( 0, 64)
            .storeUint(6, 32)
            .endCell()

        let messageId = BigInt(10);
        let unsign_data = assemble_unsign_data(messageId, logicTest.address, sendData);
        let hash = unsign_data.hash();


        let signDic = Dictionary.empty<bigint, Cell>(Dictionary.Keys.BigInt(256), Dictionary.Values.Cell());
        for(var i = 0; i < keyPairList.length ; i++){
            let signData = sign(hash, keyPairList[i].secretKey);
            let data = beginCell().storeBuffer(signData, signData.length).endCell();
            signDic.set(BigInt(i), data);
        }

        await oracleProxy.sendToTonContract(deployer.getSender(),{contractAddress: logicTest.address, data:sendData, messageId, multiSign:signDic ,amount:toNano('0.05') });

        let counterResult = await logicTest.getCounter();
        expect(counterResult).toEqual(17);
    });

    it("withdraw", async()=> {
        let beforeAmount = await oracleProxy.getBalance(deployer.getSender());
        let fees = toNano("0.01");
        let withdrawAmount = toNano("0.03");
        await oracleProxy.sendWithdraw(deployer.getSender(),{amount:withdrawAmount, recvAddress: deployer.getSender().address, fee: fees });
        let afterAmount = await oracleProxy.getBalance(deployer.getSender());

        expect(withdrawAmount ).toBeLessThan(beforeAmount + fees - afterAmount );
    });

    it("update oracle node", async() =>{
        let oracleCountNum = BigInt( 10);
        let result = await oracleProxy.sendUpdateOracleNode(deployer.getSender(),{oracleNodeCount:oracleCountNum, fee: toNano("0.01")});
        expect(result.transactions).toHaveTransaction({
            success:true,
            aborted:false,
        });

        let oracleCount = await  oracleProxy.getOracleNode();
        expect(oracleCount).toEqual(oracleCountNum);
    });
});

const randomAddress = (wc: number = 0) => {
    const buf = Buffer.alloc(32);
    for (let i = 0; i < buf.length; i++) {
        buf[i] = Math.floor(Math.random() * 256);
    }
    return new Address(wc, buf);
};

async function addWhiteContractAddress(oracleProxy:SandboxContract<OracleProxy>, sender: Treasury, address:Address){
    const addContractAddressResult = await oracleProxy.sendUpsertWhiteContractAddress(sender,{whiteContractAddress: address,amount: toNano("0.05")});

    expect(addContractAddressResult.transactions).toHaveTransaction({
        from:sender.address,
        to:oracleProxy.address,
        success:true,
        aborted:false,
    })
}

async function addWhiteWalletAddress(oracleProxy:SandboxContract<OracleProxy>, sender: Treasury, keyPairs: KeyPair[] ){
    const addWalletAddressResult = await oracleProxy.sendUpsertWhiteOracleAddress(sender,{whiteOracleAddress: sender.address, ifDelete:false, publicIndex:BigInt(keyPairs.length), publicKey:keyPairs[0].publicKey, amount: toNano("0.01")});
    for(var i = 0;i < keyPairs.length; i++){
        let keyPair = keyPairs[i];
        let wallet = WalletContractV4.create({workchain: 0,publicKey:keyPair.publicKey});
        const addWalletAddressResult = await oracleProxy.sendUpsertWhiteOracleAddress(sender,{whiteOracleAddress: wallet.address, ifDelete:false, publicIndex:BigInt( i), publicKey:keyPair.publicKey, amount: toNano("0.01")});
        expect(addWalletAddressResult.transactions).toHaveTransaction({
            from:sender.address,
            to:oracleProxy.address,
            success:true,
            aborted:false,
        })
    }
}

function assemble_unsign_data(messageId:bigint, contractAddress:Address, data:Cell){
    let unSignCell = beginCell()
        .storeInt(messageId, 256)
        .storeAddress(contractAddress)
        .storeRef(data)
        .endCell();

    return unSignCell;
}