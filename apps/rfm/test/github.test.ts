import assert from 'node:assert/strict'
import test from 'node:test'
import {
  createGithubIssue,
  createGithubRepoUrl,
  isValidGithubIssueUrl,
  isValidGithubUrl,
  NONE_ISSUE,
} from '../src/services/github.ts'
import type { SubmitRequest } from '../src/services/github-api.ts'

test('isValidGithubUrl accepts repo urls and full names', () => {
  assert.equal(isValidGithubUrl('https://github.com/facebook/react'), true)
  assert.equal(isValidGithubUrl('github.com/facebook/react'), true)
  assert.equal(isValidGithubUrl('facebook/react'), true)
  assert.equal(isValidGithubUrl('https://gitlab.com/facebook/react'), false)
  assert.equal(isValidGithubUrl('facebook'), false)
  assert.equal(isValidGithubUrl('facebook/react/extra'), false)
})

test('createGithubRepoUrl expands full names', () => {
  assert.equal(
    createGithubRepoUrl('facebook/react'),
    'https://github.com/facebook/react',
  )
  assert.equal(
    createGithubRepoUrl('https://github.com/facebook/react'),
    'https://github.com/facebook/react',
  )
})

test('isValidGithubIssueUrl accepts issue urls and the NONE sentinel', () => {
  assert.equal(isValidGithubIssueUrl(NONE_ISSUE), true)
  assert.equal(
    isValidGithubIssueUrl('https://github.com/facebook/react/issues/1'),
    true,
  )
  assert.equal(
    isValidGithubIssueUrl('https://github.com/facebook/react/pull/1'),
    false,
  )
  assert.equal(
    isValidGithubIssueUrl('https://github.com/facebook/react'),
    false,
  )
})

test('createGithubIssue targets sospedra/rfm with the search label', () => {
  const request: SubmitRequest = {
    description: 'A repo',
    fullName: 'facebook/react',
    language: 'JavaScript',
    name: 'react',
    openIssues: 10,
    owner: 'facebook',
    stars: 1000,
    updatedAt: '2020-01-01T00:00:00Z',
    url: 'https://github.com/facebook/react',
    requestIssueFullName: 'NONE',
    requestIssueNumber: -1,
  }
  const url = createGithubIssue(request)

  assert.ok(url.startsWith('https://github.com/sospedra/rfm/issues/new'))
  assert.ok(url.includes('labels=search'))
  assert.ok(url.includes('title=facebook%2Freact'))
  assert.equal(createGithubIssue(undefined), '')
})
