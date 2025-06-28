# Simple Yield Farming

Proyecto para implementar y probar contratos inteligentes de yield farming en la red Ethereum, enfocado en el despliegue y pruebas con Hardhat, TypeScript y OpenZeppelin.

## Descripción

Este repositorio contiene una implementación de un sistema de yield farming (agricultura de rendimientos) que permite a los usuarios depositar tokens LP (Liquidity Provider) y recibir recompensas en tokens nativos del proyecto. Utiliza contratos inteligentes desarrollados en Solidity, con despliegues y pruebas gestionados mediante Hardhat y herramientas relacionadas.

## Contratos desplegados en Sepolia

Actualmente existe una versión deployada en la testnet Sepolia con la que puedes interactuar. Las direcciones de los contratos son:

- **DAppToken:** [`0xEfE93A3793B0E9fd662c3c25DbcC0F35cC362019`](https://sepolia.etherscan.io/address/0xEfE93A3793B0E9fd662c3c25DbcC0F35cC362019)
- **LPToken:** [`0x4d4e862160A36D0ABEe6aa6fc9d752C711387387`](https://sepolia.etherscan.io/address/0x4d4e862160A36D0ABEe6aa6fc9d752C711387387)
- **TokenFarm:** [`0x47f53E65194cca1dFF488488E82D4E32CEC1A679`](https://sepolia.etherscan.io/address/0x47f53E65194cca1dFF488488E82D4E32CEC1A679)

Puedes utilizar estas direcciones para interactuar con los contratos a través de scripts, frontends o directamente desde Etherscan.



## Requisitos previos

- Node.js >= 14.x
- npm >= 6.x

## Instalación

1. Inicializa el proyecto y dependencias:

   ```bash
   git clone https://github.com/negoveron/yield-farming.git
   cd yield-farming
   npm i   
   ```

2. Compila los contratos:

   ```bash
   npx hardhat compile
   ```

   Si necesitas limpiar la compilación:

   ```bash
   npx hardhat clean
   ```

## Variables de entorno

Configura las variables requeridas para la red Sepolia usando los siguientes comandos:

```bash
npx hardhat vars set SEPOLIA_PRIVATE_KEY <TU_PRIVATE_KEY>
npx hardhat vars set ETHERSCAN_API_KEY <TU_ETHERSCAN_API_KEY>
npx hardhat vars set ALCHEMY_API_KEY <TU_ALCHEMY_API_KEY>
```

_Reemplaza los valores por tus claves personales._

## Ejecución en red local de Hardhat

1. Levanta un nodo local:

   ```bash
   npx hardhat node
   ```

2. Despliega los contratos en la red local:

   ```bash
   npx hardhat run scripts/deploy.js --network localhost
   ```

3. Interactúa con los contratos localmente:

   ```bash
   npx hardhat run scripts/interact.js --network localhost
   ```

## Ejecución de las pruebas

1. Ejecuta las pruebas:

   ```bash
   npx hardhat test
   ```

2. Ejecuta las pruebas con coverage:

   ```bash
   npx hardhat coverage
   ```

## Despliegue en Sepolia y verificación

Despliega los módulos en la testnet Sepolia y verifica los contratos en Etherscan:

```bash
npx hardhat ignition deploy ignition/modules/DAppToken.ts --network sepolia --verify
npx hardhat ignition deploy ignition/modules/LPToken.ts --network sepolia --verify
npx hardhat ignition deploy ignition/modules/TokenFarm.ts --network sepolia --verify
```

> **Nota:** Para interactuar con los contratos en Sepolia, asegúrate de tener cuentas con saldo suficiente en esa red.

## Licencia

MIT