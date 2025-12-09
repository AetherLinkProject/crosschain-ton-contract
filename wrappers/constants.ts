export abstract class Op {
    static readonly multisig = {
        new_order: 0xdbfd045,
        execute: 0xff6310de,
        execute_internal: 0xdbd70e57
    }

    static readonly order = {
        approve: 0x845dda8c,
        approve_rejected: 0x7c055e53,
        approved: 0x845dda8c,
        init: 0xc674e474
    }
    static readonly actions = {
        send_message: 0x5757d6f8,
        update_multisig_params: 0x1b7cbf7d,
    }
}