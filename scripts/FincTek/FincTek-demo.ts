import * as fs from 'fs';
import { PDF } from '@libpdf/core';
import {
    Hash,
    CryptoEncoderFactory,
    ProviderFactory,
    Logger,
    Microblock,
    CMTSToken,
    Secp256k1PrivateSignatureKey,
    SectionType,
    Utils,
    VirtualBlockchainType,
    WalletCrypto,
    ApplicationLedgerVb,
    WalletRequestBasedApplicationLedgerMicroblockBuilder,
    AppLedgerMicroblockBuildRequest,
    CryptoHandlerApplicationLedgerActorIdentityAdapter,
} from "@cmts-dev/carmentis-sdk-core";

const NODE_URL = "http://localhost:26657";
const nodeUrl = NODE_URL;
const provider = ProviderFactory.createInMemoryProviderWithExternalProvider(nodeUrl);
const sigEncoder = CryptoEncoderFactory.defaultStringSignatureEncoder();
const encodedSk = 'sig:secp256k1:sk:cd42ad5f7a7823f3ab4da368ea4f807fa8246526ea4ea7eeb4879c42048916a5';

// set up the logger
Logger.enableLogs();

run();

async function run() {
    const sellerSk = await sigEncoder.decodePrivateKey(encodedSk);
    const sellerPk = await sellerSk.getPublicKey();
    const sellerAccountId = await provider.getAccountIdFromPublicKey(sellerPk);

    const sk = Secp256k1PrivateSignatureKey.gen();
    const pk = await sk.getPublicKey();
    const mb = Microblock.createGenesisAccountMicroblock();
    mb.addSections([
        {
            type: SectionType.ACCOUNT_PUBLIC_KEY,
            schemeId: pk.getSignatureSchemeId(),
            publicKey: await pk.getPublicKeyAsBytes()
        },
        {
            type: SectionType.ACCOUNT_CREATION,
            sellerAccount: sellerAccountId.toBytes(),
            amount: CMTSToken.createCMTS(1000).getAmountAsAtomic()
        },
    ])
    mb.setFeesPayerAccount(sellerAccountId.toBytes());
    mb.setTimestamp(Utils.getTimestampInSeconds())
    mb.setGasPrice(CMTSToken.createMilliToken(1));
    await mb.setGasAndSeal(provider, sellerSk);
    await provider.publishMicroblock(mb);
    await provider.awaitMicroblockAnchoring(mb.getHash().toBytes());

    // now create an organization
    const newAccountId = await provider.getAccountIdFromPublicKey(pk);
    const carmentisOrganizationMicroblock = Microblock.createGenesisOrganizationMicroblock();
    carmentisOrganizationMicroblock.addSections([
        {
            type: SectionType.ORG_CREATION,
            accountId: newAccountId.toBytes(),
        },
        {
            type: SectionType.ORG_DESCRIPTION,
            name: 'FincTek Demo',
            website: '',
            countryCode: 'FR',
            city: 'Paris',
        },
    ]);
    carmentisOrganizationMicroblock.setFeesPayerAccount(newAccountId.toBytes());
    carmentisOrganizationMicroblock.setTimestamp(Utils.getTimestampInSeconds());
    carmentisOrganizationMicroblock.setGasPrice(CMTSToken.createMilliToken(1));
    await carmentisOrganizationMicroblock.setGasAndSeal(provider, sk);
    const { microblockData: carmentisOrganizationData, microblockHash: carmentisOrgId } =
        carmentisOrganizationMicroblock.serialize();
    await provider.publishMicroblock(carmentisOrganizationMicroblock);
    await provider.awaitMicroblockAnchoring(carmentisOrganizationMicroblock.getHash().toBytes());

    // publish an update of the description
    const organizationVb = await provider.loadOrganizationVirtualBlockchain(Hash.from(carmentisOrgId));
    const carmentisOrganizationSecondMicroblock = await organizationVb.createMicroblock();
    carmentisOrganizationSecondMicroblock.addSections([
        {
            type: SectionType.ORG_DESCRIPTION,
            name: 'FincTek Demo',
            website: 'https://www.finctek.com',
            countryCode: 'FR',
            city: 'Paris',
        },
        {
            type: SectionType.CUSTOM,
            __x509__: `-----BEGIN CERTIFICATE-----
MIIDQzCCAiugAwIBAgIUajNNq6ugW4bRvfQd5EqUKmmXp1AwDQYJKoZIhvcNAQEL
BQAwGjEYMBYGA1UEAwwPd3d3LmZpbmN0ZWsuY29tMB4XDTI2MTAwMTEzNDYzMloX
DTI3MTAwMTEzNDYzMlowGjEYMBYGA1UEAwwPd3d3LmZpbmN0ZWsuY29tMIIBIjAN
BgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAofsQ/bWSyHgznDXSduZ0PrkVMasZ
+W0Ut4cuDRAOSvKeaSLbZusQdwA0f8rFdAFOgQTGyCxGceAjYqg5SAkglWR8+ix8
TITGsSOhnFBOvII/Fq86ORIFFiR8BUQVD0t/VddSU65ANqSVpCLKVlXKXseLy/LU
dgUE4fw2NqHLsO5DLK5NPhlQ5LwhH4WtubhM0R73LvhgcdB0Vual6lGNdMM0Sc5Z
14M6KcqVT/HIICkKivq7RALpDZHE2XiLlO7sflwS/qO3EhQpy2vMvQyrvatogHsW
bMasgkmhVZlL+IKoik8Bvtscie0tXKtLKErZobY4WcYUUd6ARFuhOPvU5wIDAQAB
o4GAMH4wDAYDVR0TAQH/BAIwADALBgNVHQ8EBAMCBaAwHQYDVR0lBBYwFAYIKwYB
BQUHAwIGCCsGAQUFBwMBMCMGCSsGAQQBg5gqAQQWDBQ5Njk1MDBQVEpKWlRDRTBJ
M0I2MDAdBgNVHQ4EFgQU3KVAzQ5YukRxub0v7konaXutJH0wDQYJKoZIhvcNAQEL
BQADggEBACjXpuB7PJXHeOTUcbmZH3wwHXR0Ewj9ZCAxp3/XJTFmuJuKfBUcYwH8
BcrnrENaoHOtBfA9OoUkyE4esjaNZJkH4IdX+OHlMHc8SuK/WCcXu0N2rzDahnJj
pZ5qWOEVM8SENAdf8fJUt3mUKKKCKehJOPmMtC6CtUcyUJCCBCE56lBoF614KTda
trMhQjbMgyx80Girlq6VCwxqkqt2OSQL7cUAvlzejW1l9ff+AihS8hdvBpLCoUEt
/yoLA8kW/zrgUqUn+MGmAfCBG6byk0s6y0DhNM4Fgba9lGldxV3RfyCf/QgTfC7m
BVgu+T7rIjrdma8yPm+y+c8w6jSMoxs=
-----END CERTIFICATE-----`
        }
    ]);
    carmentisOrganizationSecondMicroblock.setFeesPayerAccount(newAccountId.toBytes());
    carmentisOrganizationSecondMicroblock.setTimestamp(Utils.getTimestampInSeconds());
    carmentisOrganizationSecondMicroblock.setGasPrice(CMTSToken.createMilliToken(1));
    await carmentisOrganizationSecondMicroblock.setGasAndSeal(provider, sk);
    carmentisOrganizationSecondMicroblock.serialize();
    await provider.publishMicroblock(carmentisOrganizationSecondMicroblock);
    await provider.awaitMicroblockAnchoring(carmentisOrganizationSecondMicroblock.getHash().toBytes());

    // get the organization VB with the standard provider
    const vbStatus1 = await provider.getVirtualBlockchainStatus(carmentisOrgId);

    // get the organization VB with the null memory provider,
    // to force the data to be fetched from the network
    const debugProvider = ProviderFactory.createNullInMemoryProviderWithExternalProvider(nodeUrl);
    const vbStatus2 = await debugProvider.getVirtualBlockchainStatus(carmentisOrgId);

    // create an application
    const applicationMicroblock = Microblock.createGenesisApplicationMicroblock();
    applicationMicroblock.addSections([
        {
            type: SectionType.APP_CREATION,
            organizationId: carmentisOrgId,
        },
        {
            type: SectionType.APP_DESCRIPTION,
            name: 'My Application',
            logoUrl: '',
            homepageUrl: 'FR',
            description: 'A test application',
        },
    ]);
    applicationMicroblock.setFeesPayerAccount(newAccountId.toBytes());
    applicationMicroblock.setTimestamp(Utils.getTimestampInSeconds());
    applicationMicroblock.setGasPrice(CMTSToken.createMilliToken(1));
    await applicationMicroblock.setGasAndSeal(provider, sk);
    const { microblockHash: applicationId } = applicationMicroblock.serialize();
    await provider.publishMicroblock(applicationMicroblock);
    await provider.awaitMicroblockAnchoring(applicationMicroblock.getHash().toBytes());

    // create an application ledger
    const author = "Arnauld";
    const applicationLedger = ApplicationLedgerVb.createApplicationLedgerVirtualBlockchain(provider);
    const expirationDay = Utils.addDaysToTimestamp(
        Utils.getTimestampInSeconds(),
        10
    );
    const tempMb = Microblock.createGenesisMicroblock(
        VirtualBlockchainType.APP_LEDGER_VIRTUAL_BLOCKCHAIN,
        expirationDay
    );
    // TODO: The genesis seed should be created and hold by the VB, not the genesis microblock.
    // TODO: This would avoid having to resort to this hack (which is not even correct because
    // TODO: it works on the full 'previousHash' field instead of just the seed).
    const vbSeed = tempMb.getPreviousHash();

    const userWalletCrypto = WalletCrypto.generateWallet();
    const userAccountCrypto = userWalletCrypto.getDefaultAccountCrypto();
    const userActorCrypto = userAccountCrypto.deriveActorFromVbSeed(vbSeed.toBytes());
    const userIdentity = new CryptoHandlerApplicationLedgerActorIdentityAdapter(userActorCrypto);

    const operatorWalletCrypto = WalletCrypto.generateWallet();
    const operatorAccountCrypto = operatorWalletCrypto.getDefaultAccountCrypto();
    const operatorActorCrypto = operatorAccountCrypto.deriveActorFromVbSeed(vbSeed.toBytes());
    const operatorIdentity = new CryptoHandlerApplicationLedgerActorIdentityAdapter(operatorActorCrypto);

    const mbBuilder = await WalletRequestBasedApplicationLedgerMicroblockBuilder.createFromVirtualBlockchain(
        Hash.from(applicationId),
        applicationLedger
    );
    const request: AppLedgerMicroblockBuildRequest = {
        author: 'appOperator',
        endorser: 'user',
        data: {
            client: "Carmentis SAS",
            address: "19 RUE MARCELINE DESBORDES-VALMORE 75116 Paris",
            accountId: "260900001",
            date: new Date().toJSON(),
            psca: "FIncTek UE SAS",
            amfApprovalNumber: "A2025-05",
            __x509__: `-----BEGIN CERTIFICATE-----
MIIDQzCCAiugAwIBAgIUajNNq6ugW4bRvfQd5EqUKmmXp1AwDQYJKoZIhvcNAQEL
BQAwGjEYMBYGA1UEAwwPd3d3LmZpbmN0ZWsuY29tMB4XDTI2MTAwMTEzNDYzMloX
DTI3MTAwMTEzNDYzMlowGjEYMBYGA1UEAwwPd3d3LmZpbmN0ZWsuY29tMIIBIjAN
BgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAofsQ/bWSyHgznDXSduZ0PrkVMasZ
+W0Ut4cuDRAOSvKeaSLbZusQdwA0f8rFdAFOgQTGyCxGceAjYqg5SAkglWR8+ix8
TITGsSOhnFBOvII/Fq86ORIFFiR8BUQVD0t/VddSU65ANqSVpCLKVlXKXseLy/LU
dgUE4fw2NqHLsO5DLK5NPhlQ5LwhH4WtubhM0R73LvhgcdB0Vual6lGNdMM0Sc5Z
14M6KcqVT/HIICkKivq7RALpDZHE2XiLlO7sflwS/qO3EhQpy2vMvQyrvatogHsW
bMasgkmhVZlL+IKoik8Bvtscie0tXKtLKErZobY4WcYUUd6ARFuhOPvU5wIDAQAB
o4GAMH4wDAYDVR0TAQH/BAIwADALBgNVHQ8EBAMCBaAwHQYDVR0lBBYwFAYIKwYB
BQUHAwIGCCsGAQUFBwMBMCMGCSsGAQQBg5gqAQQWDBQ5Njk1MDBQVEpKWlRDRTBJ
M0I2MDAdBgNVHQ4EFgQU3KVAzQ5YukRxub0v7konaXutJH0wDQYJKoZIhvcNAQEL
BQADggEBACjXpuB7PJXHeOTUcbmZH3wwHXR0Ewj9ZCAxp3/XJTFmuJuKfBUcYwH8
BcrnrENaoHOtBfA9OoUkyE4esjaNZJkH4IdX+OHlMHc8SuK/WCcXu0N2rzDahnJj
pZ5qWOEVM8SENAdf8fJUt3mUKKKCKehJOPmMtC6CtUcyUJCCBCE56lBoF614KTda
trMhQjbMgyx80Girlq6VCwxqkqt2OSQL7cUAvlzejW1l9ff+AihS8hdvBpLCoUEt
/yoLA8kW/zrgUqUn+MGmAfCBG6byk0s6y0DhNM4Fgba9lGldxV3RfyCf/QgTfC7m
BVgu+T7rIjrdma8yPm+y+c8w6jSMoxs=
-----END CERTIFICATE-----`
        },
        channels: [
            {
                name: 'mainChannel',
                public: false,
            }
        ],
        channelAssignations: [
            {
                channelName: 'mainChannel',
                fieldPath: 'this.*'
            }
        ],
        actors: [
            {name: "appOperator"},
            {name: "user"},
        ],
        actorAssignations: [
            {
                channelName: 'mainChannel',
                actorName: 'appOperator',
            },
            {
                channelName: 'mainChannel',
                actorName: 'user'
            },
        ],
        approvalMessage: 'please approve this data set',
    };
    const privateEncryptionKey = await userIdentity.getActorPrivateDecryptionKey();
    const publicEncryptionKey = await privateEncryptionKey.getPublicKey();
    await mbBuilder.subscribeActor(
        'user',
        await userIdentity.getActorPublicSignatureKey(),
        publicEncryptionKey
    );
    const appLedgerMicroblock = await mbBuilder.createMicroblockFromStateUpdateRequest(
        operatorIdentity,
        request
    );
    appLedgerMicroblock.setFeesPayerAccount(newAccountId.toBytes());
    appLedgerMicroblock.setTimestamp(Utils.getTimestampInSeconds());
    appLedgerMicroblock.setGasPrice(CMTSToken.createMilliToken(1));
    await appLedgerMicroblock.setGasAndSeal(provider, sk);
    const {microblockHash: applicationLedgerId} = appLedgerMicroblock.serialize();
    await provider.publishMicroblock(appLedgerMicroblock);
    await provider.awaitMicroblockAnchoring(appLedgerMicroblock.getHash().toBytes());

    // reload the VB and create a proof
    console.log(`Exporting proof`);
    const appLedgerVb = await provider.loadApplicationLedgerVirtualBlockchain(Hash.from(applicationLedgerId));
    const proofWrapper = await appLedgerVb.exportProof(
        { author },
        userIdentity
    );
    const proofContent = JSON.stringify(proofWrapper, null, 2);
    fs.writeFileSync(`C:/Users/arnau/Desktop/Proof-FincTek.json`, proofContent);

    // attach the proof to the PDF template and save a new PDF file
    console.log(`Attaching proof to PDF file 'FincTek.pdf'`);
    const pdfBytes = fs.readFileSync("./template.pdf");
    const pdfDoc = await PDF.load(new Uint8Array(pdfBytes));
    const proofContentAsBinary = new TextEncoder().encode(proofContent);
    pdfDoc.addAttachment("CarmentisProof.json", proofContentAsBinary);
    const newPdfBytes = await pdfDoc.save();
    fs.writeFileSync(`C:/Users/arnau/Desktop/FincTek.pdf`, newPdfBytes);
}
