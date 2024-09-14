"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.run = run;
const core_1 = require("@ton/core");
const LogicTest_1 = require("../wrappers/LogicTest");
const blueprint_1 = require("@ton/blueprint");
async function run(provider, args) {
    const ui = provider.ui();
    const address = core_1.Address.parse(args.length > 0 ? args[0] : await ui.input('Main address'));
    if (!(await provider.isContractDeployed(address))) {
        ui.write(`Error: Contract at address ${address} is not deployed!`);
        return;
    }
    const main = provider.open(LogicTest_1.LogicTest.createFromAddress(address));
    const counterBefore = await main.getCounter();
    await main.sendIncrease(provider.sender(), {
        increaseBy: 1,
        value: (0, core_1.toNano)('0.05'),
    });
    ui.write('Waiting for counter to increase...');
    let counterAfter = await main.getCounter();
    let attempt = 1;
    while (counterAfter === counterBefore) {
        ui.setActionPrompt(`Attempt ${attempt}`);
        await (0, blueprint_1.sleep)(2000);
        counterAfter = await main.getCounter();
        attempt++;
    }
    ui.clearActionPrompt();
    ui.write('Counter increased successfully!');
}
