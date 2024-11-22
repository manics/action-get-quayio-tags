/**
 * Unit tests for the action's main functionality, src/main.js
 */
const { describe, it, mock } = require('node:test')
const assert = require('node:assert/strict')

const core = require('@actions/core')
const quayio = require('../src/quayio')
const main = require('../src/main')

describe('main', () => {
  it('runs main with mocks', async function () {
    // https://github.com/nodejs/help/issues/4295

    // Mock the GitHub Actions core library
    const debug = mock.fn((...args) => {
      console.debug(...args)
    })
    const getInput = mock.fn(a => {
      if (a === 'version') return '1.2.3'
      if (a === 'repository') return 'owner/repo'
      if (a === 'strict') return 'true'
      if (a === 'allTags') return 'false'
      throw new Error(`Invalid input name ${a}`)
    })
    const setFailed = mock.fn(() => {})
    const setOutput = mock.fn(() => {})

    mock.method(core, 'debug', debug)
    mock.method(core, 'getInput', getInput)
    mock.method(core, 'setFailed', setFailed)
    mock.method(core, 'setOutput', setOutput)

    const getAllMatches = mock.fn(() => ['1.2.3-1', '1.2.3-62', '1.2.3-53'])
    mock.method(quayio, 'getAllMatches', getAllMatches)

    await main.run()

    assert.equal(getInput.mock.callCount(), 4)

    assert.equal(getAllMatches.mock.callCount(), 1)
    assert.deepEqual(getAllMatches.mock.calls[0].arguments, [
      'owner/repo',
      '1.2.3',
      true
    ])

    assert.equal(setOutput.mock.callCount(), 2)
    assert.deepEqual(setOutput.mock.calls[0].arguments, [
      'tags',
      ['1.2.3-1', '1.2.3-62', '1.2.3-53']
    ])
    assert.deepEqual(setOutput.mock.calls[1].arguments, ['buildNumber', 63])
  })

  it('checks main returns errors', async function () {
    // Mock the GitHub Actions core library
    const debug = mock.fn((...args) => {
      console.debug(...args)
    })
    const getInput = mock.fn(a => {
      if (a === 'version') return '1.2.3'
      if (a === 'repository') return 'owner/repo'
      if (a === 'strict') return 'invalid'
      if (a === 'allTags') return 'invalid'
      throw new Error(`Invalid input name ${a}`)
    })
    const setFailed = mock.fn(() => {})
    const setOutput = mock.fn(() => {})

    mock.method(core, 'debug', debug)
    mock.method(core, 'getInput', getInput)
    mock.method(core, 'setFailed', setFailed)
    mock.method(core, 'setOutput', setOutput)

    const getAllMatches = mock.fn(() => {})
    mock.method(quayio, 'getAllMatches', getAllMatches)

    await main.run()

    assert.equal(getInput.mock.callCount(), 4)
    assert.equal(getAllMatches.mock.callCount(), 0)
    assert.equal(setOutput.mock.callCount(), 0)

    assert.equal(setFailed.mock.callCount(), 1)
    assert.deepEqual(setFailed.mock.calls[0].arguments, [
      "strict must be 'true' or 'false': invalid"
    ])
  })
})
