import { NativeModules } from 'react-native';

import { BigNumberish, BytesLike, ethers } from "ethers";
import { UserOperationBuilder, BundlerJsonRpcProvider, Constants, Presets, EOASigner, IPresetBuilderOpts, UserOperationMiddlewareFn } from "userop";
import {
  PrivacyAccountFactory,
  PrivacyAccount as PrivacyAccountImpl,
} from "../../contracts/typechain-types/contracts"
import {
  PrivacyAccountFactory__factory,
  PrivacyAccount__factory,
} from "../../contracts/typechain-types/factories/contracts";
import {
  IEntryPoint
} from "../../contracts/typechain-types/@account-abstraction/contracts/interfaces";
import {
  IEntryPoint__factory
} from "../../contracts/typechain-types/factories/@account-abstraction/contracts/interfaces";


// ====== Semaphore imports ======
// Import the crypto getRandomValues shim (**BEFORE** the shims)
import "react-native-get-random-values";
// Import the the ethers shims (**BEFORE** ethers)
import "@ethersproject/shims";
// Import Semaphore components
import { Identity } from "@semaphore-protocol/identity";
import { Group } from "@semaphore-protocol/group";
import { generateProof } from '@semaphore-protocol/proof';

export class PrivacyAccount extends UserOperationBuilder {
  private signer: EOASigner;
  private provider: ethers.providers.JsonRpcProvider;
  private entryPoint: IEntryPoint;
  private factory: PrivacyAccountFactory;
  private initCode: string;
  private nonceKey: number;
  private identity: Identity;
  private encryptedIdMessageHex: string;
  proxy: PrivacyAccountImpl;

  private constructor(
    signer: EOASigner,
    rpcUrl: string,
    factoryAddress: string,
    identity: Identity,
    encryptedIdMessageHex: string,
    opts?: IPresetBuilderOpts
  ) {
    super();
    this.signer = signer;
    this.provider = new BundlerJsonRpcProvider(rpcUrl).setBundlerRpc(
      opts?.overrideBundlerRpc
    );
    this.entryPoint = IEntryPoint__factory.connect(
      opts?.entryPoint || Constants.ERC4337.EntryPoint,
      this.provider
    );
    this.factory = PrivacyAccountFactory__factory.connect(
      opts?.factory || factoryAddress,
      this.provider
    );
    this.initCode = "0x";
    this.nonceKey = opts?.nonceKey || 0;
    this.proxy = PrivacyAccount__factory.connect(
      ethers.constants.AddressZero,
      this.provider
    );
    this.identity = identity;
    this.encryptedIdMessageHex = encryptedIdMessageHex;
  }

  private resolveAccount: UserOperationMiddlewareFn = async (ctx) => {
    const [nonce, code] = await Promise.all([
      this.entryPoint.getNonce(ctx.op.sender, this.nonceKey),
      this.provider.getCode(ctx.op.sender),
    ]);
    ctx.op.nonce = nonce;
    ctx.op.initCode = code === "0x" ? this.initCode : "0x";
  };

