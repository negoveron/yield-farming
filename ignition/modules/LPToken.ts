import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const LPTokenModule = buildModule("LPTokenModule", (m) => {
  const initialOwner = m.getParameter("initialOwner", m.getAccount(0));

  const lpToken = m.contract("LPToken", [initialOwner]);

  return { lpToken };
});

export default LPTokenModule;