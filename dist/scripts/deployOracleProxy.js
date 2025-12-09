"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.setNetwork = setNetwork;
exports.deployOracleProxy = deployOracleProxy;
const core_1 = require("@ton/core");
const blueprint_1 = require("@ton/blueprint");
const ton_1 = require("@ton/ton");
const crypto_1 = require("@ton/crypto");
const OracleProxy_1 = require("../wrappers/OracleProxy");
const qs_1 = __importDefault(require("qs"));
const qrcode_terminal_1 = __importDefault(require("qrcode-terminal"));
let currentNetworkIsTest = true;
const testnetUrl = "https://test.tonhub.com";
const mainnetUrl = "";
function setNetwork(isTest) {
    currentNetworkIsTest = isTest;
}
function getNetworkUrl() {
    return currentNetworkIsTest ? testnetUrl : mainnetUrl;
}
async function deployOracleProxy(owner, whiteWalletAddressList) {
    let whiteWalletAddressDic = core_1.Dictionary.empty();
    for (var i = 0; i < whiteWalletAddressList.length; i++) {
        let walletAddress = core_1.Address.parse(whiteWalletAddressList[i]);
        let addressHashStr = (0, core_1.beginCell)().storeAddress(walletAddress).endCell().hash().toString("hex");
        console.log(`address hash str--->${addressHashStr}`);
        let address = BigInt("0x" + addressHashStr);
        whiteWalletAddressDic.set(address, (0, core_1.beginCell)().storeStringTail("1").endCell().beginParse());
    }
    let code = await (0, blueprint_1.compile)('OracleProxy');
    const oracleProxy = OracleProxy_1.OracleProxy.createFromConfig({
        owner: owner,
        whiteWalletAddress: whiteWalletAddressDic,
        whiteContractAddress: core_1.Dictionary.empty(),
    }, code);
    let stateInitCell = (0, core_1.beginCell)()
        .store((0, core_1.storeStateInit)({
        code: oracleProxy.contractInit.code,
        data: oracleProxy.contractInit.data,
    }))
        .endCell();
    console.log(`the contract address is following:${oracleProxy.address.toString()}`);
    console.log("Please scan the QR code below to deploy the contract:");
    let link = getNetworkUrl() + "/transfer/" +
        owner.toString({
            testOnly: currentNetworkIsTest
        })
        + "?" +
        qs_1.default.stringify({
            text: "deploy content",
            amount: (0, core_1.toNano)("0.05"),
            init: stateInitCell.toBoc({ idx: false }).toString("base64")
        });
    qrcode_terminal_1.default.generate(link, { small: true }, (code) => {
        console.log(code);
    });
    //
    // await oracleProxy.sendDeploy(provider.sender(), toNano(0.05));
    // await provider.waitForDeploy(oracleProxy.address);
}
(async function () {
    let keyPair = await (0, crypto_1.mnemonicToWalletKey)("music purchase unaware divert wild tuna hen economy hair usage keen predict embark puppy engage hip sort thumb clarify snack shoot gloom talk mean".split(" "));
    let wallet = ton_1.WalletContractV4.create({ workchain: 0, publicKey: keyPair.publicKey });
    let whiteWalletAddress = [];
    whiteWalletAddress.push(wallet.address.toString());
    await deployOracleProxy(wallet.address, whiteWalletAddress);
})();
