const { ethers } = require("hardhat");

async function main() {
  console.log("🚀 Iniciando despliegue de contratos...");
  
  // Obtener el deployer (cuenta que despliega)
  const [deployer] = await ethers.getSigners();
  console.log("Desplegando contratos con la cuenta:", deployer.address);
  
  // Verificar balance
  const balance = await deployer.provider.getBalance(deployer.address);
  console.log("Balance de la cuenta:", ethers.formatEther(balance), "ETH");

  try {
    // 1. Desplegar DAppToken
    console.log("\n📄 Desplegando DAppToken...");
    const DAppToken = await ethers.getContractFactory("DAppToken");
    const dappToken = await DAppToken.deploy(deployer.address);
    await dappToken.waitForDeployment();
    console.log("✅ DAppToken desplegado en:", await dappToken.getAddress());

    // 2. Desplegar LPToken
    console.log("\n📄 Desplegando LPToken...");
    const LPToken = await ethers.getContractFactory("LPToken");
    const lpToken = await LPToken.deploy(deployer.address);
    await lpToken.waitForDeployment();
    console.log("✅ LPToken desplegado en:", await lpToken.getAddress());

    // 3. Desplegar TokenFarm
    console.log("\n📄 Desplegando TokenFarm...");
    const TokenFarm = await ethers.getContractFactory("TokenFarm");
    const tokenFarm = await TokenFarm.deploy(
      await dappToken.getAddress(),
      await lpToken.getAddress()
    );
    await tokenFarm.waitForDeployment();
    console.log("✅ TokenFarm desplegado en:", await tokenFarm.getAddress());

    // 4. Configurar permisos
    console.log("\n⚙️  Configurando permisos...");
    
    // Transferir ownership de DAppToken a TokenFarm para que pueda mintear recompensas
    await dappToken.transferOwnership(await tokenFarm.getAddress());
    console.log("✅ Ownership de DAppToken transferido a TokenFarm");

    // Mintear algunos LP tokens al deployer para pruebas
    const lpTokensToMint = ethers.parseEther("1000");
    await lpToken.mint(deployer.address, lpTokensToMint);
    console.log("✅ Minteados 1000 LP tokens al deployer para pruebas");

    // 5. Mostrar resumen
    console.log("\n🎉 ¡Despliegue completado exitosamente!");
    console.log("=====================================");
    console.log("📋 Direcciones de los contratos:");
    console.log("DAppToken:", await dappToken.getAddress());
    console.log("LPToken:", await lpToken.getAddress());
    console.log("TokenFarm:", await tokenFarm.getAddress());
    console.log("=====================================");
    
    // 6. Verificar configuración
    console.log("\n🔍 Verificando configuración...");
    const farmName = await tokenFarm.name();
    const rewardPerBlock = await tokenFarm.rewardPerBlock();
    const feePercentage = await tokenFarm.feePercentage();
    
    console.log("Nombre de la Farm:", farmName);
    console.log("Recompensa por bloque:", ethers.formatEther(rewardPerBlock), "DAPP");
    console.log("Porcentaje de comisión:", Number(feePercentage) / 100, "%");
    
    // 7. Guardar direcciones en un archivo
    const fs = require('fs');
    const addresses = {
      DAppToken: await dappToken.getAddress(),
      LPToken: await lpToken.getAddress(),
      TokenFarm: await tokenFarm.getAddress(),
      deployer: deployer.address
    };
    
    fs.writeFileSync('deployed-addresses.json', JSON.stringify(addresses, null, 2));
    console.log("✅ Direcciones guardadas en deployed-addresses.json");

  } catch (error) {
    console.error("❌ Error durante el despliegue:", error);
    process.exit(1);
  }
}

// Ejecutar el script
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Error crítico:", error);
    process.exit(1);
  });