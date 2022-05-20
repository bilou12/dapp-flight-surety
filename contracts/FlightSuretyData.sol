pragma solidity ^0.4.25;

import "../node_modules/openzeppelin-solidity/contracts/math/SafeMath.sol";

contract FlightSuretyData {
    using SafeMath for uint8;
    using SafeMath for uint256;

    /********************************************************************************************/
    /*                                       DATA VARIABLES                                     */
    /********************************************************************************************/

    struct Airline {
        bool isRegistered;
        bool isFunded;
    }

    address private contractOwner; // Account used to deploy contract
    bool private operational = true; // Blocks all state changes throughout the contract if false

    mapping(address => bool) private authorizedCallers;
    mapping(address => Airline) airlines;
    uint256 countAirlines = 0;
    mapping(address => uint256) funds;

    uint8 multiSigThreshold = 4;
    address[] multiSigRegistration = new address[](0);

    struct InsuranceContract {
        address customer;
        address airline;
        string flight;
        uint8 timestamp;
        uint256 fee;
        uint256 payout;
    }
    mapping(string => InsuranceContract[]) insuranceContracts; // contracts bought by the customers to the airlines

    mapping(address => uint256) insuranceFunds; // funds of the airlines, used to pay out customers

    mapping(address => uint256) customerCredits; // funds that the customer is entitled to and will be able to withdraw

    /********************************************************************************************/
    /*                                       EVENT DEFINITIONS                                  */
    /********************************************************************************************/

    event AuthorizeCaller(address indexed _address);
    event UnauthorizeCaller(address indexed _address);

    /**
     * @dev Constructor
     *      The deploying account becomes contractOwner
     */
    constructor() public {
        contractOwner = msg.sender;
    }

    /********************************************************************************************/
    /*                                       FUNCTION MODIFIERS                                 */
    /********************************************************************************************/

    // Modifiers help avoid duplication of code. They are typically used to validate something
    // before a function is allowed to be executed.

    /**
     * @dev Modifier that requires the "operational" boolean variable to be "true"
     *      This is used on all state changing functions to pause the contract in
     *      the event there is an issue that needs to be fixed
     */
    modifier requireIsOperational() {
        require(operational, "Contract is currently not operational");
        _; // All modifiers require an "_" which indicates where the function body will be added
    }

    /**
     * @dev Modifier that requires the "ContractOwner" account to be the function caller
     */
    modifier requireContractOwner() {
        require(msg.sender == contractOwner, "Caller is not contract owner");
        _;
    }

    modifier requireIsAuthorizedCaller() {
        require(authorizedCallers[msg.sender], "Caller is not authorized");
        _;
    }

    /********************************************************************************************/
    /*                                       UTILITY FUNCTIONS                                  */
    /********************************************************************************************/

    /**
     * @dev Get operating status of contract
     *
     * @return A bool that is the current operating status
     */
    function isOperational() public view returns (bool) {
        return operational;
    }

    /**
     * @dev Sets contract operations on/off
     *
     * When operational mode is disabled, all write transactions except for this one will fail
     */
    function setOperatingStatus(bool mode) external requireContractOwner {
        operational = mode;
    }

    /********************************************************************************************/
    /*                                     SMART CONTRACT FUNCTIONS                             */
    /********************************************************************************************/

    /**
     * @dev Add an airline to the registration queue
     *      Can only be called from FlightSuretyApp contract
     *
     */
    // TODO - review how to remove the _from, that seems ugly
    function _registerAirline(address _address)
        external
        requireIsOperational
        returns (bool, uint256)
    {
        require(
            !airlines[_address].isRegistered,
            "Airline is already registered"
        );

        // in all cases besides when called from the constructor
        if (countAirlines >= 1) {
            require(
                airlines[tx.origin].isRegistered,
                "Only registered airlines can register a new airline."
            );
        }

        // starting from 'multiSigThreshold' airlines, any new registration should be multisigned
        if (countAirlines >= multiSigThreshold) {
            addMultiSig(tx.origin, _address);
            bool isMultiSig = getStatusMultiSig();
            if (!isMultiSig) {
                return (false, multiSigRegistration.length);
            }

            // reset the multiSigRegistration list if isMultiSig = true
            multiSigRegistration = new address[](0);
        }

        Airline memory airline;
        airline.isRegistered = true;
        airline.isFunded = false;

        airlines[_address] = airline;
        countAirlines += 1;

        return (true, 0);
    }

    function addMultiSig(address _from, address _address) private {
        bool isDuplicate = false;
        for (uint256 c = 0; c < multiSigRegistration.length; c++) {
            if (multiSigRegistration[c] == _from) {
                isDuplicate = true;
                break;
            }
        }

        require(!isDuplicate, "Caller has already called this function");

        multiSigRegistration.push(_from);
    }

    function getStatusMultiSig() private view returns (bool) {
        uint256 threshold = countAirlines.div(2);
        if (multiSigRegistration.length >= threshold) {
            return true;
        }
        return false;
    }

    function countMultiSig() public view returns (uint256) {
        return multiSigRegistration.length;
    }

    function getCountAirlines() public view returns (uint256) {
        return countAirlines;
    }

    function isAirlineRegistered(address _address)
        external
        view
        returns (bool)
    {
        return airlines[_address].isRegistered;
    }

    function isAirlineFunded(address _address) external view returns (bool) {
        return airlines[_address].isFunded;
    }

    function fundAirline(address _address, uint256 _amount) external {
        uint256 fund = funds[_address];
        fund = fund.add(_amount);
        funds[_address] = fund;
    }

    function setAirlineFunded(address _address) external {
        airlines[_address].isFunded = true;
    }

    function getAirlineFunds(address _address) public view returns (uint256) {
        return funds[_address];
    }

    /**
     * @dev Buy insurance for a flight
     *
     */
    function buy(
        address _from,
        address _airline,
        uint256 _fee,
        string _flight
    ) external payable {
        InsuranceContract memory insuranceContract;
        insuranceContract.airline = _airline;
        insuranceContract.fee = _fee;
        insuranceContract.customer = _from;
        insuranceContract.flight = _flight;
        insuranceContract.payout = _fee.mul(3).div(2);

        insuranceContracts[_flight].push(insuranceContract);

        uint256 existingAmount = insuranceFunds[_airline];
        insuranceFunds[_airline] = existingAmount.add(_fee);
    }

    function getInsuranceFund(address _airline) public view returns (uint256) {
        return insuranceFunds[_airline];
    }

    function getInsuranceContract(string _flight, address _customer)
        public
        view
        returns (uint256)
    {
        InsuranceContract[] memory contracts = insuranceContracts[_flight];

        uint256 payout = 0;
        for (uint256 i = 0; i < contracts.length; i++) {
            if (contracts[i].customer == _customer) {
                payout = contracts[i].payout;
            }
        }

        return payout;
    }

    /**
     *  @dev Credits payouts to insurees
     */
    function creditInsurees(string _flight) external requireIsOperational {
        InsuranceContract[] memory contracts = insuranceContracts[_flight];

        for (uint256 i = 0; i < contracts.length; i++) {
            // then we add the payout to the data structure customerCredits
            address customer = contracts[i].customer;
            uint256 payout = contracts[i].payout;

            uint256 existingCredit = customerCredits[customer];
            uint256 newCredit = payout.add(existingCredit);
            customerCredits[customer] = newCredit;
        }

        delete insuranceContracts[_flight];
    }

    function getCustomerCredits(address _customer)
        external
        view
        returns (uint256)
    {
        return customerCredits[_customer];
    }

    /**
     *  @dev Transfers eligible payout funds to insuree
     *
     */
    function pay() external pure {}

    /**
     * @dev Initial funding for the insurance. Unless there are too many delayed flights
     *      resulting in insurance payouts, the contract should be self-sustaining
     *
     */
    function fund() public payable {
        airlines[tx.origin].isFunded = true;
    }

    function getFlightKey(
        address airline,
        string memory flight,
        uint256 timestamp
    ) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked(airline, flight, timestamp));
    }

    /**
     * @dev Fallback function for funding smart contract.
     *
     */
    function() external payable {
        fund();
    }

    /**
     * @dev Add an address to the authorizeCallers map which is used in the modifier requireIsAuthorizedCaller
     *
     */
    function authorizeCaller(address _address) external requireContractOwner {
        authorizedCallers[_address] = true;
        emit AuthorizeCaller(_address);
    }

    /**
     * @dev Remove an address to the authorizeCallers map which is used in the modifier requireIsAuthorizedCaller
     *
     */
    function unauthorizeCaller(address _address) external requireContractOwner {
        authorizedCallers[_address] = false;
        emit UnauthorizeCaller(_address);
    }
}
