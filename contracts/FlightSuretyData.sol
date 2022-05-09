pragma solidity ^0.4.25;

import "../node_modules/openzeppelin-solidity/contracts/math/SafeMath.sol";

contract FlightSuretyData {
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
    function _registerAirline(address _address) external requireIsOperational {
        if (countAirlines >= 1) {
            require(
                airlines[tx.origin].isFunded,
                "Only registered and funded airlines can register a new airline."
            );
        }

        Airline memory airline;
        airline.isRegistered = true;
        airline.isFunded = false;

        airlines[_address] = airline;
        countAirlines += 1;
    }

    function isAirlineRegistered(address _address) public view returns (bool) {
        return airlines[_address].isRegistered;
    }

    function isAirlineFunded(address _address) public view returns (bool) {
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

    /**
     * @dev Buy insurance for a flight
     *
     */
    function buy() external payable {}

    /**
     *  @dev Credits payouts to insurees
     */
    function creditInsurees() external pure {}

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
