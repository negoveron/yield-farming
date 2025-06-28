import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import DAppTokenModule from "./DAppToken";
import LPTokenModule from "./LPToken";

const TokenFarmModule = buildModule("TokenFarmModule", (m) => {
  const { dappToken } = m.useModule(DAppTokenModule);
  const { lpToken } = m.useModule(LPTokenModule);

  const tokenFarm = m.contract("TokenFarm", [dappToken, lpToken]);

  return { tokenFarm, dappToken, lpToken };
});

export default TokenFarmModule;