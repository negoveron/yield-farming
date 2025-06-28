import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const DAppTokenModule = buildModule("DAppTokenModule", (m) => {
  //la cuenta que ejecuta el deployment
  const initialOwner = m.getParameter("initialOwner", m.getAccount(0));

  const dappToken = m.contract("DAppToken", [initialOwner]);

  return { dappToken };
});

export default DAppTokenModule;