  public static async init(
    signer: EOASigner,
    rpcUrl: string,
    factoryAddress: string,
    idAlias: string,
    inputEncryptedIdMessageHex?: string,
    inputIdCommittment?: bigint,
    opts?: IPresetBuilderOpts
  ): Promise<PrivacyAccount> {
    
    // === create identity from semaphore ===
    const {SemaphoreEnclaveModule} = NativeModules;
    console.log(SemaphoreEnclaveModule);
    
    console.log('Try to authenticate');
    //await SemaphoreEnclaveModule.authenticate(idAlias); 
    console.log('Authentication invoked');

    let idMessageHex: string;
    let encryptedIdMessageHex: string;
    if (inputEncryptedIdMessageHex) {
      // retrieve (decrypt) the identity message from encrypted data
      encryptedIdMessageHex = inputEncryptedIdMessageHex;
      idMessageHex = await SemaphoreEnclaveModule.retrieveSecuredIdMessage(idAlias, encryptedIdMessageHex);
      console.log(`An identity message for alias: ${idAlias} has been retrieved:`);
      console.log(`Raw: '${idMessageHex}', Encrypted: '${encryptedIdMessageHex}'`);
    } else {
      // deterministically create identity from a secret message
      let idMessage = await SemaphoreEnclaveModule.createSecuredIdMessage(idAlias);
      console.log(`An identity message for alias: ${idAlias} has been generated:`);
      console.log(`Raw: '${idMessage.idMessageHex}', Encrypted: '${idMessage.encryptedIdMessageHex}'`);
      idMessageHex = idMessage.idMessageHex;
      encryptedIdMessageHex = idMessage.encryptedIdMessageHex;
    }

    const identity = new Identity(btoa(String.fromCharCode(...ethers.utils.arrayify(idMessageHex)))); // base64-encoded string
    console.log(`Trapdoor: ${identity.trapdoor}`);
    console.log(`Nullifier: ${identity.nullifier}`);
    console.log(`Commitment: ${identity.commitment}`);

    if (inputIdCommittment && inputIdCommittment != identity.commitment) {
      throw new Error("The input identity committment does not match the generated one");
    }
    // === finished creating identity from semaphore ===

    const instance = new PrivacyAccount(signer, rpcUrl, factoryAddress, identity, encryptedIdMessageHex, opts);

    try {
      instance.initCode = await ethers.utils.hexConcat([
        instance.factory.address,
        instance.factory.interface.encodeFunctionData("createAccount", [
          await instance.signer.getAddress(),
          encryptedIdMessageHex,
          ethers.BigNumber.from(opts?.salt ?? 0)
        ]),
      ]);
      await instance.entryPoint.callStatic.getSenderAddress(instance.initCode);

      throw new Error("getSenderAddress: unexpected result");
    } catch (error: any) {
      const addr = error?.errorArgs?.sender;
      if (!addr) throw error;

      instance.proxy = PrivacyAccount__factory.connect(addr, instance.provider);
    }

    const base = instance
      .useDefaults({
        sender: instance.proxy.address,
        signature: await ethers.Wallet.createRandom().signMessage(
          ethers.utils.arrayify(ethers.utils.keccak256("0xdead"))
        ),
      })
      .useMiddleware(instance.resolveAccount)
      .useMiddleware(Presets.Middleware.getGasPrice(instance.provider));

    const withPM = opts?.paymasterMiddleware
      ? base.useMiddleware(opts.paymasterMiddleware)
      : base.useMiddleware(Presets.Middleware.estimateUserOperationGas(instance.provider));

    return withPM.useMiddleware(Presets.Middleware.signUserOpHash(instance.signer));
  }

  async execute(to: string, value: BigNumberish, data: BytesLike) {
    const proof = await this.generateProofToExecute();
    return this
      .setSignature(
        ethers.utils.defaultAbiCoder.encode([ "uint256", "uint256[8]" ], [ proof.nullifierHash, proof.proof ])
      )
      .setCallData(
        this.proxy.interface.encodeFunctionData("execute", [to, value, data])
      );
  }

  async executeBatch(to: Array<string>, data: Array<BytesLike>) {
    const proof = await this.generateProofToExecute();
    return this
    .setSignature(
      ethers.utils.defaultAbiCoder.encode([ "uint256", "uint256[8]" ], [ proof.nullifierHash, proof.proof ])
    )
    .setCallData(
      this.proxy.interface.encodeFunctionData("executeBatch", [to, data])
    );
  }

  private async generateProofToExecute() {
    // reconstruct single user group
    const group = new Group(BigInt(this.getSender()));
    group.addMember(this.identity.commitment);

    console.log(`Generating proof using group ID '${group.id}'...`);
    // generate ZK proof here
    /*
    return {
      nullifierHash: 0n,
      proof: [0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n]
    }
    */
    
    return generateProof(
        this.identity,
        group,
        this.getNonce(),
        0);
  }

  public getEncryptedIdMessageHex(): string {
    return this.encryptedIdMessageHex;
  }

  public getIdCommitment(): bigint {
    return this.identity.commitment;
  }
}
