// SPDX-License-Identifier: MIT
//Guillermo Veron
pragma solidity ^0.8.28;

import "./DAppToken.sol";
import "./LPToken.sol";

/**
 * @title Ultimate Token Farm
 * @notice Una granja de staking donde las recompensas se distribuyen proporcionalmente al total stakeado.
 */
contract TokenFarm {
    //
    // Struct para información de usuario
    //
    struct UserInfo {
        uint256 stakingBalance;     // Balance de tokens en staking
        uint256 checkpoint;         // Último bloque donde se calcularon recompensas
        uint256 pendingRewards;     // Recompensas pendientes de reclamar
        bool hasStaked;            // Si el usuario ha hecho staking alguna vez
        bool isStaking;            // Si el usuario está actualmente staking
    }

    //
    // Variables de estado
    //
    string public name = "Ultimate Token Farm";
    address public owner;
    DAppToken public dappToken;
    LPToken public lpToken;

    uint256 public rewardPerBlock = 1e18; // Recompensa por bloque (configurable)
    uint256 public totalStakingBalance; // Total de tokens en staking
    uint256 public feePercentage = 500; // 5% de comisión (500 basis points)
    uint256 public accumulatedFees; // Comisiones acumuladas

    address[] public stakers;
    mapping(address => UserInfo) public userInfo;

    // Eventos
    event Deposit(address indexed user, uint256 amount);
    event Withdraw(address indexed user, uint256 amount);
    event RewardsClaimed(address indexed user, uint256 amount, uint256 fee);
    event RewardsDistributed(uint256 totalRewards);
    event RewardPerBlockUpdated(uint256 oldRate, uint256 newRate);
    event FeePercentageUpdated(uint256 oldFee, uint256 newFee);
    event FeesWithdrawn(address indexed owner, uint256 amount);

    // Modifiers
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this function");
        _;
    }

    modifier onlyStaker() {
        require(userInfo[msg.sender].isStaking, "User is not staking");
        _;
    }

    // Constructor
    constructor(DAppToken _dappToken, LPToken _lpToken) {
        dappToken = _dappToken;
        lpToken = _lpToken;
        owner = msg.sender;
    }

    /**
     * @notice Deposita tokens LP para staking.
     * @param _amount Cantidad de tokens LP a depositar.
     */
    function deposit(uint256 _amount) external {
        require(_amount > 0, "Amount must be greater than 0");
        
        // Transferir tokens LP del usuario a este contrato
        lpToken.transferFrom(msg.sender, address(this), _amount);
        
        UserInfo storage user = userInfo[msg.sender];
        
        // Actualizar el balance de staking del usuario
        user.stakingBalance += _amount;
        totalStakingBalance += _amount;
        
        // Si el usuario nunca ha hecho staking antes, agregarlo al array stakers
        if (!user.hasStaked) {
            stakers.push(msg.sender);
            user.hasStaked = true;
        }
        
        // Actualizar estado de staking
        user.isStaking = true;
        
        // Si es el primer checkpoint, inicializarlo con el bloque actual
        if (user.checkpoint == 0) {
            user.checkpoint = block.number;
        }
        
        // Calcular y actualizar las recompensas pendientes
        distributeRewards(msg.sender);
        
        emit Deposit(msg.sender, _amount);
    }

    /**
     * @notice Retira todos los tokens LP en staking.
     */
    function withdraw() external onlyStaker {
         // Verificar que el usuario está haciendo staking (isStaking == true). NO SE ESTA HACIENDO!!!
        UserInfo storage user = userInfo[msg.sender];
        uint256 balance = user.stakingBalance;
        
        require(balance > 0, "Staking balance is 0");
        
        // Calcular y actualizar las recompensas pendientes antes de retirar
        distributeRewards(msg.sender);
        
        // Restablecer balance de staking del usuario
        user.stakingBalance = 0;
        totalStakingBalance -= balance;
        user.isStaking = false;
        
        // Transferir los tokens LP de vuelta al usuario
        lpToken.transfer(msg.sender, balance);
        
        emit Withdraw(msg.sender, balance);
    }

    /**
     * @notice Reclama recompensas pendientes.
     */
    function claimRewards() external {
        UserInfo storage user = userInfo[msg.sender];
        uint256 pendingAmount = user.pendingRewards;
        
        require(pendingAmount > 0, "No pending rewards");
        
        // Calcular comisión
        uint256 fee = (pendingAmount * feePercentage) / 10000;
        uint256 netReward = pendingAmount - fee;
        
        // Restablecer las recompensas pendientes del usuario
        user.pendingRewards = 0;
        
        // Acumular comisiones
        accumulatedFees += fee;
        
        // Transferir recompensas netas al usuario
        dappToken.mint(msg.sender, netReward);
        
        emit RewardsClaimed(msg.sender, netReward, fee);
    }

    /**
     * @notice Distribuye recompensas a todos los usuarios en staking.
     */
    function distributeRewardsAll() external onlyOwner {
        uint256 totalDistributed = 0;
        
        for (uint256 i = 0; i < stakers.length; i++) {
            address staker = stakers[i];
            if (userInfo[staker].isStaking) {
                uint256 oldPending = userInfo[staker].pendingRewards;
                distributeRewards(staker);
                totalDistributed += (userInfo[staker].pendingRewards - oldPending);
            }
        }
        
        emit RewardsDistributed(totalDistributed);
    }

    /**
     * @notice Permite al owner cambiar la tasa de recompensas por bloque.
     * @param _newRewardPerBlock Nueva tasa de recompensas por bloque.
     */
    function setRewardPerBlock(uint256 _newRewardPerBlock) external onlyOwner {
        require(_newRewardPerBlock > 0, "Reward per block must be greater than 0");
        
        uint256 oldRate = rewardPerBlock;
        rewardPerBlock = _newRewardPerBlock;
        
        emit RewardPerBlockUpdated(oldRate, _newRewardPerBlock);
    }

    /**
     * @notice Permite al owner cambiar el porcentaje de comisión.
     * @param _newFeePercentage Nuevo porcentaje de comisión en basis points (100 = 1%).
     */
    function setFeePercentage(uint256 _newFeePercentage) external onlyOwner {
        require(_newFeePercentage <= 1000, "Fee cannot exceed 10%"); // Máximo 10%
        
        uint256 oldFee = feePercentage;
        feePercentage = _newFeePercentage;
        
        emit FeePercentageUpdated(oldFee, _newFeePercentage);
    }

    /**
     * @notice Permite al owner retirar las comisiones acumuladas.
     */
    function withdrawFees() external onlyOwner {
        require(accumulatedFees > 0, "No fees to withdraw");
        
        uint256 fees = accumulatedFees;
        accumulatedFees = 0;
        
        dappToken.mint(owner, fees);
        
        emit FeesWithdrawn(owner, fees);
    }

    /**
     * @notice Calcula y distribuye las recompensas proporcionalmente al staking total.
     * @param beneficiary Dirección del usuario para calcular recompensas.
     */
    function distributeRewards(address beneficiary) private {
        UserInfo storage user = userInfo[beneficiary];
        uint256 lastCheckpoint = user.checkpoint;
        
        // Verificar condiciones para distribución
        if (block.number <= lastCheckpoint || totalStakingBalance == 0 || user.stakingBalance == 0) {
            user.checkpoint = block.number;
            return;
        }
        
        // Calcular bloques transcurridos
        uint256 blocksPassed = block.number - lastCheckpoint;
        
        // Calcular proporción del usuario (usando precisión para evitar errores de redondeo)
        uint256 userShare = (user.stakingBalance * 1e18) / totalStakingBalance;
        
        // Calcular recompensas del usuario
        uint256 userReward = (rewardPerBlock * blocksPassed * userShare) / 1e18;
        
        // Actualizar recompensas pendientes
        user.pendingRewards += userReward;
        
        // Actualizar checkpoint
        user.checkpoint = block.number;
    }

    /**
     * @notice Obtiene informacion completa de un usuario.
     * @param _user Direccion del usuario.
     * @return stakingBalance del usuario como tupla.
     * @return checkpoint del usuario como tupla.
     */
    function getUserInfo(address _user) external view returns (
        uint256 stakingBalance,
        uint256 checkpoint,
        uint256 pendingRewards,
        bool hasStaked,
        bool isStaking
    ) {
        UserInfo memory user = userInfo[_user];
        return (
            user.stakingBalance,
            user.checkpoint,
            user.pendingRewards,
            user.hasStaked,
            user.isStaking
        );
    }

    /**
     * @notice Obtiene el número total de stakers.
     * @return Número de stakers.
     */
    function getStakersCount() external view returns (uint256) {
        return stakers.length;
    }
}