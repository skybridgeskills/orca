const fs = require('fs');
const { execSync } = require('child_process');
const path = require('path');

// Load mapping
const mapping = JSON.parse(fs.readFileSync('/tmp/key-mapping.json', 'utf8'));

// Find all .svelte and .ts files
const files = execSync('find src -type f \\( -name "*.svelte" -o -name "*.ts" \\)', {
	encoding: 'utf8'
})
	.trim()
	.split('\n')
	.filter((f) => f.length > 0);

let totalReplacements = 0;
const filesModified = [];

files.forEach((file) => {
	let content = fs.readFileSync(file, 'utf8');
	let modified = false;
	let fileReplacements = 0;

	Object.entries(mapping).forEach(([oldKey, newKey]) => {
		// Escape special regex characters in oldKey
		const escapedOldKey = oldKey.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

		// Pattern: m.oldKey( or m.oldKey followed by whitespace/newline/end
		// This handles: m.oldKey(), m.oldKey({params}), m.oldKey in template strings
		const patterns = [
			// m.oldKey() - most common
			new RegExp(`m\\.${escapedOldKey}\\(`, 'g'),
			// m.oldKey followed by whitespace or end of line (for template strings)
			new RegExp(`m\\.${escapedOldKey}(\\s|\\n|\\r|$)`, 'g')
		];

		patterns.forEach((pattern) => {
			if (pattern.test(content)) {
				content = content.replace(pattern, (match) => {
					return match.replace(oldKey, newKey);
				});
				modified = true;
				fileReplacements++;
			}
		});
	});

	if (modified) {
		fs.writeFileSync(file, content);
		filesModified.push(file);
		totalReplacements += fileReplacements;
	}
});

console.log(`Modified ${filesModified.length} files`);
console.log(`Total replacements: ${totalReplacements}`);
