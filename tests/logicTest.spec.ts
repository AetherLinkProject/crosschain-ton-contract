import { Blockchain, SandboxContract, TreasuryContract } from '@ton/sandbox';
import {beginCell, Cell, toNano} from '@ton/core';
import { LogicTest } from '../wrappers/LogicTest';
import '@ton/test-utils';
import { compile } from '@ton/blueprint';

describe('LogicTest', () => {
    let code: Cell;

    beforeAll(async () => {
        code = await compile('LogicTest');
    });

    let blockchain: Blockchain;
    let deployer: SandboxContract<TreasuryContract>;
    let logicTest: SandboxContract<LogicTest>;

    beforeEach(async () => {
        blockchain = await Blockchain.create();

        logicTest = blockchain.openContract(
            LogicTest.createFromConfig(
                {
                    id: 10,
                    counter: 11,
                    inputData: beginCell().endCell()
                },
                code
            )
        );

        deployer = await blockchain.treasury('deployer');

        const deployResult = await logicTest.sendDeploy(deployer.getSender(), toNano('0.05'));

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
                value: toNano('0.05'),
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
