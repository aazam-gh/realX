import assert from 'node:assert/strict'
import { test } from 'node:test'
import { isCompletedTransaction } from './transaction-accounting.ts'

test('legacy redemptions count as completed, pending and failed do not', () => {
    assert.equal(isCompletedTransaction({}), true)
    assert.equal(isCompletedTransaction({ status: 'completed' }), true)
    assert.equal(isCompletedTransaction({ status: 'pending' }), false)
    assert.equal(isCompletedTransaction({ status: 'failed' }), false)
})
