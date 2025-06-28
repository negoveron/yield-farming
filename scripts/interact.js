const { ethers } = require("hardhat");
const fs = require('fs');

async function mintAndDeposit(p) {
  const {signer:user, amount, token: lpToken, tokenFarm} = p;
      
  const userName = "User_"+user.address.slice(0,4);
  const addr = await tokenFarm.getAddress();
  try {
  // 1. Mintear LP tokens para user
    console.log("\n💰 Minteando LP tokens para "+userName+"...");
    const lpAmount = ethers.parseEther(amount);
    await lpToken.mint(user.address, lpAmount);
    console.log("✅ Minteados "+amount+" LP tokens para "+userName);
    
    // 2. User aprueba y deposita LP tokens
    console.log("\n📥 "+userName+" depositando LP tokens...");
    await lpToken.connect(user).approve(addr, lpAmount);
    await tokenFarm.connect(user).deposit(lpAmount);
    console.log("✅ "+userName+" depositó "+amount+" LP tokens");    
    
  } catch (error) {
    console.error("❌ Error durante mintAndDeposit():", error);
  }    
}

async function verificarRecompensa (user, tokenFarm) {
    const userInfo = await tokenFarm.getUserInfo(user.address);
    const userName = "User_"+user.address.slice(0,4);
    console.log("\n📊 Info de "+userName+":");
    console.log("  Staking Balance:", ethers.formatEther(userInfo.stakingBalance), "LPT");
    console.log("  Pending Rewards:", ethers.formatEther(userInfo.pendingRewards), "DAPP");
}


async function main() {
  console.log("🔄 Iniciando interacción con contratos...");
  
  // Leer direcciones desplegadas
  const addresses = JSON.parse(fs.readFileSync('deployed-addresses.json', 'utf8'));
  
  // Obtener signers y amounts
  const signers = [owner, user1, user2, user3 ] = await ethers.getSigners();
  const amounts = ["50","100","150"];
  console.log("Owner:", owner.address);
  console.log("User1:", user1.address);
  console.log("User2:", user2.address);
  console.log("User3:", user3.address);  
  
  
  // Conectar a contratos
  const lpToken = await ethers.getContractAt("LPToken", addresses.LPToken);
  const tokenFarm = await ethers.getContractAt("TokenFarm", addresses.TokenFarm);
  const dappToken = await ethers.getContractAt("DAppToken", addresses.DAppToken);

  const params = {
    "signer":signers[0],
    "amount": "0",
    "token": lpToken,
    "tokenFarm": tokenFarm
  }
  
  for (let i = 0; i < 3; i++) {
    params.signer = signers[i+1];
    params.amount = amounts[i];
    await mintAndDeposit(params)
  }  
  try {    
    // 3. Simular paso del tiempo (minar bloques)
    console.log("\n⏰ Simulando paso del tiempo...");
    for (let i = 0; i < 10; i++) {
      await ethers.provider.send("evm_mine");
    }
    console.log("✅ Minados 10 bloques");
    
    // 4. Distribuir recompensas
    console.log("\n🎁 Distribuyendo recompensas...");
    await tokenFarm.distributeRewardsAll();
    console.log("✅ Recompensas distribuidas");
    
    // 5. Verificar recompensas pendientes
    for (let i = 0; i < 3; i++) {
      await verificarRecompensa(signers[i+1], tokenFarm);
    }
  
    console.log("\n=====================================");
    console.log("🏦 Interacciones de Usuarios...");
    console.log("=====================================");
    
    // 6. User1 reclama recompensas
    console.log("\n💎 User_"+user1.address.slice(0,4)+" reclamando recompensas...");
    await tokenFarm.connect(user1).claimRewards();
    
    // 7. Verificar balance de DAPP tokens de user1
    const dappBalance = await dappToken.balanceOf(user1.address);
    console.log("✅ Balance DAPP de User_"+user1.address.slice(0,4)+":", ethers.formatEther(dappBalance));

    // Verficar recompensas user2
    await verificarRecompensa(user2, tokenFarm);
    
    // 8. User2 retira LPT 
    console.log("\n💎 User_"+user2.address.slice(0,4)+" retirando LPTs...");
    await tokenFarm.connect(user2).withdraw();

    // 9. Verificar balance de LPT tokens de user2
    const lpBalance = await lpToken.balanceOf(user2.address);
    console.log("✅ Balance LPT de User_"+user2.address.slice(0,4)+":", ethers.formatEther(lpBalance));

    // Verficar recompensas user2
    await verificarRecompensa(user2, tokenFarm);
    
    // 10. User2 reclama recompensas
    console.log("\n💎 User_"+user2.address.slice(0,4)+" reclamando recompensas...");
    await tokenFarm.connect(user2).claimRewards();

    // 11. Verificar balance de DAPP tokens de user2
    const dappBalanceU2 = await dappToken.balanceOf(user2.address);
    console.log("✅ Balance DAPP de User_"+user2.address.slice(0,4)+":", ethers.formatEther(dappBalanceU2));
    
    // 12. Verificar comisiones acumuladas
    try {
      const accumulatedFees = await tokenFarm.accumulatedFees();
      console.log("\n💰 Comisiones acumuladas:", ethers.formatEther(accumulatedFees), "DAPP");
    } catch (error) {
      console.error("❌ Error al verificar comisiones:", error.message);
    }
    
    // 13. Verificar total de staking
    try {
      const totalStaking = await tokenFarm.totalStakingBalance();
      console.log("🏦 Total staking balance:", ethers.formatEther(totalStaking), "LPT");
    } catch (error) {
      console.error("❌ Error al verificar total staking:", error.message);
    }
    
    console.log("\n🎉 ¡Interacción completada exitosamente!");
    
  } catch (error) {
    console.error("❌ Error durante la interacción:", error);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Error crítico:", error);
    process.exit(1);
  });