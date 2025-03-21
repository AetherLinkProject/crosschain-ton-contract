import { Blockchain, SandboxContract, TreasuryContract } from '@ton/sandbox';
import { Address, beginCell, Cell, Dictionary, Slice, toNano, TupleBuilder } from '@ton/core';
import { KeyPair, mnemonicNew, sign } from '@ton/crypto';
import { WalletContractV4 } from "@ton/ton";
import { OracleProxy } from '../wrappers/OracleProxy';
import { LogicTest, Opcodes } from '../wrappers/LogicTest';
import '@ton/test-utils';
import { compile } from '@ton/blueprint';
import { Treasury } from '@ton/sandbox/dist/treasury/Treasury';
import { mnemonicToWalletKey } from "@ton/crypto/dist/mnemonic/mnemonic";
import { timeStamp } from 'console';

describe('oracle', () => {
    let oracleProxyCode: Cell;
    let logicTestCode: Cell;
    let keyPairList: KeyPair[] = [];
    let keyPairWalletList: WalletContractV4[] = [];

    beforeAll(async () => {
        oracleProxyCode = await compile('OracleProxy');
        logicTestCode = await compile("LogicTest");
        for (var i = 0; i < 4; i++) {
            let mnemonic = await mnemonicNew(24);
            let keyPair = await mnemonicToWalletKey(mnemonic);
            keyPairList.push(keyPair);
            keyPairWalletList.push(WalletContractV4.create({ workchain: 0, publicKey: keyPair.publicKey }))
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
                    oracleNodeCount: BigInt(7),
                    epochId: BigInt(0),
                    forwardFee: BigInt(10000000),
                    receiveFee: BigInt(10000000),
                    proxyFee: BigInt(10000000),
                    owner: deployer.getSender().address,
                    tempUpgrade: beginCell()
                        .storeUint(0, 64)
                        .storeUint(0, 64)
                        .storeAddress(null)
                        .storeRef(beginCell().endCell())
                        .endCell(),
                    whiteWalletAddress: Dictionary.empty<bigint, Slice>(),
                    whiteContractAddress: Dictionary.empty<bigint, Slice>(),
                    publicKeyDic: Dictionary.empty<bigint, Slice>(Dictionary.Keys.BigInt(32)),
                    usedMessages: Dictionary.empty<bigint, Slice>(),
                    messageRecordDicBucket: Dictionary.empty(Dictionary.Keys.BigInt(16), Dictionary.Values.Cell())
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
                    inputData: beginCell().endCell()
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

    describe('admin', () => {
        it("only owner can set white contract address", async () => {
            var newAddress = randomAddress();
            const addContractAddressResult = await oracleProxy.sendUpsertWhiteContractAddress(otherWallet.getSender(), {
                whiteContractAddress: newAddress,
                amount: toNano("0.05")
            });

            expect(addContractAddressResult.transactions).toHaveTransaction({
                from: otherWallet.getSender().address,
                to: oracleProxy.address,
                exitCode: 100,
                success: false,
                aborted: true,
            })
        });

        it("add contract white address", async () => {
            for (var i = 0; i < 10; i++) {
                var newAddress = randomAddress();
                await addWhiteContractAddress(oracleProxy, deployer.getSender(), newAddress);

                // add contract address success
                const checkContractAddressResult = await oracleProxy.getContractWalletAddress(newAddress);
                expect(checkContractAddressResult).toEqual(BigInt(-1))
            }
            // not exist
            const notExistContractAddress = await oracleProxy.getContractWalletAddress(randomAddress());
            expect(notExistContractAddress).toEqual(BigInt(0));
        });

        it("add wallet white address", async () => {
            var newAddress = randomAddress();
            await addWhiteWalletAddress(oracleProxy, deployer.getSender(), keyPairList);

            // add white wallet address success
            const checkContractAddressResult = await oracleProxy.getWhiteWalletAddress(keyPairWalletList[0].address);
            expect(checkContractAddressResult).toEqual(BigInt(-1));

            //  white wallet address not exist
            const notExistContractAddress = await oracleProxy.getWhiteWalletAddress(randomAddress());
            expect(notExistContractAddress).toEqual(BigInt(0))

            // delete oracle node
            await oracleProxy.sendUpsertWhiteOracleAddress(deployer.getSender(), {
                whiteOracleAddress: deployer.getSender().address,
                ifDelete: true,
                publicIndex: BigInt(keyPairList.length),
                publicKey: keyPairList[0].publicKey,
                amount: toNano("0.01")
            })
            const notExistOracleNode = await oracleProxy.getWhiteWalletAddress(deployer.getSender().address);
            expect(notExistOracleNode).toEqual(BigInt(0))
        });

        it("withdraw", async () => {
            let beforeAmount = await oracleProxy.getBalance(deployer.getSender());
            let fees = toNano("0.01");
            let withdrawAmount = toNano("0.03");
            await oracleProxy.sendWithdraw(deployer.getSender(), {
                amount: withdrawAmount,
                recvAddress: deployer.getSender().address,
                fee: fees
            });
            let afterAmount = await oracleProxy.getBalance(deployer.getSender());

            expect(withdrawAmount).toBeLessThan(beforeAmount + fees - afterAmount);
        });

        it("update oracle node", async () => {
            let oracleCountNum = BigInt(10);
            let result = await oracleProxy.sendUpdateOracleNode(deployer.getSender(), {
                oracleNodeCount: oracleCountNum,
                fee: toNano("0.01")
            });
            expect(result.transactions).toHaveTransaction({
                success: true,
                aborted: false,
            });

            let oracleCount = await oracleProxy.getOracleNode();
            expect(oracleCount).toEqual(oracleCountNum);
        });

        it("set fee", async () => {
            let transactionFee = BigInt(20000000);
            let result = await oracleProxy.sendSetFee(deployer.getSender(), {
                transactionFee: transactionFee,
                forwardFee: toNano("0.03"),
                receiveFee: toNano("0.01"),
                proxyFee: toNano("0.01")
            });
            expect(result.transactions).toHaveTransaction({
                success: true,
                aborted: false,
            });

            let newFee = await oracleProxy.getFee();
            var expectResult = new TupleBuilder();
            expectResult.writeNumber(toNano("0.03"));

            expect(newFee).toEqual(expectResult.build()[0]);
        });
    })

    describe('update contract', () => {
        it("sendCode", async () => {
            var sendCodeResult = await oracleProxy.sendSetCode(deployer.getSender(), {
                fee: toNano("0.2"),
                code: logicTestCode
            });

            expect(sendCodeResult.transactions).toHaveTransaction({
                success: true,
                aborted: false,
            })
        });

        it("transfer owner", async () => {
            var sendTransferOwnerResult = await oracleProxy.sendTransferOwner(deployer.getSender(), {
                fee: toNano("0.2"),
                owner: randomAddress()
            });

            expect(sendTransferOwnerResult.transactions).toHaveTransaction({
                success: true,
                aborted: false,
            })
        });

        it("cancel update code", async () => {
            var sendCodeResult = await oracleProxy.sendSetCode(deployer.getSender(), {
                fee: toNano("0.2"),
                code: logicTestCode
            });

            expect(sendCodeResult.transactions).toHaveTransaction({
                success: true,
                aborted: false,
            })

            var cancelResult = await oracleProxy.sendCancelSetCode(deployer.getSender(), {
                fee: toNano("0.2"),
            });

            expect(cancelResult.transactions).toHaveTransaction({
                success: true,
                aborted: false,
            })
        });

        it("cancel transfer owner", async () => {
            var sendTransferOwnerResult = await oracleProxy.sendTransferOwner(deployer.getSender(), {
                fee: toNano("0.2"),
                owner: randomAddress()
            });

            expect(sendTransferOwnerResult.transactions).toHaveTransaction({
                success: true,
                aborted: false,
            })

            var cancelResult = await oracleProxy.sendCancelTransferOwner(deployer.getSender(), {
                fee: toNano("0.2"),
            });

            expect(cancelResult.transactions).toHaveTransaction({
                success: true,
                aborted: false,
            })
        });

        it("cancel update code with over time", async () => {
            var sendCodeResult = await oracleProxy.sendSetCode(deployer.getSender(), {
                fee: toNano("0.2"),
                code: logicTestCode
            });

            expect(sendCodeResult.transactions).toHaveTransaction({
                success: true,
                aborted: false,
            })

            jest.useFakeTimers();
            jest.advanceTimersByTime(60000);

            var cancelResult = await oracleProxy.sendCancelSetCode(deployer.getSender(), {
                fee: toNano("0.2"),
            });

            expect(cancelResult.transactions).toHaveTransaction({
                success: true,
                aborted: false,
            })

            jest.useRealTimers();
        });

        it("update with finalized", async () => {
            var ownerAddressRaw = await oracleProxy.getOwner();
            console.log(`current address ${ownerAddressRaw}`)

            const newOwnerAddr = randomAddress();
            console.log(`new owner address ${newOwnerAddr}`)

            var sendTransferOwnerResult = await oracleProxy.sendTransferOwner(deployer.getSender(), {
                fee: toNano("0.2"),
                owner: newOwnerAddr
            });

            expect(sendTransferOwnerResult.transactions).toHaveTransaction({
                success: true,
                aborted: false,
            })

            jest.useFakeTimers();
            jest.advanceTimersByTime(60000);

            var finalizedResult = await oracleProxy.sendFinalized(deployer.getSender(), {
                fee: toNano("0.2"),
            });

            expect(finalizedResult.transactions).toHaveTransaction({
                success: true,
                aborted: false,
            })

            var ownerAddressFinalized = await oracleProxy.getOwner();
            expect(newOwnerAddr.equals(ownerAddressFinalized)).toBe(true);

            jest.useRealTimers();
        });

        it("No release time", async () => {
            var ownerAddressBeforeFinalized = await oracleProxy.getOwner();
            console.log(`ownerAddress before finalized ${ownerAddressBeforeFinalized}`)
            const newOwnerAddr = randomAddress();
            console.log(`new owner address ${newOwnerAddr}`)

            var sendTransferOwnerResult = await oracleProxy.sendTransferOwner(deployer.getSender(), {
                fee: toNano("0.2"),
                owner: newOwnerAddr
            });

            expect(sendTransferOwnerResult.transactions).toHaveTransaction({
                success: true,
                aborted: false,
            })

            var finalizedResult = await oracleProxy.sendFinalized(deployer.getSender(), {
                fee: toNano("0.2"),
            });

            expect(finalizedResult.transactions).toHaveTransaction({
                success: true,
                aborted: false,
            })

            var ownerAddressFinalized = await oracleProxy.getOwner();
            console.log(`current address ${ownerAddressFinalized}`)
            expect(newOwnerAddr.equals(ownerAddressFinalized)).toBe(false);
            expect(ownerAddressBeforeFinalized.equals(ownerAddressFinalized)).toBe(true);
        });
    })

    describe('request', () => {
        it("proxy aelf message to ton success", async () => {
            await addWhiteWalletAddress(oracleProxy, deployer.getSender(), keyPairList);
            await addWhiteContractAddress(oracleProxy, deployer.getSender(), logicTest.address);

            let sendData = beginCell()
                .storeUint(Opcodes.increase, 32)
                .storeUint(0, 64)
                .storeUint(6, 32)
                .endCell()

            let messageId = BigInt(10);
            const requestStartTime = BigInt(Math.floor(Date.now() / 1000))
            let unsign_data = assemble_unsign_data(messageId, requestStartTime, oracleProxy.address, logicTest.address, sendData);
            let hash = unsign_data.hash();

            let signDic = Dictionary.empty<bigint, Cell>(Dictionary.Keys.BigInt(256), Dictionary.Values.Cell());
            for (var i = 0; i < keyPairList.length; i++) {
                let signData = sign(hash, keyPairList[i].secretKey);
                let data = beginCell().storeBuffer(signData, signData.length).endCell();
                signDic.set(BigInt(i), data);
            }

            const result = await oracleProxy.sendToTonContract(deployer.getSender(), {
                messageId,
                oracleAddress: oracleProxy.address,
                receiver: logicTest.address,
                timestamp: requestStartTime,
                data: sendData,
                multiSign: signDic,
                amount: toNano('0.05')
            });

            expect(result.transactions).toHaveTransaction({
                success: true,
                aborted: false,
            })

            let counterResult = await logicTest.getCounter();
            expect(counterResult).toEqual(11);
        });

        it("proxy aelf message over time", async () => {
            await addWhiteWalletAddress(oracleProxy, deployer.getSender(), keyPairList);
            await addWhiteContractAddress(oracleProxy, deployer.getSender(), logicTest.address);

            let sendData = beginCell()
                .storeUint(Opcodes.increase, 32)
                .storeUint(0, 64)
                .storeUint(6, 32)
                .endCell()

            let messageId = BigInt(10);
            const overtimeTimestamp = BigInt(0);
            let unsign_data = assemble_unsign_data(messageId, overtimeTimestamp, oracleProxy.address, logicTest.address, sendData);
            let hash = unsign_data.hash();

            let signDic = Dictionary.empty<bigint, Cell>(Dictionary.Keys.BigInt(256), Dictionary.Values.Cell());
            for (var i = 0; i < keyPairList.length; i++) {
                let signData = sign(hash, keyPairList[i].secretKey);
                let data = beginCell().storeBuffer(signData, signData.length).endCell();
                signDic.set(BigInt(i), data);
            }

            var result = await oracleProxy.sendToTonContract(deployer.getSender(), {
                receiver: logicTest.address,
                oracleAddress: oracleProxy.address,
                timestamp: overtimeTimestamp,
                data: sendData,
                messageId,
                multiSign: signDic,
                amount: toNano('0.05')
            });

            expect(result.transactions).toHaveTransaction({
                exitCode: 111,
                success: false,
                aborted: true,
            })
        });

        it("proxy aelf message with error oracle address", async () => {
            await addWhiteWalletAddress(oracleProxy, deployer.getSender(), keyPairList);
            await addWhiteContractAddress(oracleProxy, deployer.getSender(), logicTest.address);

            let sendData = beginCell()
                .storeUint(Opcodes.increase, 32)
                .storeUint(0, 64)
                .storeUint(6, 32)
                .endCell()

            let messageId = BigInt(10);
            const overtimeTimestamp = BigInt(Math.floor(Date.now() / 1000));
            let unsign_data = assemble_unsign_data(messageId, overtimeTimestamp, oracleProxy.address, logicTest.address, sendData);
            let hash = unsign_data.hash();

            let signDic = Dictionary.empty<bigint, Cell>(Dictionary.Keys.BigInt(256), Dictionary.Values.Cell());
            for (var i = 0; i < keyPairList.length; i++) {
                let signData = sign(hash, keyPairList[i].secretKey);
                let data = beginCell().storeBuffer(signData, signData.length).endCell();
                signDic.set(BigInt(i), data);
            }

            var result = await oracleProxy.sendToTonContract(deployer.getSender(), {
                receiver: logicTest.address,
                oracleAddress: randomAddress(),
                timestamp: overtimeTimestamp,
                data: sendData,
                messageId,
                multiSign: signDic,
                amount: toNano('0.05')
            });

            expect(result.transactions).toHaveTransaction({
                exitCode: 105,
                success: false,
                aborted: true,
            })
        });

        it("proxy ton message", async () => {
            await addWhiteContractAddress(oracleProxy, deployer.getSender(), logicTest.address);
            await addWhiteContractAddress(oracleProxy, deployer.getSender(), oracleProxy.address);

            var receiver = beginCell().storeAddress(oracleProxy.address).endCell();
            var report = beginCell().storeBuffer(Buffer.from("0x010101", "hex")).endCell();
            var extraData = beginCell()
                .storeInt(12, 64)
                .storeRef(beginCell().storeBuffer(Buffer.from("0x010101", "hex")))
                .storeRef(beginCell().storeBuffer(Buffer.from("0x010112121", "hex")))
                .endCell();

            var result = await logicTest.sendCrossChainMessage(deployer.getSender(), {
                proxyAddr: oracleProxy.address,
                chainId: 12,
                receiver: receiver,
                fee: toNano("0.2"),
                report: report,
                extraData: extraData
            });
        });
    })

    describe('notify resend', () => {
        it("resend", async () => {
            await addWhiteContractAddress(oracleProxy, deployer.getSender(), logicTest.address);
            var result = await logicTest.sendResendMessage(deployer.getSender(), {
                proxyAddr: oracleProxy.address,
                messageId: BigInt(12),
                delayTime: 12,
                fee: toNano("0.2"),
            });
            
            expect(result.transactions).toHaveTransaction({
                success: true,
                aborted: false,
            })
        });

        it("resend with delay time over a day", async () => {
            await addWhiteContractAddress(oracleProxy, deployer.getSender(), logicTest.address);
            var result = await logicTest.sendResendMessage(deployer.getSender(), {
                proxyAddr: oracleProxy.address,
                messageId: BigInt(12),
                delayTime: 60 * 60 * 25,
                fee: toNano("0.2"),
            });

            expect(result.transactions).toHaveTransaction({
                exitCode: 105,
                success: false,
                aborted: true,
            })
        });

        it("resend with not exist message", async () => {
            await addWhiteContractAddress(oracleProxy, deployer.getSender(), logicTest.address);
            var result = await logicTest.sendResendMessage(deployer.getSender(), {
                proxyAddr: oracleProxy.address,
                messageId: BigInt(9999999999),
                delayTime: 12,
                fee: toNano("0.2"),
            });

            expect(result.transactions).toHaveTransaction({
                exitCode: 110,
                success: false,
                aborted: true,
            })
        });
    })
});

const randomAddress = (wc: number = 0) => {
    const buf = Buffer.alloc(32);
    for (let i = 0; i < buf.length; i++) {
        buf[i] = Math.floor(Math.random() * 256);
    }
    return new Address(wc, buf);
};

async function addWhiteContractAddress(oracleProxy: SandboxContract<OracleProxy>, sender: Treasury, address: Address) {
    const addContractAddressResult = await oracleProxy.sendUpsertWhiteContractAddress(sender, {
        whiteContractAddress: address,
        amount: toNano("0.05")
    });

    expect(addContractAddressResult.transactions).toHaveTransaction({
        from: sender.address,
        to: oracleProxy.address,
        success: true,
        aborted: false,
    })
}

async function addWhiteWalletAddress(oracleProxy: SandboxContract<OracleProxy>, sender: Treasury, keyPairs: KeyPair[]) {
    const addOwnerResult = await oracleProxy.sendUpsertWhiteOracleAddress(sender, {
        whiteOracleAddress: sender.address,
        ifDelete: false,
        publicIndex: BigInt(keyPairs.length),
        publicKey: keyPairs[0].publicKey,
        amount: toNano("0.01")
    });
    expect(addOwnerResult.transactions).toHaveTransaction({
        from: sender.address,
        to: oracleProxy.address,
        success: true,
        aborted: false,
    })

    for (var i = 0; i < keyPairs.length; i++) {
        let keyPair = keyPairs[i];
        let wallet = WalletContractV4.create({ workchain: 0, publicKey: keyPair.publicKey });
        const addWalletAddressResult = await oracleProxy.sendUpsertWhiteOracleAddress(sender, {
            whiteOracleAddress: wallet.address,
            ifDelete: false,
            publicIndex: BigInt(i),
            publicKey: keyPair.publicKey,
            amount: toNano("0.01")
        });
        expect(addWalletAddressResult.transactions).toHaveTransaction({
            from: sender.address,
            to: oracleProxy.address,
            success: true,
            aborted: false,
        })
    }
}

function assemble_unsign_data(messageId: bigint, timestamp: bigint, oracleAddr: Address, contractAddr: Address, data: Cell) {
    return beginCell()
        .storeInt(messageId, 128)
        .storeUint(timestamp, 64)
        .storeAddress(oracleAddr)
        .storeAddress(contractAddr)
        .storeRef(data)
        .endCell();
}

function delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}