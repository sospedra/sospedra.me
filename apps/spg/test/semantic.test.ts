import assert from 'node:assert/strict'
import { test } from 'node:test'
import { semantic } from '../src/spg/semantic.ts'
import { stubs } from './stubs.ts'

test('keeps plain sentences intact', () => {
  assert.deepEqual(semantic(stubs.large), [stubs.large])
  assert.deepEqual(semantic(stubs.medium), [stubs.medium])
  assert.deepEqual(semantic(stubs.small), [stubs.small])
})

test('turns elisions into separate words', () => {
  assert.deepEqual(semantic(stubs.elision), ['itsn t a thing we ll understand'])
})

test('cleans wikipedia html extracts', () => {
  assert.deepEqual(semantic(stubs.html), [
    'Bjork Gudmundsdottir OTF b j ɜːr k BYURK Icelandic pjoerk ˈkvʏdmʏntsˌtouhtɪr listen born 21 November 1965 is an Icelandic singer songwriter record producer actress and DJ',
    'Over her four decade career she has developed an eclectic musical style that draws on a range of influences and genres spanning electronic pop experimental trip hop classical and avant garde music',
  ])
})

test('splits multi-paragraph extracts into sentences', () => {
  assert.deepEqual(semantic(stubs.extract), [
    'Rapid Evolution also known as RE is a software tool for DJs providing filtering and searching features suitable for musicians',
    'It can analyze audio files and automatically determine properties such as the musical key beats per minute BPM beat intensity and ReplayGain',
    'It supports file types MP3 MP4 WAV FLAC OGG AAC and APE',
    'It helps DJs to organize and profile their music and assists in the process of mixing music by utilizing song metadata to be able to show',
  ])
})

test('deburrs unicode down to readable words', () => {
  assert.deepEqual(semantic(stubs.unicode), [
    'Bjork Gudmundsdottir OTF bjɜːrk BYURK Icelandic pjoerk ˈkvʏdmʏntsˌtouhtɪr About this soundlisten born 21 November 1965 is an Icelandic singer songwriter record producer actress and DJ',
    'Over her four decade career she has developed an eclectic musical style that draws on a range of influences and genres spanning electronic pop experimental trip hop classical and avant garde music',
  ])
})
