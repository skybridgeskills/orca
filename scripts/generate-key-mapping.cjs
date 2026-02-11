const fs = require('fs');

// Word lists for random key generation
const adjectives = [
	'bright', 'calm', 'swift', 'gentle', 'brave', 'steady', 'quiet', 'sharp', 'clear', 'warm',
	'cool', 'bold', 'soft', 'hard', 'quick', 'slow', 'happy', 'sad', 'dark', 'light',
	'grand', 'petty', 'funny', 'serious', 'early', 'late', 'upper', 'lower', 'sparse', 'dense',
	'weary', 'fresh', 'dry', 'wet', 'fluffy', 'smooth', 'piquant', 'vivid', 'nice', 'active',
	'male', 'crazy', 'deft', 'small', 'last', 'sweet', 'plane', 'flat', 'antsy', 'top',
	'patchy', 'dry', 'early', 'stout', 'true', 'sea', 'weird', 'mad', 'merry', 'alert',
	'teary', 'kind', 'ok', 'antsy', 'tidy', 'major', 'legal', 'warm', 'happy', 'watery',
	'arable', 'house', 'next', 'sunny', 'known', 'proof', 'dull', 'merry', 'gray', 'aqua',
	'home', 'equal', 'pink', 'best', 'direct', 'every', 'fancy', 'tired', 'factual', 'elegant',
	'moving', 'wide', 'silly', 'shy', 'curly', 'tiny', 'sleek', 'mellow', 'bad', 'great',
	'lucky', 'red', 'frail', 'cuddly', 'petty', 'dark', 'weary', 'funny', 'sparse', 'each'
];

const animals = [
	'eagle', 'lynx', 'falcon', 'deer', 'owl', 'fox', 'rabbit', 'sparrow', 'penguin', 'boar',
	'mule', 'goat', 'pug', 'panther', 'kite', 'parrot', 'marten', 'bat', 'crossbill', 'jackdaw',
	'guppy', 'cheetah', 'okapi', 'mantis', 'cow', 'honeybadger', 'ray', 'fish', 'shrimp', 'cuckoo',
	'scallop', 'dog', 'lemur', 'ostrich', 'seahorse', 'myna', 'cougar', 'mole', 'giraffe', 'thrush',
	'meerkat', 'dolphin', 'termite', 'lamb', 'robin', 'mouse', 'turtle', 'oryx', 'hound', 'robin',
	'rabbit', 'pug', 'goat', 'guppy', 'crossbill', 'marten', 'bat', 'parrot', 'kite', 'panther'
];

const verbs = [
	'endorse', 'rest', 'soar', 'whisper', 'jump', 'cook', 'jest', 'announce', 'pause', 'deny',
	'buy', 'shrine', 'cherish', 'march', 'lead', 'climb', 'zoom', 'support', 'view', 'approve',
	'intend', 'file', 'link', 'drip', 'enchant', 'fry', 'ascend', 'login', 'change', 'describe',
	'scribe', 'scold', 'spill', 'visit', 'persuade', 'express', 'dart', 'gaze', 'pat', 'race',
	'delight', 'relish', 'pet', 'tickle', 'propel', 'pout', 'nurture', 'clasp', 'spur', 'grin',
	'work', 'succeed', 'favor', 'bask', 'jump', 'buy', 'shrine', 'read', 'fry', 'emerge',
	'feel', 'ask', 'spin', 'startle', 'tap', 'ascend', 'fry', 'drip', 'enchant', 'link',
	'cook', 'file', 'support', 'view', 'approve', 'intend', 'march', 'lead', 'climb', 'zoom'
];

// Simple seeded random for reproducibility
let seed = 42;
function random() {
	seed = (seed * 9301 + 49297) % 233280;
	return seed / 233280;
}

function randomInt(max) {
	return Math.floor(random() * max);
}

function generateRandomKey(existingKeys) {
	let attempts = 0;
	while (attempts < 1000) {
		const adj1 = adjectives[randomInt(adjectives.length)];
		const adj2 = adjectives[randomInt(adjectives.length)];
		const animal = animals[randomInt(animals.length)];
		const verb = verbs[randomInt(verbs.length)];
		const key = `${adj1}_${adj2}_${animal}_${verb}`;
		
		if (!existingKeys.has(key)) {
			return key;
		}
		attempts++;
	}
	throw new Error('Failed to generate unique key after 1000 attempts');
}

// Read existing keys
const json = JSON.parse(fs.readFileSync('src/messages/en-US/orca.json', 'utf8'));
const allKeys = Object.keys(json).filter(k => k !== '$schema');
const pattern = /^[a-z]+_[a-z]+_[a-z]+_[a-z]+$/;
const notMatching = allKeys.filter(k => !pattern.test(k));
const existingKeys = new Set(allKeys);

// Generate mapping
const mapping = {};
for (const oldKey of notMatching) {
	const newKey = generateRandomKey(existingKeys);
	mapping[oldKey] = newKey;
	existingKeys.add(newKey);
}

// Output mapping as JSON (only JSON, no other output)
console.log(JSON.stringify(mapping, null, 2));
