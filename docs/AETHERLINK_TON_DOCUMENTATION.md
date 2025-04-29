# Aetherlink TON Oracle Cross-Chain Contracts Documentation

## Overview

Aetherlink TON is an advanced TON-compatible oracle cross-chain contract suite, designed to securely relay, validate, and synchronize data and value between TON and other blockchains. It enables:

* **Cross-chain Task Management**: Manages cross-chain requests and responses with secure validation.
* **Oracle Cluster Management**: Coordinates decentralized oracle nodes for data delivery and validation.
* **Signature Verification**: Implements robust signature verification for cross-chain message security.
* **Modular Architecture**: Separates core logic into distinct modules for maintainability.
* **Security First**: Implements comprehensive security measures for cross-chain operations.

## Root Directory Structure

```
/
├── contracts/           # TON smart contracts
│   ├── oracle/         # Oracle core contracts
│   │   ├── Task.fc     # Task management contract
│   │   ├── Oracle.fc   # Oracle node management
│   │   └── Verify.fc   # Signature verification
│   ├── interfaces/     # Contract interfaces
│   └── utils/          # Utility functions
├── scripts/            # Deployment and testing scripts
├── tests/              # Test cases
└── docs/              # Documentation
```

# Module Documentation

## Task Management Module (Task.fc)

### Overview
The Task Management module is responsible for handling cross-chain task lifecycle, from creation to completion. It implements secure state management and response processing mechanisms.

### Technical Details

#### State Variables
```
global_id: Integer       # Unique task identifier
tasks: Map<Integer, Task> # Task storage
config: TaskConfig       # Module configuration
```

#### Key Functions

1. **create_task**
   ```
   create_task(
     source_chain: Integer,
     target_chain: Integer,
     payload: Cell,
     fee: Integer
   ) -> Integer
   ```
   Creates a new cross-chain task with unique ID.

2. **process_response**
   ```
   process_response(
     task_id: Integer,
     response: Cell,
     signatures: [Signature]
   ) -> Boolean
   ```
   Processes oracle responses with signature verification.

3. **get_task_status**
   ```
   get_task_status(task_id: Integer) -> TaskStatus
   ```
   Returns current task status.

### Events
- TaskCreated(task_id, source, target)
- ResponseProcessed(task_id, status)
- TaskCompleted(task_id, result)

## Oracle Management Module (Oracle.fc)

### Overview
Manages oracle node registration, staking, and consensus coordination.

### Technical Details

#### State Variables
```
oracle_nodes: Map<Address, OracleInfo>
min_stake: Integer
consensus_threshold: Integer
```

#### Key Functions

1. **register_node**
   ```
   register_node(
     public_key: PublicKey,
     stake: Integer
   ) -> Boolean
   ```
   Registers new oracle node with stake.

2. **submit_response**
   ```
   submit_response(
     task_id: Integer,
     response: Cell,
     signature: Signature
   ) -> Boolean
   ```
   Submits oracle response for task.

3. **withdraw_stake**
   ```
   withdraw_stake(
     amount: Integer
   ) -> Boolean
   ```
   Withdraws staked tokens.

### Events
- NodeRegistered(address, stake)
- ResponseSubmitted(task_id, node)
- StakeWithdrawn(address, amount)

## Signature Verification Module (Verify.fc)

### Overview
Implements cryptographic verification for cross-chain message security.

### Technical Details

#### Key Functions

1. **verify_signature**
   ```
   verify_signature(
     message: Cell,
     signature: Signature,
     public_key: PublicKey
   ) -> Boolean
   ```
   Verifies individual signature.

2. **verify_multi_sig**
   ```
   verify_multi_sig(
     message: Cell,
     signatures: [Signature],
     threshold: Integer
   ) -> Boolean
   ```
   Verifies multiple signatures against threshold.

### Security Features
- Ed25519 signature scheme
- Threshold signature verification
- Replay attack prevention

## Utils Module

### Overview
Common utility functions used across other modules.

### Components

1. **Cryptographic Utils**
   ```
   hash_message(message: Cell) -> Integer
   verify_ed25519(signature: Signature, message: Cell) -> Boolean
   ```

2. **Data Encoding**
   ```
   encode_task_data(task: Task) -> Cell
   decode_response(response: Cell) -> Response
   ```

3. **Constants**
   ```
   MIN_STAKE: Integer
   CONSENSUS_THRESHOLD: Integer
   MAX_ORACLE_COUNT: Integer
   ```

## Security Considerations

1. **Multi-Signature Requirement**
   - Multiple oracle signatures required for validation
   - Threshold signature implementation
   - Stake-weighted voting

2. **Stake Management**
   - Required stake for oracle participation
   - Slashing conditions
   - Stake lockup periods

3. **Cross-Chain Security**
   - Message verification
   - Replay attack prevention
   - Timeout handling

## Integration Examples

### Creating a Cross-Chain Task
```
;; Initialize task
var task = create_task(source_chain, target_chain, payload, fee);

;; Wait for oracle responses
var responses = await_responses(task.id);

;; Process responses
process_responses(task.id, responses);
```

### Setting Up Oracle Node
```
;; Register node
register_node(public_key, stake_amount);

;; Monitor tasks
loop {
  var task = get_next_task();
  if task {
    submit_response(task.id, process_task(task));
  }
}
```

## Error Handling

### Common Error Codes
- 1001: Invalid task parameters
- 1002: Insufficient stake
- 1003: Invalid signature
- 1004: Consensus not reached
- 1005: Task timeout

### Error Recovery
1. Task Creation Failures
   - Retry with correct parameters
   - Check fee amount
   - Verify chain IDs

2. Oracle Node Issues
   - Check stake amount
   - Verify registration status
   - Monitor node health

3. Signature Verification
   - Check public key format
   - Verify signature format
   - Ensure threshold requirements

## Performance Considerations

### Optimization Tips
1. Batch Processing
   - Group similar tasks
   - Optimize gas usage
   - Minimize state changes

2. Storage Optimization
   - Clean up completed tasks
   - Archive old data
   - Optimize data structures

3. Network Efficiency
   - Minimize cross-chain calls
   - Batch oracle responses
   - Optimize message size

---

_This documentation is maintained as part of the development workflow._ 