#!/usr/bin/env node
// Generate unique i18n message key(s) in orca's canonical
// `adjective_adjective_animal_verb` pattern (e.g. `gentle_brave_falcon_rest`).
// Each generated key is guaranteed NOT to collide with any existing key in the
// source locale (src/messages/en-US/orca.json) or with the other keys produced
// in the same run.
//
// Usage (run from the orca project root):
//   node scripts/generate-key-mapping.cjs       -> prints 1 key
//   node scripts/generate-key-mapping.cjs 5     -> prints 5 distinct keys, one per line
//
// Used by the `i18n-new-message` agent skill. Keys are random per run
// (node:crypto), so repeated single-key calls vary.

const fs = require('fs');
const path = require('path');
const { randomInt } = require('node:crypto');

// Word lists for random key generation.
const adjectives = [
	'bright',
	'calm',
	'swift',
	'gentle',
	'brave',
	'steady',
	'quiet',
	'sharp',
	'clear',
	'warm',
	'cool',
	'bold',
	'soft',
	'hard',
	'quick',
	'slow',
	'happy',
	'sad',
	'dark',
	'light',
	'grand',
	'petty',
	'funny',
	'serious',
	'early',
	'late',
	'upper',
	'lower',
	'sparse',
	'dense',
	'weary',
	'fresh',
	'dry',
	'wet',
	'fluffy',
	'smooth',
	'piquant',
	'vivid',
	'nice',
	'active',
	'male',
	'crazy',
	'deft',
	'small',
	'last',
	'sweet',
	'plane',
	'flat',
	'antsy',
	'top',
	'patchy',
	'stout',
	'true',
	'sea',
	'weird',
	'mad',
	'merry',
	'alert',
	'teary',
	'kind',
	'ok',
	'tidy',
	'major',
	'legal',
	'watery',
	'arable',
	'house',
	'next',
	'sunny',
	'known',
	'proof',
	'dull',
	'gray',
	'aqua',
	'home',
	'equal',
	'pink',
	'best',
	'direct',
	'every',
	'fancy',
	'tired',
	'factual',
	'elegant',
	'moving',
	'wide',
	'silly',
	'shy',
	'curly',
	'tiny',
	'sleek',
	'mellow',
	'bad',
	'great',
	'lucky',
	'red',
	'frail',
	'cuddly',
	'each'
];

const animals = [
	'eagle',
	'lynx',
	'falcon',
	'deer',
	'owl',
	'fox',
	'rabbit',
	'sparrow',
	'penguin',
	'boar',
	'mule',
	'goat',
	'pug',
	'panther',
	'kite',
	'parrot',
	'marten',
	'bat',
	'crossbill',
	'jackdaw',
	'guppy',
	'cheetah',
	'okapi',
	'mantis',
	'cow',
	'honeybadger',
	'ray',
	'fish',
	'shrimp',
	'cuckoo',
	'scallop',
	'dog',
	'lemur',
	'ostrich',
	'seahorse',
	'myna',
	'cougar',
	'mole',
	'giraffe',
	'thrush',
	'meerkat',
	'dolphin',
	'termite',
	'lamb',
	'robin',
	'mouse',
	'turtle',
	'oryx',
	'hound'
];

const verbs = [
	'endorse',
	'rest',
	'soar',
	'whisper',
	'jump',
	'cook',
	'jest',
	'announce',
	'pause',
	'deny',
	'buy',
	'shrine',
	'cherish',
	'march',
	'lead',
	'climb',
	'zoom',
	'support',
	'view',
	'approve',
	'intend',
	'file',
	'link',
	'drip',
	'enchant',
	'fry',
	'ascend',
	'login',
	'change',
	'describe',
	'scribe',
	'scold',
	'spill',
	'visit',
	'persuade',
	'express',
	'dart',
	'gaze',
	'pat',
	'race',
	'delight',
	'relish',
	'pet',
	'tickle',
	'propel',
	'pout',
	'nurture',
	'clasp',
	'spur',
	'grin',
	'work',
	'succeed',
	'favor',
	'bask',
	'read',
	'emerge',
	'feel',
	'ask',
	'spin',
	'startle',
	'tap'
];

/** Pick a uniformly random element from `list` using a CSPRNG. */
function pick(list) {
	return list[randomInt(list.length)];
}

/** Generate a pattern key not present in `existingKeys`. */
function generateUniqueKey(existingKeys) {
	for (let attempts = 0; attempts < 1000; attempts++) {
		const key = `${pick(adjectives)}_${pick(adjectives)}_${pick(animals)}_${pick(verbs)}`;
		if (!existingKeys.has(key)) return key;
	}
	throw new Error('Failed to generate a unique key after 1000 attempts');
}

const SOURCE_MESSAGES = path.resolve(__dirname, '..', 'src', 'messages', 'en-US', 'orca.json');

function main() {
	const count = Math.max(1, Number.parseInt(process.argv[2], 10) || 1);

	const json = JSON.parse(fs.readFileSync(SOURCE_MESSAGES, 'utf8'));
	const existingKeys = new Set(Object.keys(json)); // includes `$schema`, harmless

	const keys = [];
	for (let i = 0; i < count; i++) {
		const key = generateUniqueKey(existingKeys);
		existingKeys.add(key); // keep keys generated in this run mutually unique
		keys.push(key);
	}

	process.stdout.write(keys.join('\n') + '\n');
}

main();
