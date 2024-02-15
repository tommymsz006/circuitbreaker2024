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

export class PrivacyAccount extends UserOperationBuilder {
  private signer: EOASigner;
  private provider: ethers.providers.JsonRpcProvider;
  private entryPoint: IEntryPoint;
  private factory: PrivacyAccountFactory;
  private initCode: string;
  private nonceKey: number;
  proxy: PrivacyAccountImpl;

  private constructor(
    signer: EOASigner,
    rpcUrl: string,
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
      opts?.factory || Constants.ERC4337.SimpleAccount.Factory,
      this.provider
    );
    this.initCode = "0x";
    this.nonceKey = opts?.nonceKey || 0;
    this.proxy = PrivacyAccount__factory.connect(
      ethers.constants.AddressZero,
      this.provider
    );
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
    opts?: IPresetBuilderOpts
  ): Promise<PrivacyAccount> {
    const instance = new PrivacyAccount(signer, rpcUrl, opts);

    try {
      instance.initCode = await ethers.utils.hexConcat([
        instance.factory.address,
        instance.factory.interface.encodeFunctionData("createAccount", [
          await instance.signer.getAddress(),
          ethers.BigNumber.from(opts?.salt ?? 0),
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

  execute(to: string, value: BigNumberish, data: BytesLike) {
    return this.setCallData(
      this.proxy.interface.encodeFunctionData("execute", [to, value, data])
    );
  }

  executeBatch(to: Array<string>, data: Array<BytesLike>) {
    return this.setCallData(
      this.proxy.interface.encodeFunctionData("executeBatch", [to, data])
    );
  }
}