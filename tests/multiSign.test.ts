import { Blockchain, BlockchainSnapshot, SandboxContract, TreasuryContract } from '@ton/sandbox';
import { Address, Cell, toNano } from '@ton/core';
import '@ton/test-utils';
import { compile } from '@ton/blueprint';
import { MultiSign } from "../wrappers/MultiSign";
import { OracleProxy } from "../wrappers/OracleProxy";
import { Op } from "../wrappers/constants";
import { KeyPair, mnemonicNew } from '@ton/crypto';
import { WalletContractV4 } from "@ton/ton";
import { mnemonicToWalletKey } from "@ton/crypto/dist/mnemonic/mnemonic";

describe('MultiSign', () => {
    let code: Cell;
    let orderCode: Cell;
    let blockchain: Blockchain;
    let deployer: SandboxContract<TreasuryContract>;
    let proposer: SandboxContract<TreasuryContract>;
    let keyPairList: KeyPair[] = [];
    let keyPairWalletList: WalletContractV4[] = [];
    let multiSign: SandboxContract<MultiSign>;
    let signers: Address[];
    let initialState: BlockchainSnapshot;
    let curTime: () => number;

    beforeAll(async () => {
        blockchain = await Blockchain.create();
        code = await compile('MultiSign');
        orderCode = await compile('MultiSignOrder');
        deployer = await blockchain.treasury('deployer');
        proposer = await blockchain.treasury('proposer');
        for (var i = 0; i < 4; i++) {
            let mnemonic = await mnemonicNew(24);
            let keyPair = await mnemonicToWalletKey(mnemonic);
            keyPairList.push(keyPair);
            keyPairWalletList.push(WalletContractV4.create({ workchain: 0, publicKey: keyPair.publicKey }))
        }
        signers = [deployer, ...await blockchain.createWallets(4)].map(s => s.address);
        let config = {
            threshold: 1,
            signers,
            proposers: [proposer.address],
            orderCode
        };

        multiSign = blockchain.openContract(MultiSign.createFromConfig(config, code));
        const deployResult = await multiSign.sendDeploy(deployer.getSender(), toNano('0.05'));

        expect(deployResult.transactions).toHaveTransaction({
            from: deployer.address,
            to: multiSign.address,
            deploy: true,
            success: true,
        });
        initialState = blockchain.snapshot();

        curTime = () => blockchain.now ?? Math.floor(Date.now() / 1000);
    });

    afterEach(async () => await blockchain.loadFrom(initialState));

    it('should deploy', async () => {
        // the check is done inside beforeEach
        // blockchain and ebridgeContractsTon are ready to use
    });
    it('new order', async () => {
        let orderAddress = await multiSign.getOrderAddress(0n);
        let res = await multiSign.sendNewOrder(deployer.getSender(),
            OracleProxy.packUpsertWhiteOracleAddressBody(
                deployer.getSender().address,
                BigInt(4),
                keyPairList[0].publicKey,
            ),
            curTime() + 1000);

        expect(res.transactions).toHaveTransaction({
            from: deployer.address,
            to: multiSign.address,
            success: true
        });
        // expect(res.transactions).toHaveTransaction({
        //     from: multiSign.address,
        //     to: orderAddress,
        //     deploy: true,
        //     success: true
        // });
        // expect(res.transactions).not.toHaveTransaction({
        //     from: orderAddress,
        //     to: multiSign.address,
        //     op: Op.multisig.execute
        // });
    });
});