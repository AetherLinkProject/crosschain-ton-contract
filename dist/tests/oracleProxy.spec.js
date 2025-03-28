"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sandbox_1 = require("@ton/sandbox");
const core_1 = require("@ton/core");
const OracleProxy_1 = require("../wrappers/OracleProxy");
const LogicTest_1 = require("../wrappers/LogicTest");
require("@ton/test-utils");
const blueprint_1 = require("@ton/blueprint");
describe('oracleProxy', () => {
    let oracleProxyCode;
    let logicTestCode;
    beforeAll(async () => {
        oracleProxyCode = await (0, blueprint_1.compile)('OracleProxy');
        logicTestCode = await (0, blueprint_1.compile)("LogicTest");
    });
    let blockchain;
    let deployer;
    let otherWallet;
    let oracleProxy;
    let logicTest;
    beforeEach(async () => {
        // publish proxy contract
        blockchain = await sandbox_1.Blockchain.create();
        deployer = await blockchain.treasury('deployer');
        oracleProxy = blockchain.openContract(OracleProxy_1.OracleProxy.createFromConfig({
            owner: deployer.getSender().address,
            whiteWalletAddress: core_1.Dictionary.empty(),
            whiteContractAddress: core_1.Dictionary.empty(),
        }, oracleProxyCode));
        const proxyDeployResult = await oracleProxy.sendDeploy(deployer.getSender(), (0, core_1.toNano)('0.05'));
        expect(proxyDeployResult.transactions).toHaveTransaction({
            from: deployer.address,
            to: oracleProxy.address,
            deploy: true,
            success: true,
        });
        // publish logic test contract
        otherWallet = await blockchain.treasury('other');
        logicTest = blockchain.openContract(LogicTest_1.LogicTest.createFromConfig({
            id: 10,
            counter: 11,
        }, logicTestCode));
        let logicDeployResult = await logicTest.sendDeploy(deployer.getSender(), (0, core_1.toNano)('0.05'));
        expect(logicDeployResult.transactions).toHaveTransaction({
            from: deployer.address,
            to: logicTest.address,
            deploy: true,
            success: true,
        });
    });
    it('should deploy', async () => {
        // the check is done inside beforeEach
        // blockchain and main are ready to use
    });
    it("only owner can send message", async () => {
        var newAddress = randomAddress();
        const addContractAddressResult = await oracleProxy.sendAddWhiteContractAddress(otherWallet.getSender(), { whiteContractAddress: newAddress, amount: (0, core_1.toNano)("0.05") });
        expect(addContractAddressResult.transactions).toHaveTransaction({
            from: otherWallet.getSender().address,
            to: oracleProxy.address,
            exitCode: 100,
            success: false,
            aborted: true,
        });
    });
    it("add contract white address", async () => {
        var newAddress = randomAddress();
        await addWhiteContractAddress(oracleProxy, deployer.getSender(), newAddress);
        // add contract address success
        const checkContractAddressResult = await oracleProxy.getContractWalletAddress(newAddress);
        expect(checkContractAddressResult === (0, core_1.toNano)("-1"));
        // not exist
        const notExistContractAddress = await oracleProxy.getContractWalletAddress(randomAddress());
        expect(notExistContractAddress === (0, core_1.toNano)("0"));
    });
    it("add wallet white address", async () => {
        var newAddress = randomAddress();
        await addWhiteWalletAddress(oracleProxy, deployer.getSender(), newAddress);
        // add white wallet address success
        const checkContractAddressResult = await oracleProxy.getWhiteWalletAddress(newAddress);
        expect(checkContractAddressResult === (0, core_1.toNano)("-1"));
        //  white wallet address not exist
        const notExistContractAddress = await oracleProxy.getWhiteWalletAddress(randomAddress());
        expect(notExistContractAddress === (0, core_1.toNano)("0"));
    });
    it("proxy aelf message to ton", async () => {
        // add white wallet address
        await addWhiteWalletAddress(oracleProxy, deployer.getSender(), deployer.address);
        // add white contract address
        await addWhiteContractAddress(oracleProxy, deployer.getSender(), logicTest.address);
        let sendData = (0, core_1.beginCell)()
            .storeUint(LogicTest_1.Opcodes.increase, 32)
            .storeUint(0, 64)
            .storeUint(6, 32)
            .endCell();
        var result = await oracleProxy.sendToTonContract(deployer.getSender(), {messageId: BigInt(10) ,contractAddress: logicTest.address, data: sendData, amount: (0, core_1.toNano)('0.05') });
        // expect(result.transactions).toHaveBeenCalled();
        let counterResult = await logicTest.getCounter();
        expect(counterResult == 100);
    });
});
const randomAddress = (wc = 0) => {
    const buf = Buffer.alloc(32);
    for (let i = 0; i < buf.length; i++) {
        buf[i] = Math.floor(Math.random() * 256);
    }
    return new core_1.Address(wc, buf);
};
async function addWhiteContractAddress(oracleProxy, sender, address) {
    const addContractAddressResult = await oracleProxy.sendAddWhiteContractAddress(sender, { whiteContractAddress: address, amount: (0, core_1.toNano)("0.05") });
    expect(addContractAddressResult.transactions).toHaveTransaction({
        from: sender.address,
        to: oracleProxy.address,
        success: true,
        aborted: false,
    });
}
async function addWhiteWalletAddress(oracleProxy, sender, address) {
    const addWalletAddressResult = await oracleProxy.sendAddWhiteWalletAddress(sender, { whiteWalletAddress: address, amount: (0, core_1.toNano)("0.05") });
    expect(addWalletAddressResult.transactions).toHaveTransaction({
        from: sender.address,
        to: oracleProxy.address,
        success: true,
        aborted: false,
    });
}
