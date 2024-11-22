/**
 * Unit tests for src/quayio.js
 */

// Jest fails to mock fetch
// https://github.com/nodejs/undici/issues/1882
// so use the built in node test framework instead
const { describe, it, beforeEach, afterEach } = require('node:test')
const assert = require('node:assert/strict')
const { getAllMatches, nextBuildNumber } = require('../src/quayio')

const { MockAgent, setGlobalDispatcher } = require('undici')
let mockAgent
let tagInterceptor

beforeEach(() => {
  mockAgent = new MockAgent({ connections: 1 })
  mockAgent.disableNetConnect()
  setGlobalDispatcher(mockAgent)
  tagInterceptor = mockAgent.get('https://quay.io')
})

afterEach(async () => {
  mockAgent.assertNoPendingInterceptors()
  await mockAgent.close()
})

function setupIntercept(version, page, tags, hasAdditional = false) {
  const query = {
    page: `${page}`
  }
  if (version) {
    query.filter_tag_name = `like:${version}`
  }
  tagInterceptor
    .intercept({
      path: '/api/v1/repository/owner/repo/tag/',
      query
    })
    .defaultReplyHeaders({ 'Content-Type': 'application/json' })
    .reply(200, {
      tags,
      page,
      has_additional: hasAdditional
    })
}

describe('getAllMatches', () => {
  it('Multiple pages', async () => {
    setupIntercept('1.0.0', 1, [{ name: '1.0.0-0' }, { name: '1.0.0-1' }], true)
    setupIntercept('1.0.0', 2, [{ name: '1.0.0-2' }])

    const tags = await getAllMatches('owner/repo', '1.0.0')
    assert.deepEqual(tags, ['1.0.0-0', '1.0.0-1', '1.0.0-2'])
  })

  it('Filter substrings', async () => {
    setupIntercept('1.2.3', 1, [
      { name: '1.2.3' },
      { name: '1.2.33' },
      { name: '11.2.3' },
      { name: '11.2.33' },
      { name: '1.2.3.4' },
      { name: '1.2.3a' },
      { name: '1.2.3-a' },
      { name: '1.2.3-123' },
      { name: '1.2.3-1' },
      { name: '1.2.3-12' },
      { name: '1.2.3-' },
      { name: '1.2.3-1a' }
    ])

    const tags = await getAllMatches('owner/repo', '1.2.3')
    assert.deepEqual(tags, ['1.2.3-123', '1.2.3-1', '1.2.3-12'])
  })

  for (const v of ['1.2.3.4', '1.2.3-0']) {
    it(`Invalid strict version ${v}`, async () => {
      await assert.rejects(async () => await getAllMatches('owner/repo', v), {
        message: `Invalid version, must be MAJOR.MINOR.PATCH: ${v}`
      })
    })
  }

  it('Allow non-strict version', async () => {
    setupIntercept('1.2-a-b-c', 1, [
      { name: '1.2-a-b-c' },
      { name: '1.2-a-b-c-9' },
      { name: '11.2-a-b-c-20' },
      { name: '11.2-a-b-cc' },
      { name: '1.2-a-b-c-invalid' },
      { name: '1.2-a-b-c-99' }
    ])

    const tags = await getAllMatches('owner/repo', '1.2-a-b-c', false)
    assert.deepEqual(tags, ['1.2-a-b-c-9', '1.2-a-b-c-99'])
  })

  it('All tags', async () => {
    setupIntercept(null, 1, [
      { name: '1.2-a-b-c' },
      { name: '1.2.3-2' },
      { name: '1.2-a-b-c-9' },
      { name: '11.2-a-b-cc' }
    ])

    const tags = await getAllMatches('owner/repo', '')
    assert.deepEqual(tags, [
      '1.2-a-b-c',
      '1.2.3-2',
      '1.2-a-b-c-9',
      '11.2-a-b-cc'
    ])
  })
})

describe('nextBuildNumber', () => {
  it('No existing builds', async () => {
    const buildNumber = nextBuildNumber('1.2.3', [])
    assert.equal(buildNumber, 0)
  })

  it('Multidigit builds', async () => {
    const buildNumber = await nextBuildNumber('1.2.3', [
      '1.2.3-1',
      '1.2.3-10',
      '1.2.3-11',
      '1.2.3-2',
      '1.2.3-3'
    ])
    assert.equal(buildNumber, 12)
  })

  it('Add digit', async () => {
    const buildNumber = await nextBuildNumber('1.2.3', ['1.2.3-99'])
    assert.equal(buildNumber, 100)
  })

  it('All tags unfiltered', async () => {
    const buildNumber = await nextBuildNumber('1.2.3', [
      '1.2.39-20',
      '1.2.3-10',
      '11.2.3-30',
      'aaa'
    ])
    assert.equal(buildNumber, 11)
  })

  it('All tags unfiltered no match', async () => {
    const buildNumber = await nextBuildNumber('1.2.3', ['1.0.0', '1.1.1'])
    assert.equal(buildNumber, 0)
  })
})
