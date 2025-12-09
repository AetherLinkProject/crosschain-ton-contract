"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sandbox_1 = require("@ton/sandbox");
const core_1 = require("@ton/core");
const LogicTest_1 = require("../wrappers/LogicTest");
require("@ton/test-utils");
const blueprint_1 = require("@ton/blueprint");
describe('LogicTest', () => {
    let code;
    beforeAll(async () => {
        code = await (0, blueprint_1.compile)('LogicTest');
    });
    let blockchain;
    let deployer;
    let logicTest;
    beforeEach(async () => {
        blockchain = await sandbox_1.Blockchain.create();
        logicTest = blockchain.openContract(LogicTest_1.LogicTest.createFromConfig({
            id: 10,
            counter: 11,
        }, code));
        deployer = await blockchain.treasury('deployer');
        const deployResult = await logicTest.sendDeploy(deployer.getSender(), (0, core_1.toNano)('0.05'));
        expect(deployResult.transactions).toHaveTransaction({
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
    it('should increase counter', async () => {
        const increaseTimes = 3;
        for (let i = 0; i < increaseTimes; i++) {
            console.log(`increase ${i + 1}/${increaseTimes}`);
            const increaser = await blockchain.treasury('increaser' + i);
            const counterBefore = await logicTest.getCounter();
            console.log('counter before increasing', counterBefore);
            const increaseBy = Math.floor(Math.random() * 100);
            console.log('increasing by', increaseBy);
            const increaseResult = await logicTest.sendIncrease(increaser.getSender(), {
                increaseBy,
                value: (0, core_1.toNano)('0.05'),
            });
            expect(increaseResult.transactions).toHaveTransaction({
                from: increaser.address,
                to: logicTest.address,
                success: true,
            });
            const counterAfter = await logicTest.getCounter();
            console.log('counter after increasing', counterAfter);
            expect(counterAfter).toBe(counterBefore + increaseBy);
        }
    });
});
