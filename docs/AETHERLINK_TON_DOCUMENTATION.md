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
├── contracts/                # TON smart contracts
│   ├── oracleProxy.fc        # Core cross-chain oracle contract
│   ├── oracle/               # Oracle-related helpers and storage
│   │   ├── utility.fc
│   │   ├── messageIdDicHelper.fc
│   │   ├── storage.fc
│   │   └── const.fc
│   ├── multiSign/            # Multi-signature logic and helpers
│   ├── common/               # Common utilities and data structures
│   └── imports/              # External dependencies (e.g., stdlib.fc)
├── scripts/                  # Deployment and testing scripts
├── tests/                    # Test cases
└── docs/                     # Documentation
```

# Module Documentation

## Core Contract: oracleProxy.fc

The heart of the Aetherlink TON suite, `oracleProxy.fc` orchestrates cross-chain task management, oracle coordination, signature verification, and value relay. It integrates all major logic for secure, decentralized oracle operations.

## Supporting Modules

- **oracle/**: Helper contracts and storage for oracle operations (e.g., message ID management, constants, persistent storage).
- **multiSign/**: Multi-signature logic, threshold verification, and related helpers for secure consensus.
- **common/**: Shared utilities, data structures, and message encoding/decoding.
- **imports/**: External dependencies, such as standard libraries.

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